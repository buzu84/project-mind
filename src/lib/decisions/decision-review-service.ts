/**
 * Decision Review AI v1 – Service (hardened).
 *
 * Orchestrates: load decision → load project context → retrieve evidence →
 * call OpenAI (with retry) → validate output → save atomically → track usage.
 *
 * Hardening:
 * - Structured output retry on invalid JSON/schema (max 1 retry)
 * - Insert-before-delete save strategy (no data loss on partial failure)
 * - generated_by marker for AI-generated records
 * - Citation ID validation
 * - Evidence quality logging
 */

import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";
import { isRealAI } from "@/lib/ai/is-real-ai";
import { trackAIUsage, extractTokenUsage } from "@/lib/ai/usage-tracking";
import { retrieveEvidence, createEvidenceCitations, formatEvidenceForPrompt } from "@/lib/evidence";
import type { EvidenceCitation } from "@/lib/evidence";
import type { Tables } from "@/lib/supabase/types";
import { decisionReviewOutputSchema, type DecisionReviewOutput } from "./review-schemas";
import { normalizeDecisionReviewOutput, formatZodIssuesForLog, formatZodIssuesForRetry } from "./review-normalize";

const isDev = process.env.NODE_ENV === "development";
const MODEL = "gpt-4o";
const PROMPT_VERSION = "v1.1";
const GENERATED_BY = "decision_review_v1";
const MAX_RETRIES = 1;

// ── Types ───────────────────────────────────────────────────────────

export interface DecisionReviewInput {
  userId: string;
  projectId: string;
  decisionId: string;
}

export interface DecisionReviewResult {
  success: true;
  decisionId: string;
  recommendationId: string;
  optionsCreated: number;
  assumptionsCreated: number;
  evidenceCreated: number;
  citationsCreated: number;
  confidenceScore: number;
  summary: string;
}

type DecisionRow = Pick<Tables<"product_decisions">, "id" | "title" | "category" | "status" | "problem_statement" | "context_summary" | "confidence_score">;

// ── System prompt ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior product strategy assistant performing a structured decision review.

Rules:
- Analyze ONLY the decision and project context provided below.
- Use ONLY the provided evidence. Do NOT invent facts, users, metrics, competitors, or research.
- If evidence is weak or missing, explicitly state this and lower your confidence score.
- Clearly separate facts from assumptions.
- Generate 3–4 practical decision options with explicit trade-offs.
- Every major claim should reference available citation IDs (e.g. [1], [2]) where possible.
- Only use citation IDs that are listed in the "Available citation IDs" section. Do not invent citation IDs.
- Confidence scores (0–100) should reflect the quality and quantity of available evidence.
- Prefer structured, concise, actionable output.
- Respond with valid JSON only. No markdown, no code fences.`;

// ── Main function ───────────────────────────────────────────────────

export async function analyzeDecision(
  input: DecisionReviewInput,
): Promise<DecisionReviewResult> {
  const { userId, projectId, decisionId } = input;
  const startTime = Date.now();
  const supabase = createClient();

  const log = (phase: string, detail?: Record<string, unknown>) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(`[decision-review] ${phase}`, detail ? JSON.stringify(detail) : "");
    }
  };

  log("Phase 1: Auth", { userId: userId.slice(0, 8) + "…" });

  // 1. Verify project ownership
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("id, name, description, target_users, market, business_model, goals")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();
  if (projErr || !project) {
    log("Phase 1 FAILED", { error: projErr?.message ?? "no data" });
    throw new Error("Project not found or access denied.");
  }
  log("Phase 2: Project loaded", { name: project.name });

  // 2. Load decision (with ownership check)
  const { data: decision, error: decErr } = await supabase
    .from("product_decisions")
    .select("id, title, category, status, problem_statement, context_summary, confidence_score")
    .eq("id", decisionId)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .single();
  if (decErr || !decision) {
    log("Phase 3 FAILED: Decision load", { error: decErr?.message ?? "no data", decisionId });
    throw new Error("Decision not found or access denied.");
  }
  const dec = decision;
  log("Phase 3: Decision loaded", { title: dec.title });

  // 3. Load structured project context (optional)
  const { data: ctx } = await supabase
    .from("project_context")
    .select("product_overview, target_personas, current_metrics, pain_points, competitors, strategic_goals, constraints, open_questions")
    .eq("project_id", projectId)
    .maybeSingle();
  log("Phase 4: Context loaded", { hasContext: !!ctx });

  // 4. Retrieve evidence via Evidence Layer
  const evidenceQuery = [dec.title, dec.problem_statement, dec.context_summary]
    .filter(Boolean)
    .join(" ");

  const evidenceResult = await retrieveEvidence({
    userId,
    projectId,
    intent: "decision_review",
    query: evidenceQuery,
  });

  const citations: EvidenceCitation[] = createEvidenceCitations(evidenceResult.candidates);
  const evidenceBlock = formatEvidenceForPrompt(evidenceResult.candidates);
  const hasRelevantEvidence = evidenceResult.candidates.length > 0;

  log("Phase 5: Evidence retrieved", {
    retrieved: evidenceResult.total,
    used: evidenceResult.candidates.length,
    hasRelevantEvidence,
  });

  // 5. Build user prompt
  const validCitationIds = new Set(citations.map((c) => c.citationId));
  const userPrompt = buildUserPrompt(dec, project, ctx, evidenceBlock, hasRelevantEvidence, citations);

  // 6. Call AI (with retry)
  const isReal = isRealAI();
  let aiOutput: DecisionReviewOutput;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let retryCount = 0;

  if (!isReal) {
    aiOutput = buildMockOutput(dec, hasRelevantEvidence);
    log("Phase 6: Mock AI output generated");
  } else {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("AI is not configured. Set OPENAI_API_KEY or use USE_REAL_AI=false.");
    }

    log("Phase 6: Calling OpenAI");
    const result = await callOpenAIWithRetry(userPrompt);
    aiOutput = result.output;
    totalPromptTokens = result.totalPromptTokens;
    totalCompletionTokens = result.totalCompletionTokens;
    retryCount = result.retryCount;
    log("Phase 7: OpenAI + Zod passed", {
      options: aiOutput.options.length,
      assumptions: aiOutput.assumptions.length,
      confidence: aiOutput.recommendation.confidenceScore,
      retryCount,
    });
  }

  // 7. Sanitize citation IDs in output
  aiOutput = sanitizeCitationIds(aiOutput, validCitationIds);

  // 8. Save to database (insert-before-delete strategy)
  log("Phase 8: Saving to database", { citationsCount: citations.length });
  const result = await saveAnalysisResults(supabase, {
    userId,
    projectId,
    decisionId,
    aiOutput,
    citations,
  });

  // 9. Update decision confidence score
  log("Phase 9: DB save completed", {
    recommendationId: result.recommendationId,
    optionsCreated: result.optionsCreated,
    assumptionsCreated: result.assumptionsCreated,
    evidenceCreated: result.evidenceCreated,
  });
  await supabase
    .from("product_decisions")
    .update({
      confidence_score: Math.round(aiOutput.recommendation.confidenceScore),
      updated_at: new Date().toISOString(),
    })
    .eq("id", decisionId)
    .eq("user_id", userId);

  // 10. Track usage
  void trackAIUsage({
    userId,
    projectId,
    model: isReal ? MODEL : "mock",
    feature: "decision_review",
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    isMock: !isReal,
    latencyMs: Date.now() - startTime,
    metadata: {
      decisionId,
      evidenceCount: evidenceResult.candidates.length,
      optionsCount: aiOutput.options.length,
      assumptionsCount: aiOutput.assumptions.length,
      confidenceScore: aiOutput.recommendation.confidenceScore,
      hasRelevantEvidence,
      promptVersion: PROMPT_VERSION,
      retryCount,
    },
  });

  return {
    success: true,
    decisionId,
    recommendationId: result.recommendationId,
    optionsCreated: result.optionsCreated,
    assumptionsCreated: result.assumptionsCreated,
    evidenceCreated: result.evidenceCreated,
    citationsCreated: citations.length,
    confidenceScore: aiOutput.recommendation.confidenceScore,
    summary: aiOutput.summary,
  };
}

// ── OpenAI call with retry ──────────────────────────────────────────

async function callOpenAIWithRetry(
  userPrompt: string,
): Promise<{
  output: DecisionReviewOutput;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  retryCount: number;
}> {
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const messages: { role: "system" | "user"; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ];

    // On retry, add correction prompt
    if (attempt > 0 && lastError) {
      messages.push({
        role: "user",
        content: `Your previous response had validation errors:\n${lastError}\n\nCritical rules:\n- ALL property names must be camelCase: confidenceScore, riskLevel, evidenceStatus, validationMethod, supportingCitationIds, expectedImpact, effortEstimate, supportingEvidence, nextValidationSteps\n- confidenceScore must be a number (not string), range 0-100\n- options array must have exactly 3 or 4 items\n- assumptions array must have at least 1 item\n- risks array must have at least 1 item\n- pros and cons arrays must each have at least 1 item\n- assumption.type MUST be exactly one of: market, user, technical, growth, pricing, ux, business, other. Do NOT use legal, compliance, operational, financial, engineering, adoption, customer, usability, or any other value.\n- Return valid JSON only. No markdown, no code fences, no extra text.`,
      });
    }

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: attempt === 0 ? 0.5 : 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const usage = extractTokenUsage(response);
    totalPromptTokens += usage.promptTokens;
    totalCompletionTokens += usage.completionTokens;

    const rawContent = response.choices[0]?.message?.content ?? "";

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      lastError = "Response was not valid JSON.";
      if (isDev) console.error(`[decision-review] Attempt ${attempt + 1}: Invalid JSON`);
      if (attempt >= MAX_RETRIES) {
        throw new Error("AI returned invalid JSON after retry. Please try again.");
      }
      continue;
    }

    // Normalize common AI output variations (snake_case → camelCase, string numbers → numbers, etc.)
    if (parsed && typeof parsed === "object") {
      parsed = normalizeDecisionReviewOutput(parsed as Record<string, unknown>);
    }

    const validated = decisionReviewOutputSchema.safeParse(parsed);
    if (!validated.success) {
      const issuesForRetry = formatZodIssuesForRetry(validated.error);
      lastError = issuesForRetry || "Schema validation failed.";
      if (isDev) {
        // eslint-disable-next-line no-console
        console.error(`[decision-review] Attempt ${attempt + 1}: Zod validation failed:`);
        for (const line of formatZodIssuesForLog(validated.error)) {
          // eslint-disable-next-line no-console
          console.error(`  ${line}`);
        }
      }
      if (attempt >= MAX_RETRIES) {
        const devDetail = isDev ? ` Validation: ${issuesForRetry}` : "";
        throw new Error(`AI response did not match expected format after retry. Please try again.${devDetail}`);
      }
      continue;
    }

    return {
      output: validated.data,
      totalPromptTokens,
      totalCompletionTokens,
      retryCount: attempt,
    };
  }

  throw new Error("AI analysis failed. Please try again.");
}

// ── Citation sanitization ───────────────────────────────────────────

function sanitizeCitationIds(
  output: DecisionReviewOutput,
  validIds: Set<string>,
): DecisionReviewOutput {
  const filter = (ids?: string[]) => ids?.filter((id) => validIds.has(id));

  return {
    ...output,
    assumptions: output.assumptions.map((a) => ({
      ...a,
      supportingCitationIds: filter(a.supportingCitationIds),
    })),
    options: output.options.map((o) => ({
      ...o,
      supportingCitationIds: filter(o.supportingCitationIds),
    })),
    risks: output.risks.map((r) => ({
      ...r,
      supportingCitationIds: filter(r.supportingCitationIds),
    })),
  };
}

// ── Prompt builder ──────────────────────────────────────────────────

function buildUserPrompt(
  dec: DecisionRow,
  project: Record<string, unknown>,
  ctx: Record<string, unknown> | null,
  evidenceBlock: string,
  hasRelevantEvidence: boolean,
  citations: EvidenceCitation[],
): string {
  const parts: string[] = [];

  parts.push("## Decision Under Review");
  parts.push(`Title: ${dec.title}`);
  parts.push(`Category: ${dec.category}`);
  parts.push(`Status: ${dec.status}`);
  if (dec.problem_statement) parts.push(`Problem Statement: ${dec.problem_statement}`);
  if (dec.context_summary) parts.push(`Context: ${dec.context_summary}`);

  parts.push("\n## Project Context");
  parts.push(`Project: ${project.name}`);
  if (project.description) parts.push(`Description: ${project.description}`);
  if (project.target_users) parts.push(`Target Users: ${project.target_users}`);
  if (project.market) parts.push(`Market: ${project.market}`);
  if (project.business_model) parts.push(`Business Model: ${project.business_model}`);
  if (project.goals) parts.push(`Goals: ${project.goals}`);

  if (ctx) {
    const fields: [string, string][] = [
      ["product_overview", "Product Overview"],
      ["target_personas", "Target Personas"],
      ["current_metrics", "Current Metrics"],
      ["pain_points", "Pain Points"],
      ["competitors", "Competitors"],
      ["strategic_goals", "Strategic Goals"],
      ["constraints", "Constraints"],
      ["open_questions", "Open Questions"],
    ];
    const filled = fields.filter(([k]) => ctx[k]);
    if (filled.length > 0) {
      parts.push("\n## Detailed Project Context");
      for (const [k, label] of filled) {
        parts.push(`${label}: ${ctx[k]}`);
      }
    }
  }

  if (hasRelevantEvidence) {
    parts.push(evidenceBlock);
    parts.push(`\nAvailable citation IDs: ${citations.map((c) => c.citationId).join(", ")}`);
    parts.push("Only use the citation IDs listed above. Do not invent new citation IDs.");
  } else {
    parts.push("\n## Evidence");
    parts.push("No relevant evidence was retrieved from project data. Lower your confidence scores accordingly and explicitly note that evidence is limited.");
  }

  parts.push("\n## Output Instructions");
  parts.push("Return a single JSON object with this exact shape. ALL property names MUST be camelCase (e.g. confidenceScore, not confidence_score):");
  parts.push(`{
  "summary": "string (concise analysis summary, min 10 chars)",
  "confidenceScore": 55,
  "assumptions": [{ "statement": "string (min 5 chars)", "type": "market|user|technical|growth|pricing|ux|business|other", "riskLevel": "low|medium|high", "evidenceStatus": "unsupported|weak|moderate|strong", "validationMethod": "optional string", "supportingCitationIds": ["[1]"] }],
  "options": [{ "title": "string", "description": "string", "pros": ["at least one"], "cons": ["at least one"], "risks": ["string"], "expectedImpact": "optional string", "effortEstimate": "low|medium|high|unknown", "reversibility": "low|medium|high|unknown", "confidenceScore": 50, "supportingCitationIds": ["[1]"] }],
  "risks": [{ "title": "string", "description": "string", "severity": "low|medium|high", "mitigation": "optional string", "supportingCitationIds": ["[1]"] }],
  "recommendation": { "recommendation": "string (min 10 chars)", "reasoning": ["at least one"], "supportingEvidence": ["string"], "assumptions": ["string"], "risks": ["string"], "alternatives": ["string"], "nextValidationSteps": ["string"], "confidenceScore": 55 }
}`);
  parts.push("Rules: exactly 3-4 options, at least 1 assumption, at least 1 risk. All confidenceScore values must be numbers (not strings). All property names must be camelCase.");
  parts.push("\nCRITICAL — assumption.type MUST be exactly one of: market, user, technical, growth, pricing, ux, business, other");
  parts.push("Do NOT use: legal, compliance, operational, product, strategy, risk, financial, regulatory, revenue, engineering, adoption, customer, usability, design, security, infrastructure, execution, process.");
  parts.push("If the assumption is about legal/compliance/regulatory topics, use \"business\". If about finances/revenue, use \"pricing\". If about engineering/architecture, use \"technical\". If about adoption/retention, use \"growth\". If about usability/design, use \"ux\". If about customers/personas, use \"user\".");

  return parts.join("\n");
}

// ── Mock output ─────────────────────────────────────────────────────

function buildMockOutput(dec: DecisionRow, hasEvidence: boolean): DecisionReviewOutput {
  const confidence = hasEvidence ? 65 : 35;
  return {
    summary: `Analysis of "${dec.title}": This decision involves trade-offs between speed, quality, and resource allocation. ${hasEvidence ? "Some supporting evidence was found." : "Limited evidence is available — confidence is lower."}`,
    confidenceScore: confidence,
    assumptions: [
      { statement: "The target user segment will adopt the proposed change.", type: "user", riskLevel: "medium", evidenceStatus: hasEvidence ? "weak" : "unsupported", validationMethod: "User interviews with 5-10 target users" },
      { statement: "Technical implementation is feasible within current architecture.", type: "technical", riskLevel: "low", evidenceStatus: "unsupported", validationMethod: "Technical spike / proof of concept" },
      { statement: "Market conditions will remain stable during rollout.", type: "market", riskLevel: "high", evidenceStatus: "unsupported" },
    ],
    options: [
      { title: "Full implementation", description: "Implement the full scope as described.", pros: ["Maximum impact", "Complete solution"], cons: ["Higher cost", "Longer timeline"], risks: ["Resource overcommitment"], effortEstimate: "high", reversibility: "low", confidenceScore: confidence - 10 },
      { title: "Phased rollout", description: "Implement in 2-3 phases, validating at each stage.", pros: ["Lower risk", "Early feedback"], cons: ["Slower time to full value", "Coordination overhead"], risks: ["Scope creep between phases"], effortEstimate: "medium", reversibility: "medium", confidenceScore: confidence },
      { title: "Minimum viable approach", description: "Build the smallest version that tests the core hypothesis.", pros: ["Fast to market", "Low resource cost"], cons: ["May not fully address the problem", "Could feel incomplete"], risks: ["Users may not see value in limited version"], effortEstimate: "low", reversibility: "high", confidenceScore: confidence - 5 },
    ],
    risks: [
      { title: "Insufficient user validation", description: "Decision may be based on assumptions rather than evidence.", severity: "high", mitigation: "Conduct rapid user research before committing." },
      { title: "Resource competition", description: "Other priorities may reduce available engineering capacity.", severity: "medium", mitigation: "Secure resource commitment from leadership." },
    ],
    recommendation: {
      recommendation: `Recommend a phased rollout approach for "${dec.title}" to balance risk and learning.`,
      reasoning: ["Allows early validation of assumptions", "Reduces sunk cost if direction changes", "Enables course correction based on real data"],
      supportingEvidence: hasEvidence ? ["Some relevant feedback was found in project data"] : ["No strong evidence available — rely on stakeholder judgment"],
      assumptions: ["Target users will engage with the phased approach", "Team can deliver phase 1 within expected timeline"],
      risks: ["Phased approach may lose momentum", "Early phases may not represent full value"],
      alternatives: ["Full implementation if confidence increases", "Delay decision pending more research"],
      nextValidationSteps: ["Conduct 5 user interviews", "Build lightweight prototype", "Define success metrics for phase 1"],
      confidenceScore: confidence,
    },
  };
}

// ── Save results (insert-before-delete) ─────────────────────────────

async function saveAnalysisResults(
  supabase: ReturnType<typeof createClient>,
  params: {
    userId: string;
    projectId: string;
    decisionId: string;
    aiOutput: DecisionReviewOutput;
    citations: EvidenceCitation[];
  },
): Promise<{ recommendationId: string; optionsCreated: number; assumptionsCreated: number; evidenceCreated: number }> {
  const { userId, projectId, decisionId, aiOutput, citations } = params;

  // ── Phase 1: Insert all new records first ──────────────────────

  let evidenceCreated = 0;
  const evidenceIds: string[] = [];
  for (const citation of citations) {
    const { data, error } = await supabase
      .from("product_evidence")
      .insert({
        user_id: userId,
        project_id: projectId,
        source_type: citation.sourceType === "unknown" ? "feedback" : citation.sourceType,
        source_id: citation.sourceId ?? null,
        title: citation.sourceTitle ?? "Retrieved evidence",
        claim: citation.snippet,
        content: citation.snippet,
        relevance_score: citation.similarityScore,
        generated_by: GENERATED_BY,
      })
      .select("id")
      .single();
    if (error) {
      if (isDev) console.error("[decision-review] Evidence insert failed:", error.message, error.details);
      continue;
    }
    if (data) {
      evidenceIds.push(data.id);
      evidenceCreated++;
    }
  }

  const newLinkIds: string[] = [];
  for (const evidenceId of evidenceIds) {
    const { data } = await supabase.from("product_decision_evidence_links").insert({
      user_id: userId,
      project_id: projectId,
      decision_id: decisionId,
      evidence_id: evidenceId,
      link_type: "informs",
    }).select("id").single();
    if (data) newLinkIds.push(data.id);
  }

  let assumptionsCreated = 0;
  const newAssumptionIds: string[] = [];
  for (const assumption of aiOutput.assumptions) {
    const { data, error } = await supabase.from("product_assumptions").insert({
      user_id: userId,
      project_id: projectId,
      decision_id: decisionId,
      assumption_type: assumption.type,
      type: assumption.type,
      statement: assumption.statement,
      risk_level: assumption.riskLevel,
      status: assumption.evidenceStatus ?? "untested",
      evidence_status: assumption.evidenceStatus,
      validation_method: assumption.validationMethod ?? null,
      generated_by: GENERATED_BY,
    }).select("id").single();
    if (!error && data) {
      assumptionsCreated++;
      newAssumptionIds.push(data.id);
    }
  }

  let optionsCreated = 0;
  const newOptionIds: string[] = [];
  for (const option of aiOutput.options) {
    const { data, error } = await supabase.from("product_decision_options").insert({
      user_id: userId,
      project_id: projectId,
      decision_id: decisionId,
      title: option.title,
      description: option.description,
      pros: option.pros,
      cons: option.cons,
      risks: option.risks,
      expected_impact: option.expectedImpact ?? null,
      effort_estimate: option.effortEstimate,
      reversibility: option.reversibility,
      confidence_score: option.confidenceScore,
      generated_by: GENERATED_BY,
    }).select("id").single();
    if (!error && data) {
      optionsCreated++;
      newOptionIds.push(data.id);
    }
  }

  const { data: recData, error: recError } = await supabase
    .from("product_decision_recommendations")
    .insert({
      user_id: userId,
      project_id: projectId,
      decision_id: decisionId,
      // Original schema columns
      summary: aiOutput.recommendation.recommendation,
      reasoning: Array.isArray(aiOutput.recommendation.reasoning)
        ? aiOutput.recommendation.reasoning.join("\n")
        : String(aiOutput.recommendation.reasoning ?? ""),
      // Extended columns (added by alignment migration)
      // NOTE: We write to next_validation_steps (alignment migration column).
      // The original next_steps column from 20260504_decision_engine.sql is
      // unused/dead for Decision Review — it was superseded by
      // next_validation_steps in 20260520_decision_review_schema_alignment.sql.
      // A future cleanup migration can drop next_steps if no other feature uses it.
      recommendation: aiOutput.recommendation.recommendation,
      supporting_evidence: aiOutput.recommendation.supportingEvidence,
      assumptions: aiOutput.recommendation.assumptions,
      risks: aiOutput.recommendation.risks,
      alternatives: aiOutput.recommendation.alternatives,
      next_validation_steps: aiOutput.recommendation.nextValidationSteps,
      confidence_score: aiOutput.recommendation.confidenceScore,
      generated_by: GENERATED_BY,
    })
    .select("id")
    .single();

  if (recError || !recData) {
    if (isDev) console.error("[decision-review] Recommendation insert failed:", recError?.message);
    await cleanupIds(supabase, userId, [...evidenceIds, ...newLinkIds, ...newAssumptionIds, ...newOptionIds],
      ["product_evidence", "product_decision_evidence_links", "product_assumptions", "product_decision_options"]);
    throw new Error(`Failed to save recommendation: ${recError?.message ?? "unknown error"}`);
  }

  // ── Phase 2: Delete old records (new ones are safe) ────────────
  const newIds = new Set([...evidenceIds, ...newLinkIds, ...newAssumptionIds, ...newOptionIds, recData.id]);

  await deleteOldRecords(supabase, userId, decisionId, projectId, newIds);

  return { recommendationId: recData.id, optionsCreated, assumptionsCreated, evidenceCreated };
}

async function deleteOldRecords(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  decisionId: string,
  projectId: string,
  newIds: Set<string>,
): Promise<void> {
  // ┌─────────────────────────────────────────────────────────────────────────┐
  // │ FUTURE WARNING — EDITABLE / MANUAL OUTPUTS                            │
  // │                                                                        │
  // │ This cleanup currently deletes rows where generated_by IS NULL.        │
  // │ This is ONLY safe because no manual creation UI exists yet — all       │
  // │ null rows are legacy AI-generated records from before generated_by     │
  // │ was added.                                                             │
  // │                                                                        │
  // │ BEFORE shipping manual/editable outputs:                               │
  // │ 1. New manual rows MUST set generated_by = "manual" (not null).        │
  // │ 2. Change filters below to ONLY delete generated_by = GENERATED_BY.   │
  // │ 3. Remove the `|| r.generated_by === null` fallback.                  │
  // │ 4. Consider a versioning/history strategy so re-analyze doesn't       │
  // │    silently replace user-edited content.                               │
  // │ 5. Consider a confirmation prompt: "Re-analyzing will replace the     │
  // │    current AI-generated analysis. Your manual edits will be lost."     │
  // └─────────────────────────────────────────────────────────────────────────┘

  // Delete old recommendations (AI-generated, including legacy rows without generated_by
  // that were created before the generated_by column was added)
  const { data: oldRecs } = await supabase.from("product_decision_recommendations")
    .select("id, generated_by").eq("decision_id", decisionId).eq("user_id", userId);
  for (const r of (oldRecs ?? []).filter((r: any) => !newIds.has(r.id) && (r.generated_by === GENERATED_BY || r.generated_by === null))) {
    await supabase.from("product_decision_recommendations").delete().eq("id", r.id).eq("user_id", userId);
  }

  // Delete old options (AI-generated or legacy null generated_by)
  // When manual option creation is added, change null filter to only GENERATED_BY
  const { data: oldOpts } = await supabase.from("product_decision_options")
    .select("id, generated_by").eq("decision_id", decisionId).eq("user_id", userId);
  for (const o of (oldOpts ?? []).filter((o: any) => !newIds.has(o.id) && (o.generated_by === GENERATED_BY || o.generated_by === null))) {
    await supabase.from("product_decision_options").delete().eq("id", o.id).eq("user_id", userId);
  }

  // Delete old assumptions (AI-generated or legacy null generated_by)
  // When manual assumption creation is added, change null filter to only GENERATED_BY
  const { data: oldAssumptions } = await supabase.from("product_assumptions")
    .select("id, generated_by").eq("decision_id", decisionId).eq("user_id", userId);
  for (const a of (oldAssumptions ?? []).filter((a: any) => !newIds.has(a.id) && (a.generated_by === GENERATED_BY || a.generated_by === null))) {
    await supabase.from("product_assumptions").delete().eq("id", a.id).eq("user_id", userId);
  }

  // Delete old evidence links (only those pointing to AI-generated evidence)
  // Keep links to non-AI evidence intact
  const { data: oldLinks } = await supabase.from("product_decision_evidence_links")
    .select("id, evidence_id").eq("decision_id", decisionId).eq("user_id", userId);
  for (const l of (oldLinks ?? []).filter((l: any) => !newIds.has(l.id))) {
    // Only delete if the linked evidence is AI-generated
    const { data: ev } = await supabase.from("product_evidence")
      .select("generated_by").eq("id", l.evidence_id).single();
    if (ev?.generated_by === GENERATED_BY) {
      await supabase.from("product_decision_evidence_links").delete().eq("id", l.id).eq("user_id", userId);
    }
  }

  // Delete orphaned AI-generated evidence (only for this decision's old evidence)
  const { data: oldEvidence } = await supabase.from("product_evidence")
    .select("id").eq("generated_by", GENERATED_BY).eq("user_id", userId).eq("project_id", projectId);
  for (const e of (oldEvidence ?? []).filter((e: { id: string }) => !newIds.has(e.id))) {
    const { data: links } = await supabase.from("product_decision_evidence_links")
      .select("id").eq("evidence_id", e.id).limit(1);
    if (!links || links.length === 0) {
      await supabase.from("product_evidence").delete().eq("id", e.id).eq("user_id", userId);
    }
  }
}

async function cleanupIds(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  ids: string[],
  tables: string[],
): Promise<void> {
  try {
    for (const id of ids) {
      for (const table of tables) {
        await supabase.from(table).delete().eq("id", id).eq("user_id", userId);
      }
    }
  } catch {
    if (isDev) console.error("[decision-review] Cleanup failed — orphaned records may exist");
  }
}

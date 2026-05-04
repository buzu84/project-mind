/**
 * Decision Engine – Service layer.
 *
 * Every function requires userId + projectId and verifies ownership
 * at the service level (defense-in-depth, not relying solely on RLS).
 *
 * Uses `product_*` table names to avoid collision with the legacy `decisions` table.
 * Database column names use snake_case to match Supabase/Postgres.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  CreateDecisionInput,
  UpdateDecisionInput,
  CreateDecisionOptionInput,
  UpdateDecisionOptionInput,
  CreateAssumptionInput,
  UpdateAssumptionInput,
  CreateEvidenceInput,
  UpdateEvidenceInput,
  CreateDecisionEvidenceLinkInput,
  CreateDecisionAgentReviewInput,
  CreateDecisionRecommendationInput,
} from "./schemas";

// ── Helpers ─────────────────────────────────────────────────────────

interface OwnerScope {
  userId: string;
  projectId: string;
}

/** Verify the project belongs to the user. Throws if not. */
async function verifyProjectOwnership({ userId, projectId }: OwnerScope): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Project not found or access denied.");
  }
}

/** Verify a decision belongs to the user + project. Returns the row. */
async function verifyDecisionOwnership(
  scope: OwnerScope,
  decisionId: string,
): Promise<{ id: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_decisions")
    .select("id")
    .eq("id", decisionId)
    .eq("user_id", scope.userId)
    .eq("project_id", scope.projectId)
    .single();

  if (error || !data) {
    throw new Error("Decision not found or access denied.");
  }
  return data;
}

type ServiceResult<T> = { data: T; error: null } | { data: null; error: string };

function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

function fail<T>(msg: string): ServiceResult<T> {
  return { data: null, error: msg };
}

// ═══════════════════════════════════════════════════════════════════
// DECISIONS
// ═══════════════════════════════════════════════════════════════════

export async function createDecision(
  scope: OwnerScope,
  input: CreateDecisionInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    await verifyProjectOwnership(scope);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_decisions")
      .insert({
        user_id: scope.userId,
        project_id: scope.projectId,
        ...input,
      })
      .select("id")
      .single();

    if (error) return fail("Could not create decision.");
    return ok(data);
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : "Could not create decision.");
  }
}

export async function getDecisionById(
  scope: OwnerScope,
  decisionId: string,
): Promise<ServiceResult<Record<string, unknown>>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_decisions")
      .select("*")
      .eq("id", decisionId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .single();

    if (error || !data) return fail("Decision not found.");
    return ok(data);
  } catch {
    return fail("Could not fetch decision.");
  }
}

export async function listDecisionsByProject(
  scope: OwnerScope,
): Promise<ServiceResult<Record<string, unknown>[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_decisions")
      .select("*")
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .order("updated_at", { ascending: false });

    if (error) return fail("Could not list decisions.");
    return ok(data ?? []);
  } catch {
    return fail("Could not list decisions.");
  }
}

export async function updateDecision(
  scope: OwnerScope,
  decisionId: string,
  input: UpdateDecisionInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    await verifyDecisionOwnership(scope, decisionId);

    // If selecting an option, verify it belongs to this decision
    if (input.selected_option_id) {
      const supabase = createClient();
      const { data: opt } = await supabase
        .from("product_decision_options")
        .select("id")
        .eq("id", input.selected_option_id)
        .eq("decision_id", decisionId)
        .eq("user_id", scope.userId)
        .single();
      if (!opt) return fail("Selected option does not belong to this decision.");
    }

    const supabase = createClient();
    const { error } = await supabase
      .from("product_decisions")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", decisionId)
      .eq("user_id", scope.userId);

    if (error) return fail("Could not update decision.");
    return ok({ id: decisionId });
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : "Could not update decision.");
  }
}

export async function deleteDecision(
  scope: OwnerScope,
  decisionId: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    await verifyDecisionOwnership(scope, decisionId);
    const supabase = createClient();
    const { error } = await supabase
      .from("product_decisions")
      .delete()
      .eq("id", decisionId)
      .eq("user_id", scope.userId);

    if (error) return fail("Could not delete decision.");
    return ok({ id: decisionId });
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : "Could not delete decision.");
  }
}

// ═══════════════════════════════════════════════════════════════════
// DECISION OPTIONS
// ═══════════════════════════════════════════════════════════════════

export async function createDecisionOption(
  scope: OwnerScope,
  input: CreateDecisionOptionInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    await verifyDecisionOwnership(scope, input.decision_id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_decision_options")
      .insert({
        user_id: scope.userId,
        project_id: scope.projectId,
        ...input,
      })
      .select("id")
      .single();

    if (error) return fail("Could not create option.");
    return ok(data);
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : "Could not create option.");
  }
}

export async function listOptionsByDecision(
  scope: OwnerScope,
  decisionId: string,
): Promise<ServiceResult<Record<string, unknown>[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_decision_options")
      .select("*")
      .eq("decision_id", decisionId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .order("created_at", { ascending: true });

    if (error) return fail("Could not list options.");
    return ok(data ?? []);
  } catch {
    return fail("Could not list options.");
  }
}

export async function updateDecisionOption(
  scope: OwnerScope,
  optionId: string,
  input: UpdateDecisionOptionInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("product_decision_options")
      .select("id")
      .eq("id", optionId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .single();
    if (!existing) return fail("Option not found or access denied.");

    const { error } = await supabase
      .from("product_decision_options")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", optionId)
      .eq("user_id", scope.userId);

    if (error) return fail("Could not update option.");
    return ok({ id: optionId });
  } catch {
    return fail("Could not update option.");
  }
}

export async function deleteDecisionOption(
  scope: OwnerScope,
  optionId: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("product_decision_options")
      .delete()
      .eq("id", optionId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId);

    if (error) return fail("Could not delete option.");
    return ok({ id: optionId });
  } catch {
    return fail("Could not delete option.");
  }
}

// ═══════════════════════════════════════════════════════════════════
// ASSUMPTIONS
// ═══════════════════════════════════════════════════════════════════

export async function createAssumption(
  scope: OwnerScope,
  input: CreateAssumptionInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    if (input.decision_id) {
      await verifyDecisionOwnership(scope, input.decision_id);
    } else {
      await verifyProjectOwnership(scope);
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_assumptions")
      .insert({
        user_id: scope.userId,
        project_id: scope.projectId,
        ...input,
      })
      .select("id")
      .single();

    if (error) return fail("Could not create assumption.");
    return ok(data);
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : "Could not create assumption.");
  }
}

export async function listAssumptionsByProject(
  scope: OwnerScope,
  decisionId?: string,
): Promise<ServiceResult<Record<string, unknown>[]>> {
  try {
    const supabase = createClient();
    let query = supabase
      .from("product_assumptions")
      .select("*")
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId);

    if (decisionId) {
      query = query.eq("decision_id", decisionId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return fail("Could not list assumptions.");
    return ok(data ?? []);
  } catch {
    return fail("Could not list assumptions.");
  }
}

export async function updateAssumption(
  scope: OwnerScope,
  assumptionId: string,
  input: UpdateAssumptionInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("product_assumptions")
      .select("id")
      .eq("id", assumptionId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .single();
    if (!existing) return fail("Assumption not found or access denied.");

    const { error } = await supabase
      .from("product_assumptions")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", assumptionId)
      .eq("user_id", scope.userId);

    if (error) return fail("Could not update assumption.");
    return ok({ id: assumptionId });
  } catch {
    return fail("Could not update assumption.");
  }
}

export async function deleteAssumption(
  scope: OwnerScope,
  assumptionId: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("product_assumptions")
      .delete()
      .eq("id", assumptionId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId);

    if (error) return fail("Could not delete assumption.");
    return ok({ id: assumptionId });
  } catch {
    return fail("Could not delete assumption.");
  }
}

// ═══════════════════════════════════════════════════════════════════
// EVIDENCE
// ═══════════════════════════════════════════════════════════════════

export async function createEvidence(
  scope: OwnerScope,
  input: CreateEvidenceInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    await verifyProjectOwnership(scope);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_evidence")
      .insert({
        user_id: scope.userId,
        project_id: scope.projectId,
        ...input,
      })
      .select("id")
      .single();

    if (error) return fail("Could not create evidence.");
    return ok(data);
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : "Could not create evidence.");
  }
}

export async function listEvidenceByProject(
  scope: OwnerScope,
): Promise<ServiceResult<Record<string, unknown>[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_evidence")
      .select("*")
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .order("created_at", { ascending: false });

    if (error) return fail("Could not list evidence.");
    return ok(data ?? []);
  } catch {
    return fail("Could not list evidence.");
  }
}

export async function getEvidenceById(
  scope: OwnerScope,
  evidenceId: string,
): Promise<ServiceResult<Record<string, unknown>>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_evidence")
      .select("*")
      .eq("id", evidenceId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .single();

    if (error || !data) return fail("Evidence not found.");
    return ok(data);
  } catch {
    return fail("Could not fetch evidence.");
  }
}

export async function updateEvidence(
  scope: OwnerScope,
  evidenceId: string,
  input: UpdateEvidenceInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("product_evidence")
      .select("id")
      .eq("id", evidenceId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .single();
    if (!existing) return fail("Evidence not found or access denied.");

    const { error } = await supabase
      .from("product_evidence")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", evidenceId)
      .eq("user_id", scope.userId);

    if (error) return fail("Could not update evidence.");
    return ok({ id: evidenceId });
  } catch {
    return fail("Could not update evidence.");
  }
}

export async function deleteEvidence(
  scope: OwnerScope,
  evidenceId: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("product_evidence")
      .delete()
      .eq("id", evidenceId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId);

    if (error) return fail("Could not delete evidence.");
    return ok({ id: evidenceId });
  } catch {
    return fail("Could not delete evidence.");
  }
}

// ═══════════════════════════════════════════════════════════════════
// DECISION–EVIDENCE LINKS
// ═══════════════════════════════════════════════════════════════════

export async function createDecisionEvidenceLink(
  scope: OwnerScope,
  input: CreateDecisionEvidenceLinkInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    // Verify both decision and evidence belong to user + project
    await verifyDecisionOwnership(scope, input.decision_id);

    const supabase = createClient();
    const { data: ev } = await supabase
      .from("product_evidence")
      .select("id")
      .eq("id", input.evidence_id)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .single();
    if (!ev) return fail("Evidence not found or belongs to a different project.");

    const { data, error } = await supabase
      .from("product_decision_evidence_links")
      .insert({
        user_id: scope.userId,
        project_id: scope.projectId,
        ...input,
      })
      .select("id")
      .single();

    if (error) return fail("Could not link evidence to decision.");
    return ok(data);
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : "Could not link evidence.");
  }
}

export async function listLinksByDecision(
  scope: OwnerScope,
  decisionId: string,
): Promise<ServiceResult<Record<string, unknown>[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_decision_evidence_links")
      .select("*")
      .eq("decision_id", decisionId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .order("created_at", { ascending: false });

    if (error) return fail("Could not list evidence links.");
    return ok(data ?? []);
  } catch {
    return fail("Could not list evidence links.");
  }
}

export async function deleteDecisionEvidenceLink(
  scope: OwnerScope,
  linkId: string,
): Promise<ServiceResult<{ id: string }>> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("product_decision_evidence_links")
      .delete()
      .eq("id", linkId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId);

    if (error) return fail("Could not delete link.");
    return ok({ id: linkId });
  } catch {
    return fail("Could not delete link.");
  }
}

// ═══════════════════════════════════════════════════════════════════
// DECISION AGENT REVIEWS
// ═══════════════════════════════════════════════════════════════════

export async function createDecisionAgentReview(
  scope: OwnerScope,
  input: CreateDecisionAgentReviewInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    await verifyDecisionOwnership(scope, input.decision_id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_decision_agent_reviews")
      .insert({
        user_id: scope.userId,
        project_id: scope.projectId,
        ...input,
      })
      .select("id")
      .single();

    if (error) return fail("Could not create agent review.");
    return ok(data);
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : "Could not create agent review.");
  }
}

export async function listAgentReviewsByDecision(
  scope: OwnerScope,
  decisionId: string,
): Promise<ServiceResult<Record<string, unknown>[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_decision_agent_reviews")
      .select("*")
      .eq("decision_id", decisionId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .order("created_at", { ascending: true });

    if (error) return fail("Could not list agent reviews.");
    return ok(data ?? []);
  } catch {
    return fail("Could not list agent reviews.");
  }
}

// ═══════════════════════════════════════════════════════════════════
// DECISION RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════

export async function createDecisionRecommendation(
  scope: OwnerScope,
  input: CreateDecisionRecommendationInput,
): Promise<ServiceResult<{ id: string }>> {
  try {
    await verifyDecisionOwnership(scope, input.decision_id);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_decision_recommendations")
      .insert({
        user_id: scope.userId,
        project_id: scope.projectId,
        ...input,
      })
      .select("id")
      .single();

    if (error) return fail("Could not create recommendation.");
    return ok(data);
  } catch (e: unknown) {
    return fail(e instanceof Error ? e.message : "Could not create recommendation.");
  }
}

export async function listRecommendationsByDecision(
  scope: OwnerScope,
  decisionId: string,
): Promise<ServiceResult<Record<string, unknown>[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("product_decision_recommendations")
      .select("*")
      .eq("decision_id", decisionId)
      .eq("user_id", scope.userId)
      .eq("project_id", scope.projectId)
      .order("created_at", { ascending: false });

    if (error) return fail("Could not list recommendations.");
    return ok(data ?? []);
  } catch {
    return fail("Could not list recommendations.");
  }
}


import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkHeavyAILimit, rateLimitResponse } from "@/lib/ai/rate-limiter";
import { trackAIUsageError } from "@/lib/ai/usage-tracking";
import { analyzeDecision } from "@/lib/decisions/decision-review-service";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

export async function POST(
  _req: NextRequest,
  { params }: { params: { projectId: string; decisionId: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, decisionId } = params;

  // Validate UUIDs
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(projectId) || !uuidRe.test(decisionId)) {
    return NextResponse.json({ error: "Invalid parameters." }, { status: 400 });
  }

  // Rate limiting (heavy tier — this is an expensive operation)
  const rl = checkHeavyAILimit(user);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const result = await analyzeDecision({
      userId: user.id,
      projectId,
      decisionId,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    const isAuthError = message.includes("access denied") || message.includes("not found");
    const isConfigError = message.includes("not configured") || message.includes("API key");

    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("[decision-review] Error:", message);
    }

    void trackAIUsageError({
      userId: user.id,
      projectId,
      feature: "decision_review",
      model: "gpt-4o",
      error: err,
      latencyMs: 0,
      metadata: { decisionId },
    });

    if (isAuthError) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (isConfigError) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json(
      { error: "Could not analyze decision. Please try again." },
      { status: 502 },
    );
  }
}


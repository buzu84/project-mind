import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getDecisionById,
  updateDecision,
  deleteDecision,
} from "@/lib/decisions/service";
import { updateDecisionSchema } from "@/lib/decisions/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { projectId: string; decisionId: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await getDecisionById(
    { userId: user.id, projectId: params.projectId },
    params.decisionId,
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  return NextResponse.json({ decision: result.data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; decisionId: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const result = await updateDecision(
    { userId: user.id, projectId: params.projectId },
    params.decisionId,
    parsed.data,
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ decision: result.data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { projectId: string; decisionId: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await deleteDecision(
    { userId: user.id, projectId: params.projectId },
    params.decisionId,
  );

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}


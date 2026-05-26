import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/decisions/[id]?projectId=xxx
 *
 * Deletes a generated document (PRD, Competitive Analysis, etc.)
 * from the legacy `decisions` table.
 *
 * The `decisions` table has NO `user_id` column.
 * Ownership is enforced through the parent `projects` table:
 *   1. Authenticate user
 *   2. Verify the project belongs to the user (projects.user_id)
 *   3. Delete only where decisions.id AND decisions.project_id match
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const supabase = createClient();

  // Verify the project belongs to the user
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
  }

  // Delete the decision, scoped to project (ownership verified above).
  // The legacy `decisions` table has no user_id column; ownership is
  // enforced by the project ownership check above and by RLS in production.
  const { error } = await supabase
    .from("decisions")
    .delete()
    .eq("id", params.id)
    .eq("project_id", projectId);

  if (error) {
    console.error("[decisions] Delete failed:", error.message);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}


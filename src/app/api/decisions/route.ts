import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get("projectId");
  const type = req.nextUrl.searchParams.get("type");

  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const supabase = createClient();

  // Verify the project belongs to the user (the legacy `decisions` table
  // has no user_id column; ownership is via project ownership + RLS).
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ decisions: [] });
  }

  let query = supabase
    .from("decisions")
    .select("id, type, input, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[decisions] Fetch failed:", error.message);
    return NextResponse.json({ decisions: [] });
  }

  return NextResponse.json({ decisions: data ?? [] });
}


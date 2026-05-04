import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  "";

export async function POST() {
  // 1. Get the authenticated user from cookies
  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options as any),
        );
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const userId = user.id;

  // 2. Require service role key for admin operations
  if (!secretKey) {
    console.error("[DELETE_ACCOUNT] Missing SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const adminClient = createSupabaseClient(supabaseUrl, secretKey);

  // 3. Delete all user data (order matters — children before parents)
  const tables = [
    // Tables with project_id FK (delete via project ownership)
    { table: "ai_usage", filter: { field: "user_id", value: userId } },
    { table: "global_chat_messages", filter: { field: "user_id", value: userId } },
  ];

  // Get all user project IDs first
  const { data: userProjects } = await adminClient
    .from("projects")
    .select("id")
    .eq("user_id", userId);

  const projectIds = (userProjects ?? []).map((p: { id: string }) => p.id);

  if (projectIds.length > 0) {
    // Delete project children in dependency order
    const projectChildTables = [
      "decision_evidence_links",
      "decision_agent_reviews",
      "decision_recommendations",
      "decision_options",
      "assumptions",
      "evidence",
      "document_chunks",
      "messages",
      "insights",
      "feedback_documents",
      "feature_ideas",
      "roadmaps",
      "multi_agent_reviews",
      "prds",
      "competitive_analyses",
      "project_context",
      "decisions",
    ];

    for (const table of projectChildTables) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .in("project_id", projectIds);

      if (error) {
        console.error(`[DELETE_ACCOUNT] Failed to delete ${table}:`, error.message);
        // Continue — some tables may not exist
      }
    }
  }

  // Delete user-level tables
  for (const { table, filter } of tables) {
    const { error } = await adminClient
      .from(table)
      .delete()
      .eq(filter.field, filter.value);

    if (error) {
      console.error(`[DELETE_ACCOUNT] Failed to delete ${table}:`, error.message);
    }
  }

  // Delete projects themselves
  if (projectIds.length > 0) {
    const { error } = await adminClient
      .from("projects")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("[DELETE_ACCOUNT] Failed to delete projects:", error.message);
    }
  }

  // Delete profile
  const { error: profileError } = await adminClient
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) {
    console.error("[DELETE_ACCOUNT] Failed to delete profile:", profileError.message);
  }

  // 4. Sign out session before deleting auth user
  await supabase.auth.signOut();

  // 5. Delete auth user via admin API
  const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId);

  if (deleteUserError) {
    console.error("[DELETE_ACCOUNT] Failed to delete auth user:", deleteUserError.message);
    return NextResponse.json(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 },
    );
  }


  return NextResponse.json({ success: true });
}



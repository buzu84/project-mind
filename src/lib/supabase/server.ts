import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const isConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-anon-key");

export function createClient() {
  if (!isConfigured) {
    console.debug(
      "[supabase] Credentials not configured — returning no-op client",
    );
    return createMockSupabaseClient();
  }

  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore.
          }
        },
      },
    },
  );
}

/**
 * A no-op Supabase client that returns empty results for all queries.
 * Used in development when Supabase credentials are not configured.
 */
function createMockSupabaseClient(): ReturnType<typeof createServerClient> {
  const emptyResult = { data: null, error: null, count: null, status: 200, statusText: "OK" };
  const emptyUserResult = { data: { user: null }, error: null };

  const chainable: any = new Proxy(
    {},
    {
      get(_target, prop) {
        // Not a thenable at the top chain level (prevents auto-resolution)
        if (prop === "then") return undefined;
        if (prop === "single" || prop === "maybeSingle") {
          return () => Promise.resolve(emptyResult);
        }
        // Everything else returns chainable
        return (..._args: any[]) => {
          // Make the returned object thenable so `await supabase.from(...).select(...)` works
          const next: any = new Proxy(
            {},
            {
              get(_t, p) {
                if (p === "then") {
                  return (resolve: any) => resolve(emptyResult);
                }
                if (p === "single" || p === "maybeSingle") {
                  return () => Promise.resolve(emptyResult);
                }
                // Continue chaining
                return (..._a: any[]) => next;
              },
            },
          );
          return next;
        };
      },
    },
  );

  return {
    from: () => chainable,
    auth: {
      getUser: () => Promise.resolve(emptyUserResult),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
      signInWithOAuth: () => Promise.resolve({ data: { provider: "", url: "" }, error: { message: "Supabase not configured" } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    rpc: () => Promise.resolve(emptyResult),
    storage: { from: () => ({}) },
  } as any;
}



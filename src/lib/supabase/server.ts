import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isMockDb, isDevMode } from "@/lib/auth/constants";

// ─── Key normalization ──────────────────────────────────────
// Supabase dashboard may label keys as "publishable" / "secret"
// but env vars may use the older "anon" / "service_role" names.
// Support both naming conventions.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";
const secretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  "";

const hasRealCredentials =
  !!supabaseUrl &&
  !supabaseUrl.includes("your-project") &&
  !!publishableKey &&
  !publishableKey.includes("your-anon-key");

const hasSecretKey = !!secretKey && !secretKey.includes("your-service-role");

// ─── Safety: never allow mock auth in production ────────────
// Checked at runtime when createClient() is first called, not at import time
// (next build runs with NODE_ENV=production).

let _loggedOnce = false;
let _productionGuardChecked = false;

export function createClient() {
  // Runtime production guard (not at module level — build would fail)
  if (!_productionGuardChecked) {
    _productionGuardChecked = true;
    if (
      process.env.NODE_ENV === "production" &&
      process.env.USE_MOCK_AUTH === "true"
    ) {
      throw new Error(
        "[FATAL] USE_MOCK_AUTH=true is not allowed in production. " +
        "Remove it from your environment variables.",
      );
    }
  }

  const mockDb = isMockDb();

  // Use real Supabase when credentials exist and mock DB is not forced
  if (hasRealCredentials && !mockDb) {
    // When using mock auth (dev mode) with a real database,
    // we MUST use the service/secret key to bypass RLS since there
    // is no real auth session (auth.uid() would be NULL).
    // This is safe because:
    // - isDevMode() returns false in production (hardcoded check)
    // - secretKey is never exposed to client (no NEXT_PUBLIC_ prefix)
    // - All user_id filtering is done explicitly in queries
    if (isDevMode() && hasSecretKey) {
      if (!_loggedOnce) {
        console.log("[supabase] DEV MODE: Using admin client (service role) — RLS bypassed server-side only");
        _loggedOnce = true;
      }
      return createSupabaseClient(supabaseUrl, secretKey) as any;
    }

    // Production / real auth: use the publishable key with user cookies
    const cookieStore = cookies();

    return createServerClient(supabaseUrl, publishableKey, {
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
    });
  }

  // Fallback: in-memory mock DB
  if (!mockDb && process.env.NODE_ENV === "production") {
    console.warn(
      "[supabase] No real credentials found. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createMockSupabaseClient();
}

/**
 * In-memory store that survives Next.js HMR by attaching to globalThis.
 * Without this, every hot-reload wipes the data and newly created
 * projects disappear from the list.
 */
const globalKey = "__productmind_mock_store__" as const;

function getMockStore(): Record<string, any[]> {
  const g = globalThis as any;
  if (!g[globalKey]) {
    g[globalKey] = {};
  }
  return g[globalKey];
}

function createMockSupabaseClient(): ReturnType<typeof createServerClient> {
  const ok = { error: null, count: null, status: 200, statusText: "OK" };
  const emptyUserResult = { data: { user: null }, error: null };

  function makeChainable(pendingResult: () => { data: any; error: any }) {
    // Accumulated filters and ordering applied lazily when the chain resolves
    let filters: Array<{ field: string; value: any }> = [];
    let orderBys: Array<{ field: string; ascending: boolean }> = [];

    function applyFilters(data: any) {
      if (!Array.isArray(data) || filters.length === 0) return data;
      return data.filter((row: any) =>
        filters.every((f) => row[f.field] === f.value),
      );
    }

    function applyOrdering(data: any) {
      if (!Array.isArray(data) || orderBys.length === 0) return data;
      const sorted = [...data];
      sorted.sort((a: any, b: any) => {
        for (const { field, ascending } of orderBys) {
          const av = a[field];
          const bv = b[field];
          if (av < bv) return ascending ? -1 : 1;
          if (av > bv) return ascending ? 1 : -1;
        }
        return 0;
      });
      return sorted;
    }

    function resolve(data: any) {
      return applyOrdering(applyFilters(data));
    }

    const chain: any = new Proxy(
      {},
      {
        get(_t, p) {
          if (p === "then") {
            const r = pendingResult();
            const result = resolve(r.data);
            return (res: any) => res({ ...ok, data: result, error: r.error });
          }
          if (p === "single" || p === "maybeSingle") {
            return () => {
              const r = pendingResult();
              const result = resolve(r.data);
              const row = Array.isArray(result) ? (result[0] ?? null) : result;
              return Promise.resolve({ ...ok, data: row, error: r.error });
            };
          }
          if (p === "eq") {
            return (field: string, value: any) => {
              filters.push({ field, value });
              return chain;
            };
          }
          if (p === "order") {
            return (field: string, opts?: { ascending?: boolean }) => {
              orderBys.push({ field, ascending: opts?.ascending ?? true });
              return chain;
            };
          }
          // .order / .limit / .select (after initial select) — continue chain
          return (..._a: any[]) => chain;
        },
      },
    );
    return chain;
  }

  return {
    from: (table: string) => {
      const mockStore = getMockStore();
      if (!mockStore[table]) mockStore[table] = [];
      const rows = mockStore[table];

      const tableApi: any = {
        select: (..._args: any[]) => makeChainable(() => ({ data: [...rows], error: null })),

        insert: (payload: any) => {
          const items = Array.isArray(payload) ? payload : [payload];
          const created = items.map((item) => ({
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...item,
          }));
          rows.push(...created);

          // Return a chainable that resolves to the inserted rows
          return makeChainable(() => ({ data: created, error: null }));
        },

        update: (payload: any) => {
          // Returns chainable with .eq() filter support
          let eqField: string | null = null;
          let eqValue: any = null;
          const chain: any = new Proxy(
            {},
            {
              get(_t, p) {
                if (p === "eq") {
                  return (field: string, value: any) => {
                    eqField = field;
                    eqValue = value;
                    // Apply update
                    for (const row of rows) {
                      if (row[eqField!] === eqValue) Object.assign(row, payload, { updated_at: new Date().toISOString() });
                    }
                    return chain;
                  };
                }
                if (p === "then") return (resolve: any) => resolve({ ...ok, data: null, error: null });
                if (p === "single" || p === "maybeSingle") return () => Promise.resolve({ ...ok, data: null, error: null });
                return (..._a: any[]) => chain;
              },
            },
          );
          return chain;
        },

        delete: () => {
          const chain: any = new Proxy(
            {},
            {
              get(_t, p) {
                if (p === "eq") {
                  return (field: string, value: any) => {

                    // Remove ALL matching rows, not just the first
                    for (let i = rows.length - 1; i >= 0; i--) {
                      if (rows[i][field] === value) rows.splice(i, 1);
                    }
                    return chain;
                  };
                }
                if (p === "then") return (resolve: any) => resolve({ ...ok, data: null, error: null });
                return (..._a: any[]) => chain;
              },
            },
          );
          return chain;
        },

        upsert: (payload: any, opts?: { onConflict?: string }) => {
          const items = Array.isArray(payload) ? payload : [payload];
          const conflictKey = opts?.onConflict;
          const created: any[] = [];
          for (const item of items) {
            let existingIdx = -1;
            if (conflictKey) {
              existingIdx = rows.findIndex((r) => r[conflictKey] === item[conflictKey]);
            }
            if (existingIdx >= 0) {
              Object.assign(rows[existingIdx], item, { updated_at: new Date().toISOString() });
              created.push(rows[existingIdx]);
            } else {
              const newRow = {
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...item,
              };
              rows.push(newRow);
              created.push(newRow);
            }
          }
          return makeChainable(() => ({ data: created, error: null }));
        },
      };

      return tableApi;
    },
    auth: {
      getUser: () => Promise.resolve(emptyUserResult),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
      signInWithOAuth: () => Promise.resolve({ data: { provider: "", url: "" }, error: { message: "Supabase not configured" } }),
      signOut: () => Promise.resolve({ error: null }),
    },
    rpc: () => Promise.resolve({ ...ok, data: null }),
    storage: { from: () => ({}) },
  } as any;
}



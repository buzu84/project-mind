import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isMockDb } from "@/lib/auth/constants";

const hasRealCredentials =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project") &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("your-anon-key");

export function createClient() {
  const mockDb = isMockDb();

  // Use real Supabase when credentials exist and mock DB is not forced
  if (hasRealCredentials && !mockDb) {
    console.debug("[supabase] Using real Supabase DB");
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

  // Fallback: in-memory mock DB
  if (!mockDb) {
    console.warn(
      "[supabase] No real credentials found and USE_MOCK_DB is not enabled. " +
      "Set real Supabase credentials or USE_MOCK_DB=true in .env.local",
    );
  }
  console.debug("[supabase] Using in-memory mock DB");
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
    console.debug("[mock-supabase] Initialized fresh in-memory store");
  }
  return g[globalKey];
}

function createMockSupabaseClient(): ReturnType<typeof createServerClient> {
  const ok = { error: null, count: null, status: 200, statusText: "OK" };
  const emptyUserResult = { data: { user: null }, error: null };

  function makeChainable(pendingResult: () => { data: any; error: any }) {
    // Accumulated filters applied lazily when the chain resolves
    let filters: Array<{ field: string; value: any }> = [];

    function applyFilters(data: any) {
      if (!Array.isArray(data) || filters.length === 0) return data;
      return data.filter((row: any) =>
        filters.every((f) => row[f.field] === f.value),
      );
    }

    const chain: any = new Proxy(
      {},
      {
        get(_t, p) {
          if (p === "then") {
            const r = pendingResult();
            const filtered = applyFilters(r.data);
            return (resolve: any) => resolve({ ...ok, data: filtered, error: r.error });
          }
          if (p === "single" || p === "maybeSingle") {
            return () => {
              const r = pendingResult();
              const filtered = applyFilters(r.data);
              const row = Array.isArray(filtered) ? (filtered[0] ?? null) : filtered;
              return Promise.resolve({ ...ok, data: row, error: r.error });
            };
          }
          if (p === "eq") {
            return (field: string, value: any) => {
              filters.push({ field, value });
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
          console.debug(`[mock-supabase] Inserted ${created.length} row(s) into "${table}"`);

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
                    const idx = rows.findIndex((r) => r[field] === value);
                    if (idx !== -1) rows.splice(idx, 1);
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

        upsert: (payload: any) => tableApi.insert(payload),
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



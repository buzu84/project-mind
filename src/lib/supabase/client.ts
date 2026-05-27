import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

const isConfigured =
  !!supabaseUrl &&
  !supabaseUrl.includes("your-project") &&
  !!publishableKey &&
  !publishableKey.includes("your-anon-key");

export function createClient() {
  if (!isConfigured) {
    const errResult = { message: "Supabase not configured" };
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: errResult }),
        signInWithOAuth: () => Promise.resolve({ data: { provider: "", url: "" }, error: errResult }),
        signOut: () => Promise.resolve({ error: null }),
        resend: () => Promise.resolve({ data: null, error: errResult }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => new Proxy({}, { get: () => () => Promise.resolve({ data: null, error: null }) }),
    } as any;
  }

  return createBrowserClient<Database>(supabaseUrl, publishableKey);
}

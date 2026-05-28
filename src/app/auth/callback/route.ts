import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSiteUrl } from "@/lib/url";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "recovery"
    | "email"
    | "signup"
    | null;
  const next = searchParams.get("next") ?? "/dashboard";
  const errorParam = searchParams.get("error");

  // Use the centralized site URL
  const origin = getSiteUrl();

  // Handle error passed as query param (some Supabase flows)
  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/sign-in?error=auth_callback_error`,
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }>,
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as any),
          );
        } catch {
          // Called from read-only context — ignore
        }
      },
    },
  });

  // Handle PKCE / OAuth code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Email may still have been confirmed server-side by Supabase
    return NextResponse.redirect(
      `${origin}/sign-in?confirmed=true`,
    );
  }

  // Handle email link tokens (password reset, email confirmation)
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      // signup or email confirmation — redirect to dashboard if session exists
      if (data.session) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      // No session but verified — send to sign-in with success
      return NextResponse.redirect(`${origin}/sign-in?confirmed=true`);
    }

    // Token may be expired or already used
    if (type === "signup" || type === "email") {
      return NextResponse.redirect(
        `${origin}/sign-in?confirmed=true`,
      );
    }
    if (type === "recovery") {
      return NextResponse.redirect(
        `${origin}/forgot-password?error=expired_link`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`);
}

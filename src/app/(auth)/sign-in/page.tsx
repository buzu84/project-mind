"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSparkles } from "@/components/icons";
import { DEV_USER, isDevMode } from "@/lib/auth/constants";

const errorMessages: Record<string, string> = {
  auth_callback_error: "We could not verify your email link. Please request a new confirmation email or try signing in.",
  default: "An unexpected error occurred. Please try again.",
};

const successMessages: Record<string, string> = {
  confirmed: "Email confirmed! You can now log in.",
};

function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const errorType = searchParams.get("error");
  const successType = searchParams.get("confirmed") === "true" ? "confirmed" : null;
  const errorMessage = errorType
    ? (errorMessages[errorType] ?? errorMessages.default)
    : null;
  const successMessage = successType ? successMessages[successType] : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  const supabase = createClient();

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading("email");
    setFormError(null);
    setShowResend(false);
    setResendStatus("idle");


    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
        setFormError("Email or password is incorrect.");
      } else if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
        setFormError("Please confirm your email before signing in. Check your inbox.");
        setShowResend(true);
      } else {
        setFormError("Log in failed. Please try again.");
      }
      setIsLoading(null);
      return;
    }


    router.push(redirectTo);
    router.refresh();
  }

  async function handleResendConfirmation() {
    if (!email) return;
    setResendStatus("loading");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setResendStatus("error");
    } else {
      setResendStatus("sent");
    }
  }

  async function handleGoogleSignIn() {
    setIsLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      setFormError("Could not connect to Google. Please try again.");
      setIsLoading(null);
    }
  }

  return (
    <>
      {successMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {(errorMessage || formError) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError ?? errorMessage}
          {showResend && (
            <div className="mt-2">
              {resendStatus === "sent" ? (
                <p className="text-emerald-600 font-medium">Confirmation email sent. Check your inbox.</p>
              ) : resendStatus === "error" ? (
                <p>Could not resend confirmation email. Please try again.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resendStatus === "loading"}
                  className="font-medium text-brand-600 hover:text-brand-700 underline"
                >
                  {resendStatus === "loading" ? "Sending…" : "Resend confirmation email"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isDevMode() && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-amber-800">🛠 Dev Quick Login</p>
          <p className="mb-3 text-xs text-amber-600">
            Skip auth and log in as <span className="font-medium">{DEV_USER.name}</span> ({DEV_USER.email})
          </p>
          <Button
            className="w-full"
            isLoading={isLoading === "dev"}
            disabled={isLoading !== null}
            onClick={() => {
              setIsLoading("dev");
              router.push(redirectTo);
            }}
          >
            Dev Login
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleEmailSignIn} className="space-y-3">
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Forgot password?
            </Link>
          </div>
          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading === "email"}
            disabled={isLoading !== null}
          >
            Log in
          </Button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-400">or continue with</span>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={handleGoogleSignIn}
          className="w-full"
          isLoading={isLoading === "google"}
          disabled={isLoading !== null}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </Button>

        <p className="mt-4 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="font-medium text-brand-600 hover:text-brand-700">
            Sign up
          </a>
        </p>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-200">
            <IconSparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Log in to your ProductMind account
          </p>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-gray-100" />}>
          <SignInForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-gray-400">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

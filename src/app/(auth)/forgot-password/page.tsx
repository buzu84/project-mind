"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSparkles } from "@/components/icons";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (err) {
      setError("Could not send reset email. Please check your email address and try again.");
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h3 className="text-base font-semibold text-emerald-800">Check your email</h3>
        <p className="mt-2 text-sm text-emerald-700">
          We sent a password reset link to <strong>{email}</strong>.
          Click it to set a new password.
        </p>
        <Link
          href="/sign-in"
          className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="mb-4 text-sm text-gray-600">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading}>
            Send Reset Link
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Remember your password?{" "}
          <Link href="/sign-in" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-200">
            <IconSparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Reset password
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            We&apos;ll email you a reset link
          </p>
        </div>

        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-gray-100" />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}


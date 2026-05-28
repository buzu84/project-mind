"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSparkles } from "@/components/icons";
import { AUTH_PASSWORD_MIN } from "@/lib/validations/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const passwordError =
    passwordTouched && password.length > 0 && password.length < AUTH_PASSWORD_MIN
      ? `Password must be at least ${AUTH_PASSWORD_MIN} characters.`
      : null;
  const confirmError =
    confirmTouched && confirmPassword.length > 0 && confirmPassword !== password
      ? "Passwords do not match."
      : null;
  const isValid = password.length >= AUTH_PASSWORD_MIN && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordTouched(true);
    setConfirmTouched(true);
    if (!isValid) return;

    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });

    if (err) {
      setError(
        err.message.includes("same_password")
          ? "New password must be different from your current password."
          : "Could not update password. Please try again or request a new reset link.",
      );
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6" role="status">
            <h3 className="text-base font-semibold text-emerald-800">Password updated!</h3>
            <p className="mt-2 text-sm text-emerald-700">
              Your password has been changed. Redirecting to dashboard…
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-200">
            <IconSparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Set new password
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Choose a new password for your account
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              id="password"
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder={`Min ${AUTH_PASSWORD_MIN} characters`}
              error={passwordError ?? undefined}
              required
            />
            <Input
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setConfirmTouched(true)}
              placeholder="Re-enter your password"
              error={confirmError ?? undefined}
              required
            />
            <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLoading || !isValid}>
              Update Password
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            <Link href="/sign-in" className="font-medium text-brand-600 hover:text-brand-700">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}


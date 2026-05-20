"use client";

import { useState } from "react";
import type { AppUser } from "@/lib/auth/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IconSparkles, IconLogOut } from "@/components/icons";
import { DeleteAccountModal } from "@/components/delete-account-modal";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface SettingsContentProps {
  user: AppUser | null;
  /** Auth provider: "email", "google", etc. Passed from server. */
  authProvider?: string;
  /** Whether user is an admin (bypasses AI rate limits). Determined server-side only. */
  isAdmin?: boolean;
}

export function SettingsContent({ user, authProvider = "email", isAdmin = false }: SettingsContentProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);

  const displayName = user?.name ?? "User";
  const avatarUrl = user?.avatar_url;
  const email = user?.email ?? "";
  const isOAuth = authProvider !== "email";

  async function handlePasswordReset() {
    if (!email) return;
    setPasswordResetLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setPasswordResetLoading(false);
    if (!error) setPasswordResetSent(true);
  }

  function handleSignOut() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/sign-out";
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ─── Profile ─── */}
      <Card>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900">Profile</h3>
          <p className="mt-1 text-sm text-gray-500">Your account information</p>
        </div>

        <div className="flex items-center gap-5 pb-6 border-b border-gray-100">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full ring-4 ring-gray-100"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
              {displayName[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-500">{email}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="success">Active</Badge>
              <Badge variant="default">
                {isOAuth
                  ? `${authProvider.charAt(0).toUpperCase()}${authProvider.slice(1)} account`
                  : "Email account"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input id="name" label="Display name" defaultValue={displayName} disabled />
          <Input id="email" label="Email" defaultValue={email} disabled />
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Profile information is managed through your authentication provider and cannot be edited here.
        </p>
      </Card>

      {/* ─── Account Security ─── */}
      <Card>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900">Account Security</h3>
          <p className="mt-1 text-sm text-gray-500">Manage your password and sessions</p>
        </div>

        {/* Change password */}
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Password</p>
            {isOAuth ? (
              <p className="text-xs text-gray-500">
                Managed by {authProvider.charAt(0).toUpperCase()}{authProvider.slice(1)}. Sign in with your provider to change it.
              </p>
            ) : passwordResetSent ? (
              <p className="text-xs text-emerald-600">
                Reset link sent to {email}. Check your inbox.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Send a password reset link to your email
              </p>
            )}
          </div>
          {!isOAuth && !passwordResetSent && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePasswordReset}
              isLoading={passwordResetLoading}
              disabled={passwordResetLoading}
            >
              Reset password
            </Button>
          )}
        </div>

        {/* Sign out */}
        <div className="mt-3 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Session</p>
            <p className="text-xs text-gray-500">
              Sign out of your current session on this device
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSignOut}
          >
            <IconLogOut className="mr-1.5 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </Card>

      {/* ─── Plan ─── */}
      <Card>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900">Plan</h3>
          <p className="mt-1 text-sm text-gray-500">Your current subscription</p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100">
              <IconSparkles className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  {isAdmin ? "Admin Plan" : "Free Plan"}
                </p>
                {isAdmin && (
                  <Badge variant="success">Admin</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {isAdmin
                  ? "Unlimited AI usage — no rate limits applied"
                  : "All AI features included — usage limits apply (see below)"}
              </p>
            </div>
          </div>
          {!isAdmin && (
            <Button variant="secondary" size="sm" disabled>
              Upgrade coming soon
            </Button>
          )}
        </div>

        {!isAdmin && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-700">Current limits</p>
            <ul className="mt-1.5 space-y-1 text-xs text-gray-500">
              <li>• Standard AI requests (chat, insights, scoring): 20 per hour</li>
              <li>• Heavy AI generations (PRD, roadmap, competitive analysis, multi-agent review): 5 per 15 minutes</li>
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          Paid plans with higher limits and team features will be available after beta.
        </p>
      </Card>

      {/* ─── Preferences ─── */}
      <Card>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900">Preferences</h3>
          <p className="mt-1 text-sm text-gray-500">App settings and notifications</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Theme</p>
              <p className="text-xs text-gray-500">System default</p>
            </div>
            <Badge variant="default">Coming soon</Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Email notifications</p>
              <p className="text-xs text-gray-500">Product updates and weekly digests</p>
            </div>
            <Badge variant="default">Coming soon</Badge>
          </div>
        </div>
      </Card>

      {/* ─── Privacy & Cookies ─── */}
      <Card>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900">Privacy &amp; Cookies</h3>
          <p className="mt-1 text-sm text-gray-500">How your data and cookies are handled</p>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Essential cookies</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Always on
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Required for authentication and session management. Cannot be disabled.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-60">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">Analytics cookies</p>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500">
                Coming soon
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Help us understand how the product is used. Not currently active.
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">AI data processing</p>
            <p className="mt-1 text-xs text-gray-500">
              Your project data and feedback are processed by OpenAI to generate AI-powered
              insights. Data is not used for model training.
            </p>
          </div>

          <div className="flex gap-4 pt-2">
            <Link
              href="/privacy"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Privacy Policy
            </Link>
            <Link
              href="/cookies"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Cookie Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </Card>

      {/* ─── Danger Zone ─── */}
      <Card className="border-red-200">
        <h3 className="text-base font-semibold text-red-600">Danger Zone</h3>
        <p className="mt-1 text-sm text-gray-500">
          Irreversible and destructive actions
        </p>
        <div className="mt-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Delete account</p>
            <p className="text-xs text-gray-500">
              Permanently delete your account and all data
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete account
          </Button>
        </div>
      </Card>

      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  );
}

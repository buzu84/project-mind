"use client";

import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { IconUser, IconSparkles } from "@/components/icons";

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Profile */}
      <Card>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900">Profile</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account information
          </p>
        </div>

        <div className="flex items-center gap-5 pb-6 border-b border-gray-100">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt=""
              className="h-16 w-16 rounded-full ring-4 ring-gray-100"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {session?.user?.name ?? "User"}
            </p>
            <p className="text-sm text-gray-500">
              {session?.user?.email ?? ""}
            </p>
            <Badge variant="success" className="mt-2">Active</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            id="name"
            label="Display Name"
            defaultValue={session?.user?.name ?? ""}
            disabled
          />
          <Input
            id="email"
            label="Email"
            defaultValue={session?.user?.email ?? ""}
            disabled
          />
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Profile information is managed through your OAuth provider.
        </p>
      </Card>

      {/* Plan */}
      <Card>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900">Plan & Usage</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your current subscription plan
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100">
              <IconSparkles className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Free Plan</p>
              <p className="text-xs text-gray-500">
                10 AI decisions per month
              </p>
            </div>
          </div>
          <Button size="sm" variant="secondary" disabled>
            Upgrade (Coming Soon)
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-gray-600">AI Decisions Used</span>
              <span className="font-medium text-gray-900">0 / 10</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div className="h-2 w-0 rounded-full bg-brand-500 transition-all" />
            </div>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900">Preferences</h3>
          <p className="mt-1 text-sm text-gray-500">
            Customize your experience
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Email Notifications
              </p>
              <p className="text-xs text-gray-500">
                Get notified about new features and updates
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" defaultChecked />
              <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:bg-brand-600 peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Dark Mode
              </p>
              <p className="text-xs text-gray-500">
                Switch to dark theme
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" />
              <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:bg-brand-600 peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <h3 className="text-base font-semibold text-red-600">Danger Zone</h3>
        <p className="mt-1 text-sm text-gray-500">
          Irreversible and destructive actions
        </p>
        <div className="mt-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">Delete Account</p>
            <p className="text-xs text-gray-500">
              Permanently delete your account and all data
            </p>
          </div>
          <Button variant="danger" size="sm" disabled>
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}


"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { AppUser } from "@/lib/auth/constants";

interface UserDropdownProps {
  user: AppUser;
}

export function UserDropdown({ user }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open]);

  const initial = (user.name?.[0] ?? user.email?.[0] ?? "U").toUpperCase();

  function handleSignOut() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/sign-out";
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 rounded-full ring-2 ring-gray-200 hover:ring-brand-300 transition"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 ring-2 ring-gray-200 hover:ring-brand-300 transition cursor-pointer">
            {initial}
          </div>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white py-1 shadow-lg z-50"
          role="menu"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          <Link
            href="/dashboard"
            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/projects"
            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Projects
          </Link>
          <Link
            href="/settings"
            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>

          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition"
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


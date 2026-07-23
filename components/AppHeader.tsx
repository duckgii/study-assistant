"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useLanguage } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  user: { name?: string | null; image?: string | null };
  right?: React.ReactNode;
}

// Shared top bar for every screen once the user is signed in: a Home link
// back to the directory, the current screen's title, and the account menu.
export default function AppHeader({ title, subtitle, user, right }: AppHeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex flex-shrink-0 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t("header.home")}
        </Link>
        <div>
          {subtitle && <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">{subtitle}</p>}
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {right}
        <LanguageToggle />
        <div className="flex items-center gap-2">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name || "Profile"} className="h-8 w-8 rounded-full border border-slate-200" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-slate-200" />
          )}
          <span className="hidden text-sm text-slate-600 sm:inline">{user.name}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
        >
          {t("header.signOut")}
        </button>
      </div>
    </header>
  );
}

"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";

interface LoginCardProps {
  children: ReactNode;
}

export default function LoginCard({ children }: LoginCardProps) {
  const { t } = useLanguage();

  return (
    <div className="w-full max-w-sm rounded-[32px] border border-slate-200 bg-white/90 p-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex justify-center">
        <LanguageToggle />
      </div>
      <p className="mt-4 text-sm font-semibold uppercase tracking-[0.35em] text-blue-600">{t("login.brand")}</p>
      <h1 className="mt-4 text-3xl font-semibold">{t("login.heading")}</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">{t("login.description")}</p>

      {children}
    </div>
  );
}

"use client";

import { useLanguage } from "@/lib/i18n";

export default function GoogleSignInButton() {
  const { t } = useLanguage();

  return (
    <button
      type="submit"
      className="flex w-full items-center justify-center gap-3 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
    >
      {t("login.signInGoogle")}
    </button>
  );
}

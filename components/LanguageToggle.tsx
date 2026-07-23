"use client";

import { useLanguage } from "@/lib/i18n";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center rounded-full border border-slate-200 p-0.5 text-xs font-semibold">
      <button
        onClick={() => setLanguage("en")}
        className={`rounded-full px-2.5 py-1 transition ${language === "en" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("ko")}
        className={`rounded-full px-2.5 py-1 transition ${language === "ko" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}
      >
        한국어
      </button>
    </div>
  );
}

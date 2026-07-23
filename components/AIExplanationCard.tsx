"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/lib/i18n";
import type { ExplanationData } from "@/lib/types";

interface AIExplanationCardProps {
  sectionTitle: string;
  explanation: ExplanationData | null;
  isLoading: boolean;
  pageNumber: number;
  pageNote: string | null;
}

// The section-level explanation shows a loading state (it's the primary,
// always-checked content). The page note is a quiet bonus most pages don't
// have — it never shows its own loading indicator; it just appears if the
// background fetch finds something worth adding for this specific page.
export default function AIExplanationCard({ sectionTitle, explanation, isLoading, pageNumber, pageNote }: AIExplanationCardProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);

  if (!isLoading && !explanation && !pageNote) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between px-6 py-4 text-left">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600">{t("aiTutor.label")}</p>
          <h4 className="mt-1 text-lg font-semibold text-slate-900">{sectionTitle}</h4>
        </div>
        <span className="text-sm text-slate-500">{open ? t("aiTutor.hide") : t("aiTutor.show")}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-6 py-5">
          {isLoading ? (
            <p className="text-sm text-slate-500">{t("aiTutor.preparing")}</p>
          ) : explanation ? (
            <>
              <div className="prose prose-sm prose-slate max-w-none leading-7 prose-strong:text-slate-900">
                <ReactMarkdown>{explanation.explanation}</ReactMarkdown>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                {t("aiTutor.strategy", { strategy: explanation.strategy })}
              </div>
            </>
          ) : null}

          {pageNote && (
            <div className={explanation || isLoading ? "mt-4 border-t border-slate-100 pt-4" : ""}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">{t("aiTutor.onPage", { page: pageNumber })}</p>
              <div className="prose prose-sm prose-slate mt-2 max-w-none leading-6 prose-strong:text-slate-900">
                <ReactMarkdown>{pageNote}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

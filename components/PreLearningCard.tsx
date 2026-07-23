"use client";

import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/lib/i18n";
import type { PreLearningData } from "@/lib/types";

interface PreLearningCardProps {
  data: PreLearningData | null;
  isLoading: boolean;
  onBegin: () => void;
}

export default function PreLearningCard({ data, isLoading, onBegin }: PreLearningCardProps) {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">{t("preLearning.step")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{t("preLearning.title")}</h2>

        {isLoading && !data ? (
          <p className="mt-4 text-sm text-slate-500">{t("preLearning.summarizing")}</p>
        ) : (
          <div className="prose prose-sm prose-slate mt-4 max-w-none leading-7 prose-strong:text-slate-900">
            <ReactMarkdown>{data?.summary || ""}</ReactMarkdown>
          </div>
        )}
      </div>

      <button onClick={onBegin} disabled={!data} className="w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">
        {t("preLearning.begin")}
      </button>
    </div>
  );
}

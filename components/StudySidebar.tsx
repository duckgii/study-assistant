"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLanguage } from "@/lib/i18n";
import type { PageMeta, SectionMeta } from "@/lib/types";

interface StudySidebarProps {
  sections: SectionMeta[];
  pages: PageMeta[];
  currentPageNumber: number | null;
  isReviewActive: boolean;
  onSelectPage: (pageNumber: number) => void;
  onSelectReview: () => void;
}

export default function StudySidebar({ sections, pages, currentPageNumber, isReviewActive, onSelectPage, onSelectReview }: StudySidebarProps) {
  const { t } = useLanguage();
  const pagesByNumber = useMemo(() => new Map(pages.map((page) => [page.pageNumber, page])), [pages]);
  const sectionByPage = useMemo(() => new Map(sections.flatMap((section) => section.pageNumbers.map((num) => [num, section]))), [sections]);
  const flatPageNumbers = useMemo(() => sections.flatMap((section) => section.pageNumbers), [sections]);

  const activeItemRef = useRef<HTMLButtonElement>(null);

  // Keep the current page in view when it changes via Previous/Next or the
  // final-review toggle, without fighting the user's own scroll otherwise.
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentPageNumber]);

  return (
    <aside className="sticky top-6 flex h-[calc(100vh-9rem)] flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {flatPageNumbers.map((num) => {
          const page = pagesByNumber.get(num);
          const section = sectionByPage.get(num);
          const isActive = !isReviewActive && currentPageNumber === num;
          return (
            <button
              key={num}
              ref={isActive ? activeItemRef : undefined}
              onClick={() => onSelectPage(num)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${isActive ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-300"}`}
            >
              {page?.thumbnailDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.thumbnailDataUrl} alt={t("common.pageNumber", { num })} className="h-12 w-16 flex-shrink-0 rounded-lg border border-slate-200 object-cover" />
              ) : (
                <div className="h-12 w-16 flex-shrink-0 rounded-lg bg-slate-100" />
              )}
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-700">{t("common.pageNumber", { num })}</span>
                {section && <span className="block truncate text-xs text-slate-400">{section.title}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={onSelectReview}
        className={`flex flex-shrink-0 items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-semibold transition ${isReviewActive ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"}`}
      >
        {t("sidebar.finalReview")}
      </button>
    </aside>
  );
}

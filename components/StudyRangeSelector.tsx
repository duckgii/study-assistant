"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import type { PageMeta, SectionMeta } from "@/lib/types";

interface StudyRangeSelectorProps {
  filename: string;
  pages: PageMeta[];
  sections: SectionMeta[];
  onConfirm: (selectedSectionIds: string[]) => void;
}

interface DragState {
  anchorIndex: number;
  mode: "select" | "deselect";
  preDragSelected: Set<string>;
}

export default function StudyRangeSelector({ filename, pages, sections, onConfirm }: StudyRangeSelectorProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string[]>(sections.length > 0 ? [sections[0].id] : []);
  const dragRef = useRef<DragState | null>(null);

  // End a drag no matter where the pointer is released, including outside the list.
  useEffect(() => {
    function endDrag() {
      dragRef.current = null;
    }
    window.addEventListener("mouseup", endDrag);
    return () => window.removeEventListener("mouseup", endDrag);
  }, []);

  // Applies the active drag's mode to every row between its anchor and the
  // row currently under the pointer, leaving everything outside that span at
  // whatever it was before the drag started — so dragging back over rows you
  // already swept undoes them instead of leaving them stuck selected.
  function applyDrag(currentIndex: number) {
    const drag = dragRef.current;
    if (!drag) return;
    const from = Math.min(drag.anchorIndex, currentIndex);
    const to = Math.max(drag.anchorIndex, currentIndex);
    const next = new Set(drag.preDragSelected);
    sections.forEach((section, index) => {
      if (index < from || index > to) return;
      if (drag.mode === "select") next.add(section.id);
      else next.delete(section.id);
    });
    setSelected(Array.from(next));
  }

  function handleRowMouseDown(index: number) {
    const preDragSelected = new Set(selected);
    const mode: DragState["mode"] = preDragSelected.has(sections[index].id) ? "deselect" : "select";
    dragRef.current = { anchorIndex: index, mode, preDragSelected };
    applyDrag(index);
  }

  function handleRowMouseEnter(index: number) {
    if (!dragRef.current) return;
    applyDrag(index);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className="flex max-h-[calc(100vh-6rem)] flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">{t("rangeSelector.preview")}</p>
        <h3 className="mt-2 truncate text-lg font-semibold text-slate-900">{filename}</h3>

        {pages.length === 0 ? (
          <div className="mt-4 flex aspect-[3/4] w-full items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">{t("rangeSelector.noPreview")}</div>
        ) : (
          <div className="mt-4 -mr-2 flex-1 space-y-3 overflow-y-auto pr-2">
            {pages.map((page) => (
              <div key={page.pageNumber} className="relative">
                {page.thumbnailDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={page.thumbnailDataUrl} alt={t("common.pageNumber", { num: page.pageNumber })} className="w-full rounded-2xl border border-slate-200 object-contain" />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">{t("common.pageNumber", { num: page.pageNumber })}</div>
                )}
                <span className="absolute bottom-2 right-2 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-semibold text-white">{page.pageNumber}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">{t("rangeSelector.step")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{t("rangeSelector.title")}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("rangeSelector.description")}</p>

        <div className="mt-6 select-none space-y-2">
          {sections.map((section, index) => (
            <label
              key={section.id}
              onMouseDown={(event) => {
                event.preventDefault();
                handleRowMouseDown(index);
              }}
              onMouseEnter={() => handleRowMouseEnter(index)}
              className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${selected.includes(section.id) ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}
            >
              <span className="font-medium text-slate-800">{section.title}</span>
              <span className="flex items-center gap-3 text-xs text-slate-500">
                {section.pageNumbers.length === 1
                  ? t("rangeSelector.pageCountSingular", { count: section.pageNumbers.length })
                  : t("rangeSelector.pageCountPlural", { count: section.pageNumbers.length })}
                <input type="checkbox" checked={selected.includes(section.id)} readOnly className="pointer-events-none" />
              </span>
            </label>
          ))}
        </div>

        <button
          onClick={() => onConfirm(selected)}
          disabled={selected.length === 0}
          className="mt-8 w-full rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t("rangeSelector.startStudying")}
        </button>
      </div>
    </div>
  );
}

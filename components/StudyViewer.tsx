"use client";

import { useLanguage } from "@/lib/i18n";
import type { ExplanationData, PageMeta, QuizItem, SectionMeta } from "@/lib/types";
import AIExplanationCard from "./AIExplanationCard";
import QuizCard from "./QuizCard";
import ProgressBar from "./ProgressBar";

interface StudyViewerProps {
  page: PageMeta;
  section: SectionMeta;
  pageIndexInRange: number;
  totalPagesInRange: number;
  imageDataUrl: string | null;
  isImageLoading: boolean;
  explanation: ExplanationData | null;
  isExplanationLoading: boolean;
  pageNote: string | null;
  quiz: QuizItem[] | null;
  isQuizLoading: boolean;
  isLastPageOfSection: boolean;
  quizAnswers: Record<string, string>;
  onQuizAnswerChange: (questionId: string, value: string) => void;
  onAddMoreQuiz: () => void;
  isAddingMoreQuiz: boolean;
  noMoreQuizAvailable: boolean;
  pageQuiz: QuizItem[] | null | undefined;
  isGeneratingPageQuiz: boolean;
  pageQuizAnswers: Record<string, string>;
  onPageQuizAnswerChange: (questionId: string, value: string) => void;
  onGeneratePageQuiz: () => void;
  onAddMorePageQuiz: () => void;
  isAddingMorePageQuiz: boolean;
  noMorePageQuizAvailable: boolean;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export default function StudyViewer({
  page,
  section,
  pageIndexInRange,
  totalPagesInRange,
  imageDataUrl,
  isImageLoading,
  explanation,
  isExplanationLoading,
  pageNote,
  quiz,
  isQuizLoading,
  isLastPageOfSection,
  quizAnswers,
  onQuizAnswerChange,
  onAddMoreQuiz,
  isAddingMoreQuiz,
  noMoreQuizAvailable,
  pageQuiz,
  isGeneratingPageQuiz,
  pageQuizAnswers,
  onPageQuizAnswerChange,
  onGeneratePageQuiz,
  onAddMorePageQuiz,
  isAddingMorePageQuiz,
  noMorePageQuizAvailable,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: StudyViewerProps) {
  const { t } = useLanguage();
  // quiz === null once loaded means the content gate judged this section too
  // trivial for a quiz — skip the block entirely rather than showing an empty one.
  const showQuizBlock = isLastPageOfSection && (isQuizLoading || quiz !== null);

  return (
    <div className="flex h-full flex-col gap-6">
      <ProgressBar current={pageIndexInRange} total={totalPagesInRange} label={t("viewer.pageProgress", { current: pageIndexInRange, total: totalPagesInRange })} />

      <div className="relative flex h-[70vh] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label={t("viewer.previous")}
          className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white"
        >
          ‹
        </button>
        <button
          onClick={onNext}
          disabled={!canGoNext}
          aria-label={t("viewer.next")}
          className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white"
        >
          ›
        </button>

        {isImageLoading && !imageDataUrl ? (
          <div className="flex aspect-[4/3] max-h-full w-full max-w-3xl items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">{t("viewer.renderingPage")}</div>
        ) : imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageDataUrl}
            alt={t("common.pageNumber", { num: page.pageNumber })}
            className="max-h-full w-full max-w-3xl rounded-2xl border border-slate-100 object-contain shadow-sm"
          />
        ) : (
          <div className="flex aspect-[4/3] max-h-full w-full max-w-3xl items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400">
            {t("viewer.cannotRender")}
          </div>
        )}
      </div>

      <AIExplanationCard
        sectionTitle={section.title}
        explanation={explanation}
        isLoading={isExplanationLoading}
        pageNumber={page.pageNumber}
        pageNote={pageNote}
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">{t("viewer.pageQuizTitle")}</h3>

        {pageQuiz === undefined ? (
          <button
            onClick={onGeneratePageQuiz}
            disabled={isGeneratingPageQuiz}
            className="mt-4 w-full rounded-2xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
          >
            {isGeneratingPageQuiz ? t("viewer.generatingPageQuiz") : t("viewer.makeQuizForPage")}
          </button>
        ) : pageQuiz === null ? (
          <p className="mt-2 text-sm text-slate-500">{t("viewer.pageQuizUnavailable")}</p>
        ) : (
          <>
            <div className="mt-4 space-y-4">
              {pageQuiz.map((item, index) => (
                <QuizCard
                  key={item.id}
                  item={item}
                  index={index}
                  value={pageQuizAnswers[item.id]}
                  onChange={(value) => onPageQuizAnswerChange(item.id, value)}
                  revealMode="immediate"
                />
              ))}
            </div>

            <button
              onClick={onAddMorePageQuiz}
              disabled={isAddingMorePageQuiz}
              className="mt-4 w-full rounded-2xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
            >
              {isAddingMorePageQuiz ? t("common.generatingMore") : noMorePageQuizAvailable ? t("viewer.noMorePage") : t("common.addMoreQuestions")}
            </button>
          </>
        )}
      </div>

      {showQuizBlock && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{t("viewer.conceptCheck", { title: section.title })}</h3>
          <p className="mt-1 text-sm text-slate-500">{t("viewer.conceptCheckDescription")}</p>
          <div className="mt-4 space-y-4">
            {isQuizLoading && !quiz ? (
              <p className="text-sm text-slate-500">{t("viewer.generatingQuiz")}</p>
            ) : (
              quiz?.map((item, index) => (
                <QuizCard key={item.id} item={item} index={index} value={quizAnswers[item.id]} onChange={(value) => onQuizAnswerChange(item.id, value)} revealMode="immediate" />
              ))
            )}
          </div>

          {quiz && quiz.length > 0 && (
            <button
              onClick={onAddMoreQuiz}
              disabled={isAddingMoreQuiz}
              className="mt-4 w-full rounded-2xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
            >
              {isAddingMoreQuiz ? t("common.generatingMore") : noMoreQuizAvailable ? t("viewer.noMoreSection") : t("common.addMoreQuestions")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

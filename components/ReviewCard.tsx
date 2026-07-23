"use client";

import { useLanguage } from "@/lib/i18n";
import type { QuizItem } from "@/lib/types";
import QuizCard from "./QuizCard";

interface ReviewCardProps {
  quiz: QuizItem[];
  isLoading: boolean;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  score: number | null;
  onSubmit: () => void;
  revealedQuestionIds: Set<string>;
  onAddMoreQuestions: () => void;
  isAddingMore: boolean;
  noMoreAvailable: boolean;
}

export default function ReviewCard({
  quiz,
  isLoading,
  answers,
  onAnswerChange,
  score,
  onSubmit,
  revealedQuestionIds,
  onAddMoreQuestions,
  isAddingMore,
  noMoreAvailable,
}: ReviewCardProps) {
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-600">{t("review.title")}</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">{t("review.heading")}</h2>
        <p className="mt-2 text-sm text-slate-600">{t("review.description")}</p>
      </div>

      {isLoading && quiz.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">{t("review.generating")}</div>
      ) : (
        <div className="space-y-4">
          {quiz.map((item, index) => (
            <QuizCard key={item.id} item={item} index={index} value={answers[item.id]} onChange={(value) => onAnswerChange(item.id, value)} revealMode="deferred" revealed={revealedQuestionIds.has(item.id)} />
          ))}

          {quiz.length > 0 && (
            <button
              onClick={onAddMoreQuestions}
              disabled={isAddingMore}
              className="w-full rounded-2xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50"
            >
              {isAddingMore ? t("common.generatingMore") : noMoreAvailable ? t("review.noMoreRange") : t("common.addMoreQuestions")}
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <button onClick={onSubmit} disabled={quiz.length === 0} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {t("review.submit")}
        </button>
        {score !== null && <p className="text-lg font-semibold text-green-700">{t("review.score", { score })}</p>}
      </div>
    </div>
  );
}

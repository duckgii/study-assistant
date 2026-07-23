"use client";

import { useLanguage, type TranslationKey } from "@/lib/i18n";
import type { QuizItem } from "@/lib/types";

interface QuizCardProps {
  item: QuizItem;
  index: number;
  value: string | undefined;
  onChange: (value: string) => void;
  revealMode: "immediate" | "deferred";
  revealed?: boolean;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  hard: "bg-red-50 text-red-700",
};

const DIFFICULTY_LABEL_KEY: Record<string, TranslationKey> = {
  easy: "quiz.difficultyEasy",
  medium: "quiz.difficultyMedium",
  hard: "quiz.difficultyHard",
};

export default function QuizCard({ item, index, value, onChange, revealMode, revealed }: QuizCardProps) {
  const { t } = useLanguage();
  const showExplanation = revealMode === "immediate" ? Boolean(value) : Boolean(revealed);
  const isGraded = item.type !== "short-answer";
  const isCorrect = isGraded && value !== undefined && value.trim().toLowerCase() === item.correctAnswer.trim().toLowerCase();

  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-800">
          {index + 1}. {item.question}
        </p>
        <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${DIFFICULTY_STYLES[item.difficulty] || "bg-slate-100 text-slate-600"}`}>
          {DIFFICULTY_LABEL_KEY[item.difficulty] ? t(DIFFICULTY_LABEL_KEY[item.difficulty]) : item.difficulty}
        </span>
      </div>

      {item.type === "multiple-choice" && item.options && (
        <div className="mt-3 space-y-2">
          {item.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-slate-600">
              <input type="radio" name={item.id} value={option} checked={value === option} onChange={(event) => onChange(event.target.value)} />
              {option}
            </label>
          ))}
        </div>
      )}

      {item.type === "true-false" && (
        <div className="mt-3 flex gap-4 text-sm text-slate-600">
          <label className="flex items-center gap-2">
            <input type="radio" name={item.id} value="True" checked={value === "True"} onChange={(event) => onChange(event.target.value)} />
            {t("quiz.true")}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name={item.id} value="False" checked={value === "False"} onChange={(event) => onChange(event.target.value)} />
            {t("quiz.false")}
          </label>
        </div>
      )}

      {item.type === "short-answer" && (
        <input
          defaultValue={value}
          className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          placeholder={t("quiz.typeAnswer")}
          onBlur={(event) => onChange(event.target.value)}
        />
      )}

      {showExplanation && (
        <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${isGraded ? (isCorrect ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800") : "bg-slate-50 text-slate-600"}`}>
          <span className="font-semibold">
            {isGraded ? (isCorrect ? t("quiz.correct") : t("quiz.correctAnswerPrefix", { answer: item.correctAnswer })) : t("quiz.modelAnswer")}
          </span>
          {item.explanation}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import { useLanguage } from "@/lib/i18n";

interface FeedbackItem {
  id: string;
  documentTitle: string;
  sectionTitle: string | null;
  pageNumber: number;
  message: string;
  createdAt: string;
  user: { name: string | null; email: string | null };
}

interface FeedbackListClientProps {
  user: { name?: string | null; image?: string | null };
}

export default function FeedbackListClient({ user }: FeedbackListClientProps) {
  const { t } = useLanguage();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/feedback")
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setFeedbacks(data.feedbacks || []);
      })
      .catch(() => {
        if (!cancelled) setError(t("feedbackAdmin.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <AppHeader title={t("feedbackAdmin.title")} subtitle={t("feedbackAdmin.subtitle")} user={user} />

        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {feedbacks === null && !error ? (
          <p className="text-sm text-slate-500">{t("feedbackAdmin.loading")}</p>
        ) : feedbacks && feedbacks.length === 0 ? (
          <p className="text-sm text-slate-500">{t("feedbackAdmin.empty")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {feedbacks?.map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {item.documentTitle} · {t("feedbackAdmin.page", { page: item.pageNumber })}
                    {item.sectionTitle ? ` · ${item.sectionTitle}` : ""}
                  </span>
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-900">{item.message}</p>
                <p className="mt-3 text-xs text-slate-400">
                  {item.user.name || t("feedbackAdmin.unknownUser")} ({item.user.email || "-"})
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

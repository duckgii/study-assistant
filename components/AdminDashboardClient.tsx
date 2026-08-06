"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "./AppHeader";
import { useLanguage } from "@/lib/i18n";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  documentCount: number;
  lastActive: string | null;
}

interface FeedbackRow {
  id: string;
  documentTitle: string;
  sectionTitle: string | null;
  pageNumber: number;
  message: string;
  createdAt: string;
  user: { name: string | null; email: string | null };
}

interface AdminStats {
  totalUsers: number;
  uploaderCount: number;
  uploaderPercentage: number;
  totalDocuments: number;
  totalFeedback: number;
  users: UserRow[];
  recentFeedback: FeedbackRow[];
}

interface AdminDashboardClientProps {
  user: { name?: string | null; image?: string | null };
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminDashboardClient({ user }: AdminDashboardClientProps) {
  const { t } = useLanguage();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats")
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("adminDashboard.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <AppHeader title={t("adminDashboard.title")} subtitle={t("adminDashboard.subtitle")} user={user} />

        {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {stats === null && !error ? (
          <p className="text-sm text-slate-500">{t("adminDashboard.loading")}</p>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile label={t("adminDashboard.totalUsers")} value={String(stats.totalUsers)} />
              <StatTile label={t("adminDashboard.uploaders")} value={t("adminDashboard.uploadersValue", { count: stats.uploaderCount, percentage: stats.uploaderPercentage })} />
              <StatTile label={t("adminDashboard.totalDocuments")} value={String(stats.totalDocuments)} />
              <StatTile label={t("adminDashboard.totalFeedback")} value={String(stats.totalFeedback)} />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">{t("adminDashboard.usersTitle")}</h3>
              {stats.users.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">{t("adminDashboard.usersEmpty")}</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="pb-2 pr-4">{t("adminDashboard.columnUser")}</th>
                        <th className="pb-2 pr-4">{t("adminDashboard.columnDocuments")}</th>
                        <th className="pb-2">{t("adminDashboard.columnLastActive")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.users.map((row) => (
                        <tr key={row.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 pr-4">
                            <div className="font-medium text-slate-800">{row.name || t("feedbackAdmin.unknownUser")}</div>
                            <div className="text-xs text-slate-400">{row.email || "-"}</div>
                          </td>
                          <td className="py-2 pr-4 text-slate-700">{row.documentCount}</td>
                          <td className="py-2 text-slate-500">{row.lastActive ? new Date(row.lastActive).toLocaleString() : t("adminDashboard.neverActive")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">{t("adminDashboard.recentFeedbackTitle")}</h3>
                <Link href="/feedback" className="text-sm font-semibold text-blue-600 hover:underline">
                  {t("adminDashboard.viewAllFeedback")}
                </Link>
              </div>
              {stats.recentFeedback.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">{t("adminDashboard.recentFeedbackEmpty")}</p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {stats.recentFeedback.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {item.documentTitle} · p.{item.pageNumber}
                          {item.sectionTitle ? ` · ${item.sectionTitle}` : ""}
                        </span>
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-900">{item.message}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {item.user.name || t("feedbackAdmin.unknownUser")} ({item.user.email || "-"})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

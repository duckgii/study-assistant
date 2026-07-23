"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AppHeader from "./AppHeader";
import { CONTACT } from "@/lib/contact";
import { useLanguage } from "@/lib/i18n";

interface ContactPageClientProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

export default function ContactPageClient({ user }: ContactPageClientProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSending(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : t("contact.sendFailed"));
        return;
      }
      setSent(true);
      setMessage("");
    } catch {
      setError(t("contact.sendFailed"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <AppHeader title={t("contact.title")} subtitle={t("contact.subtitle")} user={user} />

        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{t("contact.reachMe")}</h3>
          <p className="mt-2 text-sm text-slate-600">{t("contact.reachMeDescription")}</p>
          <ul className="mt-5 space-y-3 text-sm">
            <li>
              <span className="font-semibold text-slate-700">{t("contact.emailLabel")}: </span>
              <a className="text-blue-600 hover:underline" href={`mailto:${CONTACT.email}`}>
                {CONTACT.email}
              </a>
            </li>
            <li>
              <span className="font-semibold text-slate-700">GitHub: </span>
              <a className="text-blue-600 hover:underline" href={CONTACT.github} target="_blank" rel="noreferrer">
                {CONTACT.githubLabel}
              </a>
            </li>
            <li>
              <span className="font-semibold text-slate-700">LinkedIn: </span>
              <a className="text-blue-600 hover:underline" href={CONTACT.linkedin} target="_blank" rel="noreferrer">
                {CONTACT.linkedinLabel}
              </a>
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{t("contact.formTitle")}</h3>
          <p className="mt-2 text-sm text-slate-600">{t("contact.formDescription")}</p>

          {sent ? (
            <div className="mt-6 rounded-2xl bg-green-50 px-4 py-4 text-sm text-green-700">
              {t("contact.sent")}
              <div className="mt-3">
                <Link href="/" className="font-semibold text-green-800 hover:underline">
                  {t("contact.backHome")}
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">{t("contact.name")}</span>
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">{t("contact.email")}</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">{t("contact.message")}</span>
                <textarea
                  required
                  rows={7}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t("contact.messagePlaceholder")}
                  className="resize-y rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
                />
              </label>

              {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <button
                type="submit"
                disabled={isSending}
                className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSending ? t("contact.sending") : t("contact.send")}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/lib/i18n";

interface FeedbackButtonProps {
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  sectionTitle: string;
}

export default function FeedbackButton({ documentId, documentTitle, pageNumber, sectionTitle }: FeedbackButtonProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function closeModal() {
    setIsOpen(false);
    setMessage("");
    setError(null);
    setSent(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, documentTitle, pageNumber, sectionTitle, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : t("feedback.sendFailed"));
        return;
      }
      setSent(true);
      setMessage("");
    } catch {
      setError(t("feedback.sendFailed"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex shrink-0 items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        {t("feedback.button")}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4" onClick={closeModal}>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">{t("feedback.title")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("feedback.pageContext", { page: pageNumber, section: sectionTitle })}</p>

            {sent ? (
              <div className="mt-5 rounded-2xl bg-green-50 px-4 py-4 text-sm text-green-700">
                {t("feedback.sent")}
                <div className="mt-3">
                  <button onClick={closeModal} className="font-semibold text-green-800 hover:underline">
                    {t("feedback.close")}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
                <textarea
                  required
                  autoFocus
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={t("feedback.messagePlaceholder")}
                  className="resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
                />

                {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {t("feedback.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isSending ? t("feedback.sending") : t("feedback.send")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

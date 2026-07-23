"use client";

import { FormEvent, useState } from "react";
import { useLanguage } from "@/lib/i18n";

// Global bottom bar rendered in the root layout, outside every page's own
// body content, so feedback is reachable from any screen (including /login).
export default function Footer() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function toggleOpen() {
    setOpen((value) => !value);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    setError(null);
    setIsSending(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : t("footer.sendFailed"));
        return;
      }
      setSent(true);
      setMessage("");
    } catch {
      setError(t("footer.sendFailed"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-end px-6 py-2">
        <button
          onClick={toggleOpen}
          className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {t("footer.feedback")}
        </button>
      </div>

      {open && (
        <div className="absolute bottom-full right-6 mb-2 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{t("footer.title")}</h3>
            <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setOpen(false)}>
              {t("footer.close")}
            </button>
          </div>

          {sent ? (
            <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{t("footer.sent")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
              <p className="text-xs text-slate-500">{t("footer.description")}</p>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={t("footer.messagePlaceholder")}
                className="resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("footer.emailOptional")}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />

              {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

              <button
                type="submit"
                disabled={isSending}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSending ? t("footer.sending") : t("footer.send")}
              </button>
            </form>
          )}
        </div>
      )}
    </footer>
  );
}

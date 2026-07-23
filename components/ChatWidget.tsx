"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n";
import type { PageMeta } from "@/lib/types";

interface ChatWidgetProps {
  contextTitle: string;
  contextPages: PageMeta[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function ChatWidget({ contextTitle, contextPages }: ChatWidgetProps) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit() {
    const question = input.trim();
    if (!question) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sectionTitle: contextTitle, pages: contextPages, language }),
      });
      const payload = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: payload.answer || t("chat.noAnswer") }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("chat.error") }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button className="fixed bottom-6 right-6 z-40 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg" onClick={() => setOpen((value) => !value)}>
        {t("chat.askAi")}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[360px] rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">{t("chat.studyChat")}</h3>
            <button className="text-sm text-slate-500" onClick={() => setOpen(false)}>
              {t("chat.close")}
            </button>
          </div>
          <div className="mt-3 max-h-[280px] space-y-2 overflow-auto">
            {messages.length === 0 && <p className="text-sm text-slate-500">{t("chat.askAnything", { title: contextTitle })}</p>}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-slate-800"}`}>
                {message.content}
              </div>
            ))}
            {isSending && <div className="rounded-2xl bg-blue-50 px-3 py-2 text-sm text-slate-500">{t("chat.thinking")}</div>}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder={t("chat.askQuestionPlaceholder")}
            />
            <button className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white" onClick={handleSubmit}>
              {t("chat.send")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

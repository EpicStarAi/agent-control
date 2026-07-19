"use client";

import { useState } from "react";
import { Bot, Loader2, Sparkles, X } from "lucide-react";
import type { AiStatus, TgChat, TgMessage } from "./types";

// AI-operator panel. Lives as a separate right-hand panel so it never disrupts
// the familiar two-pane messenger layout. It can only PREPARE a draft; applying
// it just fills the composer, and the human still presses send (which passes the
// server approval gate). The operator never sends on its own.
export function OperatorPanel({
  chat,
  aiStatus,
  messages,
  onRequestSuggestion,
  onUseDraft,
  onClose,
}: {
  chat: TgChat | null;
  aiStatus: AiStatus | null;
  messages: TgMessage[];
  onRequestSuggestion: (chatId: string, chatTitle: string | null, history: TgMessage[]) => Promise<{ draft: string | null; error: string | null }>;
  onUseDraft: (text: string) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const model = aiStatus?.controlModel ?? aiStatus?.model ?? null;
  const online = aiStatus && aiStatus.runtime !== "backend_offline";

  async function suggest() {
    if (!chat) return;
    setBusy(true);
    setError(null);
    const result = await onRequestSuggestion(chat.id, chat.title, messages);
    setBusy(false);
    if (result.draft) {
      setDraft(result.draft);
    } else {
      setError(result.error ?? "Не удалось получить черновик.");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ background: "var(--tgx-sidebar-bg)" }}>
      <div className="flex shrink-0 items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--tgx-border)" }}>
        <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: "var(--tgx-hover)" }}>
          <Bot className="h-4 w-4" style={{ color: "var(--tgx-accent)" }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">AI-оператор</div>
          <div className="truncate text-[11.5px]" style={{ color: "var(--tgx-text-faint)" }}>
            {online ? (model ? `модель: ${model}` : "готов") : "бэкенд недоступен"}
          </div>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full" style={{ color: "var(--tgx-text-secondary)" }} aria-label="Закрыть панель">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto tgx-scroll px-4 py-4">
        {!chat ? (
          <div className="mt-8 text-center text-[13px]" style={{ color: "var(--tgx-text-faint)" }}>
            Откройте чат, чтобы подготовить черновик ответа.
          </div>
        ) : (
          <>
            <div className="rounded-xl px-3 py-3 text-[13px] leading-relaxed" style={{ background: "var(--tgx-hover)", color: "var(--tgx-text-secondary)" }}>
              Оператор предлагает <strong style={{ color: "var(--tgx-text)" }}>черновик</strong> ответа на основе истории
              чата «{chat.title}». Автоматической отправки нет — вы проверяете текст и отправляете вручную.
            </div>

            <button
              onClick={suggest}
              disabled={busy}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold disabled:opacity-50"
              style={{ background: "var(--tgx-accent-strong)", color: "#ffffff" }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Предложить ответ
            </button>

            {error ? (
              <div className="mt-3 rounded-xl px-3 py-2 text-[12.5px]" style={{ background: "rgba(224,90,79,0.12)", color: "var(--tgx-danger)" }}>
                {error}
              </div>
            ) : null}

            {draft ? (
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--tgx-text-faint)" }}>
                  Черновик
                </div>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={6}
                  className="w-full resize-y rounded-xl px-3 py-2 text-[13.5px] outline-none tgx-scroll"
                  style={{ background: "var(--tgx-app-bg)", color: "var(--tgx-text)", border: "1px solid var(--tgx-border)" }}
                />
                <button
                  onClick={() => onUseDraft(draft)}
                  className="mt-2 w-full rounded-xl px-3 py-2 text-[13px] font-semibold"
                  style={{ background: "var(--tgx-hover)", color: "var(--tgx-text)" }}
                >
                  Перенести в поле ввода
                </button>
                <div className="mt-2 text-[11.5px]" style={{ color: "var(--tgx-text-faint)" }}>
                  После переноса проверьте текст и нажмите «Отправить» — сообщение пройдёт серверный approval-гейт.
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

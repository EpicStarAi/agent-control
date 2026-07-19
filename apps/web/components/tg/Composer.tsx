"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, ShieldCheck } from "lucide-react";
import type { SendResult } from "./types";

// Message composer. Enter sends, Shift+Enter inserts a newline. Sending always
// goes through /api/telegram/send, which the server denies unless a server-issued
// approval exists — the composer can never bypass that gate. The result message
// (including the honest "mutations disabled" denial) is surfaced verbatim.
export function Composer({
  disabled,
  draft,
  onDraftChange,
  onSend,
  placeholder,
}: {
  disabled: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: (text: string) => Promise<SendResult>;
  placeholder: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>("");

  // Auto-grow the textarea up to a cap.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  async function submit() {
    const text = draft.trim();
    if (!text || busy || disabled) return;
    setBusy(true);
    setNotice("Отправка через approval-гейт…");
    const result = await onSend(text);
    setBusy(false);
    if (result.sent) {
      onDraftChange("");
      setNotice("Отправлено.");
    } else {
      setNotice(result.message ?? "Отправка отклонена approval-гейтом.");
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div className="shrink-0 px-3 pb-3 pt-2" style={{ background: "var(--tgx-header-bg)", borderTop: "1px solid var(--tgx-border)" }}>
      {notice ? (
        <div className="mb-2 flex items-start gap-2 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "var(--tgx-hover)", color: "var(--tgx-text-secondary)" }}>
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--tgx-accent)" }} />
          <span>{notice}</span>
        </div>
      ) : null}
      <div className="flex items-end gap-2 rounded-2xl px-3 py-1.5" style={{ background: "var(--tgx-sidebar-elevated)", border: "1px solid var(--tgx-border)" }}>
        <textarea
          ref={textareaRef}
          value={draft}
          disabled={disabled}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={disabled ? "Отправка недоступна для этого чата" : placeholder}
          className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent py-1 text-[14.5px] outline-none tgx-scroll placeholder:opacity-60 disabled:opacity-50"
          style={{ color: "var(--tgx-text)" }}
        />
        <button
          onClick={submit}
          disabled={disabled || busy || !draft.trim()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-opacity disabled:opacity-40"
          style={{ background: "var(--tgx-accent-strong)", color: "#ffffff" }}
          aria-label="Отправить"
          title="Отправить (Enter). Перенос строки — Shift+Enter"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-1 px-1 text-[11px]" style={{ color: "var(--tgx-text-faint)" }}>
        Enter — отправить · Shift+Enter — новая строка · отправка проходит серверный approval-гейт
      </div>
    </div>
  );
}

/* Phase-3 verification harness (NEW file -> syncs fully into sandbox mount).
   Contains verbatim copies of the new EPIC STAR UI components so tsc can
   validate the trickiest new JSX/TS in isolation. Not imported by the app. */
import { Brain, CheckCircle2, Loader2, MessageCircle, Paperclip, RefreshCw, Send, ShieldCheck, Sparkles, X } from "lucide-react";

type TelegramMessage = {
  id: string;
  chatId: string;
  date?: string | null;
  isOutgoing?: boolean;
  content: string;
  authorSignature?: string | null;
};
type TelegramChat = {
  id: string;
  title: string;
  type?: string;
  username?: string | null;
  photoSmallFileId?: string | null;
  unreadCount?: number;
  lastMessage?: TelegramMessage | null;
};
type AiStatus = {
  runtime?: string;
  provider?: string;
  model?: string;
  sendMode?: string;
  message?: string;
};

function formatMessageTime(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function EpicStarMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="EPIC☠STAR">
      <defs>
        <linearGradient id="epicStarGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff6b81" />
          <stop offset="55%" stopColor="#ff2d55" />
          <stop offset="100%" stopColor="#e11d3f" />
        </linearGradient>
      </defs>
      <path
        d="M24 3l5.5 11.1 12.2 1.8-8.8 8.6 2.1 12.2L24 31.9 11 36.7l2.1-12.2-8.8-8.6 12.2-1.8L24 3z"
        fill="none"
        stroke="url(#epicStarGrad)"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path
        d="M24 13c-4.5 0-8 3.4-8 8 0 2.9 1.4 5 3.4 6.3v3.1c0 1 .8 1.8 1.8 1.8h5.6c1 0 1.8-.8 1.8-1.8v-3.1c2-1.3 3.4-3.4 3.4-6.3 0-4.6-3.5-8-8-8z"
        fill="url(#epicStarGrad)"
      />
      <circle cx="20.5" cy="20.8" r="2.3" fill="#0a0b0f" />
      <circle cx="27.5" cy="20.8" r="2.3" fill="#0a0b0f" />
      <path d="M22.5 26h3M23 26v3M25 26v3" stroke="#0a0b0f" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function BrandBar() {
  return (
    <div className="flex items-center gap-2.5 border-b border-tg-line bg-tg-header/80 px-4 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-epic-ink ring-1 ring-tg-line epic-glow">
        <EpicStarMark className="h-7 w-7" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-bold tracking-wide epic-title">EPIC☠STAR</div>
        <div className="truncate text-[11px] text-tg-muted">DEEP INSIDE · EPIC☠️GRAM</div>
      </div>
      <span className="shrink-0 rounded-full border border-tg-line bg-tg-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tg-accent">
        client
      </span>
    </div>
  );
}

function isNoticeError(notice: string) {
  const lowered = notice.toLowerCase();
  return ["не удалось", "недоступ", "ошибка", "не отправ", "не принят", "не запуст"].some((token) => lowered.includes(token));
}

function TelegramChatWorkspace({
  chat,
  messages,
  draft,
  setDraft,
  approvalNotice,
  onRefreshMessages,
  onSuggest,
  onSendApproved,
  aiBusy,
  sendBusy,
  aiStatus,
  messagesLoading,
  memoryCount
}: {
  chat: TelegramChat;
  messages: TelegramMessage[];
  draft: string;
  setDraft: (value: string) => void;
  approvalNotice: string;
  onRefreshMessages: () => void;
  onSuggest: () => void;
  onSendApproved: () => void;
  aiBusy: boolean;
  sendBusy: boolean;
  aiStatus: AiStatus | null;
  messagesLoading: boolean;
  memoryCount: number | null;
}) {
  const brainOnline = aiStatus?.runtime === "ready";
  const noticeIsError = approvalNotice ? isNoticeError(approvalNotice) : false;

  return (
    <div className="relative mx-auto flex h-full max-w-3xl flex-col gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="rounded-full bg-black/30 px-3 py-1 text-xs text-tg-muted">Реальный Telegram-чат · {messages.length} сообщений</div>
        {memoryCount !== null && (
          <div className="flex items-center gap-1.5 rounded-full border border-tg-line bg-black/30 px-3 py-1 text-xs text-tg-accent" title="Персона помнит контекст этого диалога">
            <Brain className="h-3.5 w-3.5" />
            {memoryCount > 0 ? `помнит ${memoryCount} реплик контекста` : "память диалога пуста"}
          </div>
        )}
        <button onClick={onRefreshMessages} className="grid h-7 w-7 place-items-center rounded-full bg-black/30 text-tg-muted hover:bg-tg-hover hover:text-white" aria-label="Обновить историю">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.length === 0 && messagesLoading && (
          <section className="flex items-center gap-3 rounded-2xl border border-tg-line bg-tg-panel p-4 shadow-telegram">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-tg-accent" />
            <p className="text-sm leading-6 text-tg-muted">Загружаем историю из TDLib…</p>
          </section>
        )}
        {messages.length === 0 && !messagesLoading && (
          <section className="rounded-2xl border border-tg-line bg-tg-panel p-5 text-center shadow-telegram">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-tg-bg text-tg-accent">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-3 font-semibold">{chat.title}</h2>
            <p className="mt-2 text-sm leading-6 text-tg-muted">
              История пока пуста или недоступна локально. Напишите первое сообщение — или попросите EPIC☠STAR подсказать черновик ответа.
            </p>
          </section>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.isOutgoing ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[78%] rounded-2xl px-4 py-2 shadow-telegram ${message.isOutgoing ? "bg-tg-active text-white" : "bg-tg-bubble text-tg-text"}`}>
              {message.authorSignature && <div className="mb-1 text-xs font-semibold text-tg-accent">{message.authorSignature}</div>}
              <div className="whitespace-pre-wrap break-words text-sm leading-6">{message.content || "Сообщение без текстового превью"}</div>
              <div className={`mt-1 text-right text-[11px] ${message.isOutgoing ? "text-white/70" : "text-tg-muted"}`}>{formatMessageTime(message.date)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-tg-line bg-tg-panel/90 p-3 shadow-neon">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-tg-text">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-epic-ink ring-1 ring-tg-line epic-glow">
              <EpicStarMark className="h-5 w-5" />
            </span>
            AI-ассистент
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              brainOnline ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-tg-line bg-black/30 text-tg-muted"
            }`}
            title={aiStatus?.message ?? ""}
          >
            <span className={`h-2 w-2 rounded-full ${brainOnline ? "bg-emerald-400 animate-epic-pulse" : "bg-tg-muted"}`} />
            {brainOnline ? `мозг онлайн · ${aiStatus?.provider ?? "ai"}${aiStatus?.model ? ` · ${aiStatus.model}` : ""}` : "мозг оффлайн"}
          </span>
        </div>

        <button
          onClick={onSuggest}
          disabled={aiBusy}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-epic-neon to-epic-ember px-4 py-2.5 text-sm font-semibold text-white shadow-neon transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Сгенерировать черновик ответа EPIC☠STAR"
        >
          {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {aiBusy ? "EPIC☠STAR думает…" : "🤖 Подсказать ответ (EPIC☠STAR)"}
        </button>
        <p className="mt-2 text-center text-[11px] text-tg-muted">AI предлагает — отправляешь ты.</p>
      </div>

      {approvalNotice && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
            noticeIsError ? "border-epic-ember/40 bg-epic-deep/20 text-tg-text" : "border-tg-line bg-tg-panel text-tg-muted"
          }`}
        >
          {noticeIsError ? <X className="mt-0.5 h-4 w-4 shrink-0 text-epic-neon" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-tg-accent" />}
          <span className="leading-6">{approvalNotice}</span>
        </div>
      )}

      <div className="flex items-end gap-2 rounded-2xl border border-tg-line bg-tg-panel p-2 shadow-telegram">
        <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-tg-muted hover:bg-tg-hover hover:text-white" aria-label="Вложение">
          <Paperclip className="h-5 w-5" />
        </button>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={1}
          placeholder="Черновик ответа (можно отредактировать перед отправкой)"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-xl bg-tg-bg px-4 py-2.5 text-sm leading-5 outline-none placeholder:text-tg-muted"
        />
        <button
          onClick={onSendApproved}
          disabled={sendBusy || !draft.trim()}
          className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-tg-blue px-3.5 text-sm font-semibold text-white shadow-neon hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Отправить в Telegram (подтверждение оператора)"
        >
          {sendBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          <span className="hidden sm:inline">Отправить</span>
        </button>
      </div>
      <div className="flex items-start gap-2 px-2 text-xs text-tg-muted">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-tg-accent" />
        <span>
          Approval-гейт: AI только предлагает черновик. Отправка в Telegram — исключительно по вашему клику «Отправить», автоотправки нет
          (EPICGRAM_AI_SEND_MODE={aiStatus?.sendMode ?? "operator_approval_required"}).
        </span>
      </div>
    </div>
  );
}

export { EpicStarMark, BrandBar, TelegramChatWorkspace, isNoticeError };

"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { buildFeed, formatTime } from "./format";
import type { TgChat, TgMessage } from "./types";

function Bubble({
  message,
  firstInGroup,
  lastInGroup,
  showAuthor,
}: {
  message: TgMessage;
  firstInGroup: boolean;
  lastInGroup: boolean;
  showAuthor: boolean;
}) {
  const mine = Boolean(message.isOutgoing);
  const author = message.authorSignature?.trim();

  // Telegram-style corner rounding: the tail corner (bottom-near-side) is only
  // sharpened on the last bubble of a run.
  const radius = mine
    ? `18px 18px ${lastInGroup ? "6px" : "18px"} 18px`
    : `18px 18px 18px ${lastInGroup ? "6px" : "18px"}`;

  return (
    <div
      className="flex w-full px-1"
      style={{
        justifyContent: mine ? "flex-end" : "flex-start",
        marginTop: firstInGroup ? 8 : 2,
      }}
    >
      <div
        className="max-w-[75%] break-words px-3 py-1.5 text-[14.5px] leading-snug shadow-sm"
        style={{
          background: mine ? "var(--tgx-out-bubble)" : "var(--tgx-in-bubble)",
          color: mine ? "var(--tgx-out-text)" : "var(--tgx-in-text)",
          borderRadius: radius,
        }}
      >
        {showAuthor && !mine && author ? (
          <div className="mb-0.5 text-[13px] font-semibold" style={{ color: "var(--tgx-accent)" }}>
            {author}
          </div>
        ) : null}
        <span className="whitespace-pre-wrap align-bottom">{message.content || " "}</span>
        <span
          className="float-right ml-2 mt-1 inline-flex translate-y-0.5 items-center gap-0.5 text-[11px]"
          style={{ color: mine ? "rgba(255,255,255,0.65)" : "var(--tgx-text-faint)" }}
        >
          {formatTime(message.date)}
          {mine ? <Check className="h-3 w-3" aria-label="отправлено" /> : null}
        </span>
      </div>
    </div>
  );
}

export function MessageThread({
  chat,
  messages,
  loading,
  hasMore,
  onLoadOlder,
}: {
  chat: TgChat;
  messages: TgMessage[];
  loading: boolean;
  hasMore: boolean;
  onLoadOlder: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const prevChatId = useRef<string>("");
  const prevCount = useRef<number>(0);
  const isGroupContext = chat.category === "group";

  const feed = buildFeed(messages);

  // Autoscroll: jump to bottom on chat change; smooth-follow when a new message
  // arrives and the user is already near the bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const chatChanged = prevChatId.current !== chat.id;
    const grew = messages.length > prevCount.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;

    if (chatChanged) {
      el.scrollTop = el.scrollHeight;
    } else if (grew && nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    prevChatId.current = chat.id;
    prevCount.current = messages.length;
  }, [chat.id, messages]);

  // Load older history when scrolled to the top.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      if (el.scrollTop < 48 && hasMore && !loading) onLoadOlder();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loading, onLoadOlder]);

  return (
    <div
      ref={scrollRef}
      className="relative min-h-0 flex-1 overflow-y-auto tgx-scroll px-3 py-3 md:px-8"
      style={{
        background: "var(--tgx-chat-bg)",
        backgroundImage: "var(--tgx-pattern)",
      }}
    >
      {hasMore && messages.length > 0 ? (
        <div className="flex justify-center py-2">
          <span className="text-[12px]" style={{ color: "var(--tgx-text-faint)" }}>
            {loading ? "Загрузка истории…" : "Прокрутите вверх, чтобы загрузить историю"}
          </span>
        </div>
      ) : null}

      {messages.length === 0 && loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--tgx-text-faint)" }} />
        </div>
      ) : null}

      {messages.length === 0 && !loading ? (
        <div className="flex h-full items-center justify-center">
          <div
            className="rounded-2xl px-4 py-2 text-center text-[13px]"
            style={{ background: "var(--tgx-date-chip-bg)", color: "var(--tgx-date-chip-text)" }}
          >
            Здесь пока нет сообщений
          </div>
        </div>
      ) : null}

      {feed.map((item) =>
        item.kind === "date" ? (
          <div key={item.id} className="my-3 flex justify-center">
            <span
              className="rounded-full px-3 py-1 text-[12px] font-medium"
              style={{ background: "var(--tgx-date-chip-bg)", color: "var(--tgx-date-chip-text)" }}
            >
              {item.label}
            </span>
          </div>
        ) : (
          <Bubble
            key={item.message.id}
            message={item.message}
            firstInGroup={item.firstInGroup}
            lastInGroup={item.lastInGroup}
            showAuthor={isGroupContext && item.firstInGroup}
          />
        ),
      )}
      <div ref={bottomRef} />
    </div>
  );
}

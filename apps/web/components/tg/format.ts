import type { FolderId, TgChat, TgMessage } from "./types";

// ── Text / identity helpers ────────────────────────────────────────────────

export function initialsFromTitle(title?: string | null): string {
  // Explicit Latin/Cyrillic/digit ranges instead of \p{L}\p{N} + /u so the repo's
  // ES5 TS target accepts it (the Unicode flag requires es6+).
  const clean = (title ?? "").replace(/[^0-9A-Za-zА-Яа-яЁё\s]/g, " ").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0)).join("").toUpperCase() || "?";
}

// Deterministic avatar tint from the chat id/title so each chat keeps a stable
// colour across renders (Telegram assigns one of a small palette per peer).
const AVATAR_TINTS = [
  "#e17076", "#eda86c", "#a695e7", "#7bc862", "#6ec9cb", "#65aadd", "#ee7aae",
];

export function avatarTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

// ── Time / date helpers ─────────────────────────────────────────────────────

const timeFmt = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });
const dayYearFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("ru-RU", { weekday: "short" });

export function formatTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return timeFmt.format(date);
}

// Chat-list timestamp: time today, weekday within a week, else a short date.
export function formatListStamp(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return timeFmt.format(date);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays < 7) return weekdayFmt.format(date);
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
}

// Date-separator label inside the message feed.
export function formatDateSeparator(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Сегодня";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Вчера";
  return date.getFullYear() === now.getFullYear() ? dayFmt.format(date) : dayYearFmt.format(date);
}

function dayKey(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toDateString();
}

// ── Chat preview / classification ───────────────────────────────────────────

export function chatTypeLabel(chat?: TgChat | null): string {
  if (!chat) return "чат";
  if (chat.category === "bot" || chat.isBot) return "бот";
  if (chat.category === "private") return "личный чат";
  if (chat.category === "group") return "группа";
  if (chat.category === "channel" || chat.isChannel) return "канал";
  return "чат";
}

export function lastMessagePreview(chat: TgChat): string {
  const msg = chat.lastMessage;
  if (!msg || !msg.content) return "";
  const prefix = msg.isOutgoing ? "Вы: " : "";
  return `${prefix}${msg.content}`.replace(/\s+/g, " ").trim();
}

export function chatMatchesFolder(chat: TgChat, folder: FolderId): boolean {
  if (folder === "archive") return chat.list === "archive";
  if (chat.list === "archive") return false; // archived chats only show in Archive
  switch (folder) {
    case "all":
      return true;
    case "unread":
      return Boolean(chat.unreadCount) || Boolean(chat.isMarkedAsUnread);
    case "private":
      return chat.category === "private";
    case "groups":
      return chat.category === "group";
    case "channels":
      return chat.category === "channel" || Boolean(chat.isChannel);
    case "bots":
      return chat.category === "bot" || Boolean(chat.isBot);
    default:
      return true;
  }
}

export function chatMatchesSearch(chat: TgChat, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [chat.title, chat.username, chatTypeLabel(chat), chat.lastMessage?.content]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

// ── Message grouping ────────────────────────────────────────────────────────

export type FeedItem =
  | { kind: "date"; id: string; label: string }
  | {
      kind: "message";
      message: TgMessage;
      // first/last in a run of consecutive same-sender messages (for spacing +
      // showing the avatar/name once and the bubble tail on the last).
      firstInGroup: boolean;
      lastInGroup: boolean;
    };

function sameSender(a: TgMessage, b: TgMessage): boolean {
  if (Boolean(a.isOutgoing) !== Boolean(b.isOutgoing)) return false;
  return (a.senderId ?? null) === (b.senderId ?? null);
}

// Turn a flat, chronological message list into a feed of date separators and
// grouped messages.
export function buildFeed(messages: TgMessage[]): FeedItem[] {
  const items: FeedItem[] = [];
  let lastDay = "";
  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    const day = dayKey(message.date);
    if (day && day !== lastDay) {
      items.push({ kind: "date", id: `date-${day}-${message.id}`, label: formatDateSeparator(message.date) });
      lastDay = day;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const firstInGroup =
      !prev || !sameSender(prev, message) || dayKey(prev.date) !== day;
    const lastInGroup = !next || !sameSender(next, message) || dayKey(next.date) !== day;
    items.push({ kind: "message", message, firstInGroup, lastInGroup });
  }
  return items;
}

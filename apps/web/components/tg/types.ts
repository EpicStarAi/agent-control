// Shared types for the Telegram-like client. These mirror the real backend
// contract normalised in services/api/src/tdlib-adapter.mjs (formatChat /
// formatMessage) and surfaced verbatim through /api/telegram/{chats,messages}.
// No field here is invented for display — everything maps to real data.

export type ChatCategory = "private" | "group" | "channel" | "bot" | "chat";

export type TgMessage = {
  id: string;
  chatId: string;
  date?: string | null;
  isOutgoing?: boolean;
  senderId?: string | null;
  content: string;
  authorSignature?: string | null;
};

export type TgChat = {
  id: string;
  title: string;
  type?: string;
  category?: ChatCategory;
  list?: "main" | "archive";
  isChannel?: boolean;
  isBot?: boolean;
  username?: string | null;
  photoSmallFileId?: string | null;
  unreadCount?: number;
  isMarkedAsUnread?: boolean;
  lastReadInboxMessageId?: string | null;
  lastMessage?: TgMessage | null;
  // Optional: only rendered if the backend ever provides it. The current
  // formatChat() does not expose a pin flag, so this stays undefined and the
  // pinned section simply renders nothing (honest — no fabricated pins).
  isPinned?: boolean;
};

export type TgAccount = {
  id?: string;
  displayName?: string | null;
  username?: string | null;
  phoneMasked?: string | null;
};

export type TgStatus = {
  authenticated?: boolean;
  connected?: boolean;
  runtime?: string;
  reason?: string;
  ownerMatched?: boolean;
  activeAccountId?: string | null;
  account?: TgAccount | null;
  accounts?: Array<{ id?: string; authState?: string }>;
  mutationsEnabled?: boolean;
  message?: string;
};

export type AiStatus = {
  runtime?: string;
  provider?: string;
  enabled?: boolean;
  model?: string;
  controlModel?: string;
  sendMode?: string;
  message?: string;
};

export type SendResult = {
  sent?: boolean;
  executed?: boolean;
  mutationsEnabled?: boolean;
  message?: string;
};

export type Theme = "dark" | "light";

export type RightPanel = "none" | "info" | "operator";

// Folder tabs mirror the categories the backend already classifies chats into.
export type FolderId = "all" | "unread" | "private" | "groups" | "channels" | "bots" | "archive";

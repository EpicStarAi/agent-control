/**
 * epic-telegram-runtime-client.ts
 *
 * Server-side bridge between Next.js EPIC Operator API routes
 * and the running EPICGRAM backend (services/api/src/server.mjs).
 *
 * POLICY: This file is server-side only. It never accepts user-controlled
 * base URLs. All account_slot values are validated before use.
 *
 * Account slot contract:
 *   NOVIKOVA  → backend accountId = "main"
 *   Any other → throws POLICY_DENIED
 */

import { enforceTdLibPolicy } from "./epic-tdlib-policy";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Fixed backend URL — NEVER from user request */
const EPICGRAM_API_BASE =
  process.env.EPICGRAM_API_BASE_URL || "http://127.0.0.1:8788";

const ALLOWED_ACCOUNT_SLOTS = new Set(["NOVIKOVA"]);
const BACKEND_ACCOUNT_ID: Record<string, string> = {
  NOVIKOVA: "main",
};

/** Maps our account_slot to the backend's accountId */
function resolveBackendAccountId(accountSlot: string): string {
  if (!ALLOWED_ACCOUNT_SLOTS.has(accountSlot)) {
    const err = new Error(`POLICY_DENIED: account_slot="${accountSlot}" is not allowed. Only ${Array.from(ALLOWED_ACCOUNT_SLOTS).join(", ")} are permitted.`);
    (err as any).code = "POLICY_DENIED";
    (err as any).blocked = true;
    throw err;
  }
  return BACKEND_ACCOUNT_ID[accountSlot] ?? "main";
}

// ─── Internal fetch helper ────────────────────────────────────────────────────

async function backendFetch<T = unknown>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<T> {
  const url = `${EPICGRAM_API_BASE}${path}`;
  const opts: RequestInit = {
    method,
    headers: { "content-type": "application/json" },
    signal,
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const resp = await fetch(url, opts);
  const data = await resp.json() as { message?: string } & T;
  if (!resp.ok) {
    const msg = data?.message ?? `Backend HTTP ${resp.status}`;
    const e = new Error(msg);
    (e as any).status = resp.status;
    throw e;
  }
  return data;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get real Telegram account status via TDLib.
 * Verifies NOVIKOVA authorization state end-to-end.
 */
export async function getAccountStatus(
  accountSlot: string,
  signal?: AbortSignal
): Promise<{
  account_slot: string;
  authorized: boolean;
  authorization_state: string | null;
  connection_state: string | null;
  user_id: string | null;
  display_name: string | null;
  username: string | null;
  phone_masked: string | null;
  account_type: string | null;
  source: string;
  tdlib_version: string | null;
  adapter_message: string;
}> {
  resolveBackendAccountId(accountSlot); // enforces policy
  enforceTdLibPolicy({ account_slot: accountSlot, operation: "account_status" });

  const data = await backendFetch<Record<string, unknown>>(
    "GET",
    "/telegram/status",
    undefined,
    signal
  );

  const accounts = (data.accounts as Array<Record<string, unknown>>) ?? [];
  const primary = accounts[0] ?? {};
  const adapter = (data.adapter as Record<string, unknown>) ?? {};
  const tdlibInfo = (adapter.tdlibInfo as Record<string, string>) ?? {};
  const isReady =
    data.authorizationState === "authorizationStateReady" ||
    primary.status === "ready";

  return {
    account_slot: accountSlot,
    authorized: isReady,
    authorization_state: (data.authorizationState as string | null) ?? null,
    connection_state: isReady ? "authorizationStateReady" : (data.authorizationState as string | null),
    user_id: (primary.id as string | null) ?? null,
    display_name: (primary.displayName as string | null) ?? null,
    username: (primary.username as string | null) ?? null,
    phone_masked: (primary.phoneMasked as string | null) ?? null,
    account_type: (primary.type as string | null) ?? null,
    source: "real_tdlib",
    tdlib_version: tdlibInfo.version ?? null,
    adapter_message: (adapter.message as string) ?? "unknown",
  };
}

/**
 * Get real chat list for the account via TDLib.
 * Returns only real data from the TDLib client.
 */
export async function listChats(
  accountSlot: string,
  limit = 40,
  signal?: AbortSignal
): Promise<{
  chats: Array<{
    id: string;
    title: string;
    username: string | null;
    type: string;
    category: string;
    isChannel: boolean;
    isBot: boolean;
    unreadCount: number;
    lastMessage: Record<string, unknown> | null;
    source: string;
  }>;
  total: number;
  account_slot: string;
  data_source: string;
}> {
  const backendId = resolveBackendAccountId(accountSlot);
  enforceTdLibPolicy({ account_slot: accountSlot, operation: "chat_list" });

  const data = await backendFetch<Record<string, unknown>>(
    "GET",
    `/telegram/chats?accountId=${backendId}&limit=${limit}`,
    undefined,
    signal
  );

  const chats = (data.chats as Array<Record<string, unknown>>) ?? [];
  return {
    chats: chats.map((c) => ({
      id: String(c.id ?? ""),
      title: (c.title as string) ?? "Без названия",
      username: (c.username as string | null) ?? null,
      type: (c.type as string) ?? "unknown",
      category: (c.category as string) ?? "chat",
      isChannel: Boolean(c.isChannel),
      isBot: Boolean(c.isBot),
      unreadCount: Number(c.unreadCount ?? 0),
      lastMessage: (c.lastMessage as Record<string, unknown>) ?? null,
      source: "real_tdlib",
    })),
    total: Number(data.chatsCount ?? chats.length),
    account_slot: accountSlot,
    data_source: "real_tdlib",
  };
}

/**
 * Resolve a single chat (channel/group/private) by ID or @username.
 * Returns the chat object with full details.
 */
export async function resolveChat(
  accountSlot: string,
  chatRef: string,
  signal?: AbortSignal
): Promise<{
  chat: {
    id: string;
    title: string;
    username: string | null;
    type: string;
    category: string;
    isChannel: boolean;
  } | null;
  source: string;
  found: boolean;
}> {
  resolveBackendAccountId(accountSlot);
  enforceTdLibPolicy({ account_slot: accountSlot, operation: "chat_resolve" });

  // chatRef can be a numeric ID or a @username
  const data = await backendFetch<Record<string, unknown>>(
    "GET",
    `/telegram/chat/${encodeURIComponent(chatRef)}?accountId=${resolveBackendAccountId(accountSlot)}`,
    undefined,
    signal
  );

  const chat = (data.chat as Record<string, unknown>) ?? null;
  if (!chat) {
    return { chat: null, source: "real_tdlib", found: false };
  }
  return {
    chat: {
      id: String(chat.id ?? ""),
      title: (chat.title as string) ?? "Без названия",
      username: (chat.username as string | null) ?? null,
      type: (chat.type as string) ?? "unknown",
      category: (chat.category as string) ?? "chat",
      isChannel: Boolean(chat.isChannel),
    },
    source: "real_tdlib",
    found: true,
  };
}

/**
 * Get recent messages for a chat.
 */
export async function getMessageHistory(
  accountSlot: string,
  chatId: string,
  limit = 20,
  signal?: AbortSignal
): Promise<{
  messages: Array<{
    id: string;
    chatId: string;
    date: string | null;
    isOutgoing: boolean;
    senderId: string | null;
    content: string;
    authorSignature: string | null;
  }>;
  total: number;
  account_slot: string;
  chat_id: string;
  data_source: string;
}> {
  const backendId = resolveBackendAccountId(accountSlot);
  enforceTdLibPolicy({ account_slot: accountSlot, operation: "message_history" });

  const data = await backendFetch<Record<string, unknown>>(
    "GET",
    `/telegram/messages?accountId=${backendId}&chatId=${encodeURIComponent(chatId)}`,
    undefined,
    signal
  );

  const messages = (data.messages as Array<Record<string, unknown>>) ?? [];
  return {
    messages: messages.map((m) => ({
      id: String(m.id ?? ""),
      chatId: String(m.chatId ?? ""),
      date: (m.date as string | null) ?? null,
      isOutgoing: Boolean(m.isOutgoing),
      senderId: (m.senderId as string | null) ?? null,
      content: (m.content as string) ?? "",
      authorSignature: (m.authorSignature as string | null) ?? null,
    })),
    total: Number(data.totalCount ?? messages.length),
    account_slot: accountSlot,
    chat_id: chatId,
    data_source: "real_tdlib",
  };
}

/**
 * Send a text message (operator-gated: requires operatorApproved=true in payload).
 * This is the ONLY write path to Telegram — all sends go through here.
 */
export async function sendMessage(
  accountSlot: string,
  chatId: string,
  text: string,
  operatorApproved: boolean,
  signal?: AbortSignal
): Promise<{
  sent: boolean;
  message_id: string | null;
  sent_at: string | null;
  error: string | null;
}> {
  resolveBackendAccountId(accountSlot);
  enforceTdLibPolicy({ account_slot: accountSlot, operation: "message_send" });

  const backendId = resolveBackendAccountId(accountSlot);
  const body = {
    accountId: backendId,
    chatId,
    text,
    operatorApproved,
  };

  const data = await backendFetch<Record<string, unknown>>(
    "POST",
    "/telegram/send",
    body,
    signal
  );

  const sentMessage = (data.sentMessage as Record<string, unknown>) ?? {};
  return {
    sent: Boolean(data.sent),
    message_id: sentMessage.id ? String(sentMessage.id) : null,
    sent_at: sentMessage.date as string | null ?? null,
    error: (data.message as string) ?? null,
  };
}

/**
 * Publish a post to a channel. Requires operatorApproved=true.
 * Uses the same sendMessage path — publish is a channel-targeted send.
 */
export async function publishPost(
  accountSlot: string,
  channelId: string,
  text: string,
  options: { operatorApproved: boolean; disable_notification?: boolean; idempotency_key?: string },
  signal?: AbortSignal
): Promise<{
  ok: boolean;
  message_id: string | null;
  status: string;
  sent_at: string | null;
  error: string;
  policy_blocked: boolean;
  stage: string;
}> {
  const backendId = resolveBackendAccountId(accountSlot);
  enforceTdLibPolicy({ account_slot: accountSlot, operation: "post_publish" });

  // Use the /telegram/send path with operatorApproved gate
  const data = await backendFetch<Record<string, unknown>>(
    "POST",
    "/telegram/send",
    {
      accountId: backendId,
      chatId: channelId,
      text,
      operatorApproved: options.operatorApproved,
    },
    signal
  );

  const sentMessage = (data.sentMessage as Record<string, unknown>) ?? {};
  const sent = Boolean(data.sent);

  return {
    ok: sent,
    message_id: sentMessage.id ? String(sentMessage.id) : null,
    status: sent ? "SENT" : "FAILED",
    sent_at: sentMessage.date as string | null ?? null,
    error: sent ? "" : ((data.message as string) ?? "Unknown error"),
    policy_blocked: false,
    stage: sent ? "published_via_tdlib" : "send_failed",
  };
}

/**
 * Verify a message exists in a chat by fetching it from message history.
 */
export async function verifyMessage(
  accountSlot: string,
  chatId: string,
  messageId: string,
  signal?: AbortSignal
): Promise<{
  verified: boolean;
  message_text: string;
  match: boolean;
  data_source: string;
}> {
  const backendId = resolveBackendAccountId(accountSlot);
  enforceTdLibPolicy({ account_slot: accountSlot, operation: "post_verify" });

  const data = await backendFetch<Record<string, unknown>>(
    "GET",
    `/telegram/messages?accountId=${backendId}&chatId=${encodeURIComponent(chatId)}`,
    undefined,
    signal
  );

  const messages = (data.messages as Array<Record<string, unknown>>) ?? [];
  const found = messages.find((m) => String(m.id) === String(messageId));

  return {
    verified: Boolean(found),
    message_text: (found?.content as string) ?? "",
    match: Boolean(found),
    data_source: "real_tdlib",
  };
}

/**
 * Get real chat permissions / member status for a channel.
 * This is the authoritative source for "can NOVIKOVA post here?"
 */
export async function getChatPermissions(
  accountSlot: string,
  chatId: string,
  signal?: AbortSignal
): Promise<{
  chat_id: string;
  is_creator: boolean;
  is_administrator: boolean;
  can_post_messages: boolean;
  can_send_messages: boolean;
  permissions_source: string;
  data_source: string;
  error: string | null;
}> {
  const backendId = resolveBackendAccountId(accountSlot);
  enforceTdLibPolicy({ account_slot: accountSlot, operation: "chat_permissions" });

  const data = await backendFetch<Record<string, unknown>>(
    "GET",
    `/telegram/chat/${encodeURIComponent(chatId)}?permissions=1&accountId=${backendId}`,
    undefined,
    signal
  );

  const status = (data.status as Record<string, unknown>) ?? null;
  const permissionsSource = (data.permissionsSource as string) ?? "unknown";

  if (!status) {
    return {
      chat_id: chatId,
      is_creator: false,
      is_administrator: false,
      can_post_messages: false,
      can_send_messages: false,
      permissions_source: permissionsSource,
      data_source: "real_tdlib",
      error: (data.message as string) ?? "Could not retrieve member status",
    };
  }

  return {
    chat_id: String(status.chatId ?? chatId),
    is_creator: Boolean(status.isCreator ?? false),
    is_administrator: Boolean(status.isAdministrator ?? false),
    can_post_messages: Boolean(status.canPostMessages ?? false),
    can_send_messages: Boolean(status.canSendMessages ?? false),
    permissions_source: permissionsSource,
    data_source: "real_tdlib",
    error: null,
  };
}

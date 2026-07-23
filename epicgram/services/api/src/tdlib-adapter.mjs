import { mkdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as tdl from "tdl";
import { getTdjson, getTdlibInfo } from "prebuilt-tdlib";

export const TD_METHODS = {
  qr: "requestQrCodeAuthentication",
  phone: "setAuthenticationPhoneNumber",
  code: "checkAuthenticationCode",
  logout: "logOut"
};

const AUTH_WAIT_TIMEOUT_MS = 60000;
const READY_STATES = new Set(["authorizationStateReady"]);
const TRANSIENT_AUTH_STATES = new Set([
  "authorizationStateWaitTdlibParameters",
  "authorizationStateWaitEncryptionKey",
  "authorizationStateWaitPhoneNumber"
]);

let configured = false;
const clients = new Map();
const pendingClients = new Map();
const lastAuthorizationStates = new Map();
const lastErrors = new Map();
let tdjsonPath = null;

function safeAccountId(accountId = "main") {
  const raw = String(accountId || "main").trim();
  if (raw === "undefined" || raw === "null") return "main";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "main";
}

function tdlibRoot(accountId = "main") {
  if (process.env.EPICGRAM_TDLIB_ROOT) {
    return path.join(path.resolve(process.env.EPICGRAM_TDLIB_ROOT), safeAccountId(accountId));
  }

  const accountDir = path.join("accounts", safeAccountId(accountId));
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, "EPICGRAM", "tdlib", accountDir);
  }

  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), ".local", "state");
  return path.join(stateHome, "epicgram", "tdlib", accountDir);
}

function getClientOptions(accountId = "main") {
  const root = tdlibRoot(accountId);
  return {
    apiId: Number(process.env.TELEGRAM_API_ID),
    apiHash: process.env.TELEGRAM_API_HASH,
    databaseDirectory: path.join(root, "database"),
    filesDirectory: path.join(root, "files"),
    databaseEncryptionKey: process.env.EPICGRAM_TDLIB_DATABASE_KEY,
    tdlibParameters: {
      use_message_database: true,
      use_secret_chats: false,
      system_language_code: "ru",
      application_version: "0.1.0",
      device_model: "EPICGRAM Local Client",
      system_version: `${process.platform} ${process.arch}`
    }
  };
}

async function ensureClient(accountId = "main") {
  const id = safeAccountId(accountId);
  const existingClient = clients.get(id);
  if (existingClient) return existingClient;

  // PHASE M (RISK-2): in-flight guard. Two concurrent calls for the same
  // accountId must create exactly one client. The first caller stores its
  // creation promise in pendingClients; concurrent callers await that same
  // promise instead of creating a duplicate (which would orphan a client and
  // double the update/error listeners). The promise is removed when settled.
  const pending = pendingClients.get(id);
  if (pending) return pending;

  const creation = (async () => {
    tdjsonPath = getTdjson();
    if (!configured) {
      tdl.configure({ tdjson: tdjsonPath, verbosityLevel: 1 });
      configured = true;
    }

    await mkdir(path.join(tdlibRoot(id), "database"), { recursive: true });
    await mkdir(path.join(tdlibRoot(id), "files"), { recursive: true });

    const client = tdl.createClient(getClientOptions(id));
    clients.set(id, client);
    client.on("update", (update) => {
      if (update?._ === "updateAuthorizationState") {
        lastAuthorizationStates.set(id, update.authorization_state);
      } else if (update?._ === "updateNewMessage") {
        // P19.1: push new-message events to the SSE bus. Best-effort, never throws.
        const m = update.message;
        import("./event-bus.mjs")
          .then(({ publish }) => publish({
            type: "message.new",
            runtime: "telegram",
            accountId: id,
            data: {
              chatId: m?.chat_id != null ? String(m.chat_id) : null,
              messageId: m?.id != null ? String(m.id) : null,
              isOutgoing: Boolean(m?.is_outgoing)
            }
          }))
          .catch(() => {});
      }
    });
    client.on("error", (error) => {
      lastErrors.set(id, error instanceof Error ? error.message : String(error));
    });
    client.once("close", () => {
      clients.delete(id);
      lastAuthorizationStates.set(id, { _: "authorizationStateClosed" });
    });

    return client;
  })();

  pendingClients.set(id, creation);
  try {
    return await creation;
  } catch (error) {
    lastErrors.set(id, error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    pendingClients.delete(id);
  }
}

async function closeClient(accountId = "main") {
  const id = safeAccountId(accountId);
  const client = clients.get(id);
  if (!client) return;
  const closingClient = client;
  clients.delete(id);
  try {
    await closingClient.close();
  } finally {
    lastAuthorizationStates.set(id, { _: "authorizationStateClosed" });
  }
}

function waitForAuthorizationState(accountId, predicate, timeoutMs = AUTH_WAIT_TIMEOUT_MS) {
  const id = safeAccountId(accountId);
  return new Promise((resolve) => {
    const client = clients.get(id);
    const lastAuthorizationState = lastAuthorizationStates.get(id);
    if (predicate(lastAuthorizationState)) {
      resolve(lastAuthorizationState);
      return;
    }

    let timeout = null;
    const onUpdate = (update) => {
      if (update?._ !== "updateAuthorizationState") return;
      const authorizationState = update.authorization_state;
      lastAuthorizationStates.set(id, authorizationState);
      if (!predicate(authorizationState)) return;
      clearTimeout(timeout);
      client?.off("update", onUpdate);
      resolve(authorizationState);
    };

    timeout = setTimeout(() => {
      client?.off("update", onUpdate);
      resolve(lastAuthorizationState);
    }, timeoutMs);

    client?.on("update", onUpdate);
  });
}

async function getCurrentAuthorizationState(accountId, tdClient) {
  const authorizationState = await tdClient.invoke({ _: "getAuthorizationState" });
  lastAuthorizationStates.set(safeAccountId(accountId), authorizationState);
  return authorizationState;
}

async function getStableAuthorizationState(accountId, tdClient) {
  const authorizationState = await getCurrentAuthorizationState(accountId, tdClient);
  if (!TRANSIENT_AUTH_STATES.has(authorizationState?._)) return authorizationState;
  return waitForAuthorizationState(accountId, (state) => Boolean(state?._) && !TRANSIENT_AUTH_STATES.has(state._));
}

function formatAccount(user) {
  if (!user) return null;
  const firstName = user.first_name ?? "";
  const lastName = user.last_name ?? "";
  const displayName = `${firstName} ${lastName}`.trim() || user.username || "Telegram account";
  const photoSmall = user.profile_photo?.small ?? null;

  return {
    id: String(user.id),
    displayName,
    username: user.username ? `@${user.username}` : null,
    phoneMasked: user.phone_number ? `+${String(user.phone_number).slice(0, 4)}***${String(user.phone_number).slice(-2)}` : null,
    type: user.type?._ ?? "user",
    photoSmallFileId: photoSmall?.id ? String(photoSmall.id) : null
  };
}

function classifyChat(chat, user = null) {
  const type = chat?.type?._;
  if (type === "chatTypePrivate") return user?.type?._ === "userTypeBot" ? "bot" : "private";
  if (type === "chatTypeSecret") return "private";
  if (type === "chatTypeSupergroup" && chat.type?.is_channel) return "channel";
  if (type === "chatTypeBasicGroup" || type === "chatTypeSupergroup") return "group";
  return "chat";
}

function formatChat(chat, { list = "main", user = null } = {}) {
  if (!chat) return null;
  const isChannel = Boolean(chat.type?.is_channel);
  const photoSmall = chat.photo?.small ?? null;
  return {
    id: String(chat.id),
    title: chat.title || "Без названия",
    type: chat.type?._ ?? "chat",
    category: classifyChat(chat, user),
    list,
    isChannel,
    isBot: user?.type?._ === "userTypeBot",
    username: user?.username ? `@${user.username}` : null,
    photoSmallFileId: photoSmall?.id ? String(photoSmall.id) : null,
    unreadCount: chat.unread_count ?? 0,
    isMarkedAsUnread: Boolean(chat.is_marked_as_unread),
    lastReadInboxMessageId: chat.last_read_inbox_message_id ? String(chat.last_read_inbox_message_id) : null,
    lastMessage: formatMessage(chat.last_message)
  };
}

function formatMessageContent(content) {
  if (!content) return "";
  if (content._ === "messageText") return content.text?.text ?? "";
  if (content.caption?.text) return content.caption.text;
  if (content._ === "messagePhoto") return "Фото";
  if (content._ === "messageVideo") return "Видео";
  if (content._ === "messageAudio") return "Аудио";
  if (content._ === "messageVoiceNote") return "Голосовое сообщение";
  if (content._ === "messageDocument") return content.document?.file_name ? `Файл: ${content.document.file_name}` : "Документ";
  if (content._ === "messageSticker") return "Стикер";
  if (content._ === "messageAnimation") return "GIF";
  if (content._ === "messageContact") return "Контакт";
  if (content._ === "messageLocation") return "Геолокация";
  if (content._ === "messageChatAddMembers") return "Добавлены участники";
  if (content._ === "messageChatJoinByLink") return "Вход по ссылке";
  return content._ ? content._.replace(/^message/, "") : "Сообщение";
}

function formatMessage(message) {
  if (!message) return null;
  return {
    id: String(message.id),
    chatId: String(message.chat_id),
    date: message.date ? new Date(message.date * 1000).toISOString() : null,
    isOutgoing: Boolean(message.is_outgoing),
    senderId: message.sender_id?.user_id ? String(message.sender_id.user_id) : message.sender_id?.chat_id ? String(message.sender_id.chat_id) : null,
    content: formatMessageContent(message.content),
    authorSignature: message.author_signature || null
  };
}

async function getCurrentAccount(accountId, tdClient) {
  try {
    const account = formatAccount(await tdClient.invoke({ _: "getMe" }));
    return account ? { ...account, slotId: safeAccountId(accountId) } : null;
  } catch (error) {
    lastErrors.set(safeAccountId(accountId), error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function getPrivateUser(tdClient, chat) {
  if (chat?.type?._ !== "chatTypePrivate" || !chat.type?.user_id) return null;
  try {
    return await tdClient.invoke({ _: "getUser", user_id: chat.type.user_id });
  } catch {
    return null;
  }
}

async function loadChatList(tdClient, chatList, limit) {
  // TDLib's getChats ONLY returns chats already in the in-memory list. Right
  // after login that list is nearly empty (often just the service chat), so we
  // must call loadChats first to pull dialogs from the server. loadChats throws
  // error 404 once the list is fully loaded — that's the normal stop signal.
  const perCall = Math.min(Math.max(limit, 20), 100);
  for (let i = 0; i < 6; i += 1) {
    try {
      await tdClient.invoke({ _: "loadChats", chat_list: chatList, limit: perCall });
    } catch {
      break;
    }
  }
}

async function getChatsFromList(tdClient, chatList, list, limit) {
  await loadChatList(tdClient, chatList, limit);
  const chats = await tdClient.invoke({
    _: "getChats",
    chat_list: chatList,
    limit
  });
  const chatIds = chats.chat_ids ?? [];
  const hydratedChats = await Promise.all(
    chatIds.slice(0, limit).map(async (chatId) => {
      try {
        const chat = await tdClient.invoke({ _: "getChat", chat_id: chatId });
        const user = await getPrivateUser(tdClient, chat);
        return formatChat(chat, { list, user });
      } catch {
        return null;
      }
    })
  );
  return hydratedChats.filter(Boolean);
}

async function getCurrentChats(tdClient, limit = 60) {
  const mainLimit = Math.max(limit, 60);
  const archiveLimit = Math.min(Math.max(Math.floor(limit / 2), 20), 60);
  const [mainChats, archiveChats] = await Promise.all([
    getChatsFromList(tdClient, { _: "chatListMain" }, "main", mainLimit),
    getChatsFromList(tdClient, { _: "chatListArchive" }, "archive", archiveLimit).catch(() => [])
  ]);
  const seen = new Set();

  return [...mainChats, ...archiveChats].filter((chat) => {
    if (seen.has(chat.id)) return false;
    seen.add(chat.id);
    return true;
  });
}

export function getTdlibAdapterStatus(accountId = "main") {
  const id = safeAccountId(accountId);
  const client = clients.get(id);
  const authorizationState = lastAuthorizationStates.get(id);
  const lastError = lastErrors.get(id) ?? null;
  let tdlibInfo = null;
  try {
    tdlibInfo = getTdlibInfo();
  } catch {
    tdlibInfo = null;
  }

  return {
    runtimeAdapter: "tdl",
    nativeBindingLoaded: Boolean(tdjsonPath || client),
    tdjsonPath,
    tdlibInfo,
    accountId: id,
    authorizationState: authorizationState?._ ?? null,
    lastError,
    requiredMethods: TD_METHODS,
    message: client
      ? "TDLib native adapter is loaded."
      : "TDLib adapter is installed and will load tdjson lazily on the first auth request."
  };
}

export async function getTdlibChats({ accountId = "main", limit = 30 } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return {
      authorizationState,
      chats: [],
      message: "Telegram account is not authorized yet."
    };
  }

  return {
    authorizationState,
    account: await getCurrentAccount(id, tdClient),
    chats: await getCurrentChats(tdClient, limit),
    message: "Telegram chats loaded from TDLib."
  };
}

export async function getTdlibMessages({ accountId = "main", chatId, limit = 40 } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return {
      authorizationState,
      messages: [],
      message: "Telegram account is not authorized yet."
    };
  }

  const history = await tdClient.invoke({
    _: "getChatHistory",
    chat_id: Number(chatId),
    from_message_id: 0,
    offset: 0,
    limit,
    only_local: false
  });

  return {
    authorizationState,
    messages: (history.messages ?? []).map(formatMessage).filter(Boolean).reverse(),
    totalCount: history.total_count ?? 0,
    message: "Telegram messages loaded from TDLib."
  };
}

// ── chat creation ─────────────────────────────────────────────────────────────
// type: "group" | "supergroup" | "channel"
export async function createTdlibChat({ accountId = "main", type = "supergroup", title, description = "", username = "" } = {}) {
  const id = safeAccountId(accountId);
  const cleanTitle = String(title ?? "").trim();
  const cleanDesc  = String(description ?? "").trim();
  const cleanUser  = String(username  ?? "").replace(/^@/, "").trim();

  if (!cleanTitle) throw new Error("title is required");
  if (!["group", "supergroup", "channel"].includes(type)) throw new Error("type must be group, supergroup, or channel");

  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return { ok: false, authorizationState, message: "Telegram account is not authorized yet." };
  }

  let chat;
  if (type === "group") {
    // Basic group (no username, no description support)
    chat = await tdClient.invoke({
      _: "createNewBasicGroupChat",
      title: cleanTitle,
      user_ids: [],
      message_ttl: 0
    });
  } else {
    // Supergroup or channel
    const isChannel = type === "channel";
    chat = await tdClient.invoke({
      _: "createNewSupergroupChat",
      title: cleanTitle,
      is_forum: false,
      is_channel: isChannel,
      description: cleanDesc,
      message_auto_delete_time: 0
    });

    // Set description separately as a safety fallback
    if (cleanDesc) {
      try {
        await tdClient.invoke({ _: "setChatDescription", chat_id: chat.id, description: cleanDesc });
      } catch { /* not fatal */ }
    }

    // Set public username if provided
    if (cleanUser && chat.type?.supergroup_id) {
      try {
        await tdClient.invoke({
          _: "setSupergroupUsername",
          supergroup_id: chat.type.supergroup_id,
          username: cleanUser
        });
      } catch (e) {
        // Username may already be taken — not fatal, we still return the chat
        return {
          ok: true,
          authorizationState,
          message: `${type === "channel" ? "Channel" : "Supergroup"} created but username @${cleanUser} could not be set (already taken or invalid).`,
          chatId: chat.id,
          chat: { id: chat.id, title: chat.title, type, username: null }
        };
      }
    }
  }

  const typeLabel = type === "group" ? "Group" : type === "channel" ? "Channel" : "Supergroup";
  return {
    ok: true,
    authorizationState,
    message: `${typeLabel} "${cleanTitle}" created via TDLib.`,
    chatId: chat.id,
    chat: { id: chat.id, title: chat.title, type, username: cleanUser || null }
  };
}

export async function sendTdlibMessage({ accountId = "main", chatId, text } = {}) {
  const id = safeAccountId(accountId);
  const cleanText = String(text ?? "").trim();
  if (!chatId) throw new Error("chatId is required");
  if (!cleanText) throw new Error("text is required");

  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return {
      ok: false,
      authorizationState,
      message: "Telegram account is not authorized yet."
    };
  }

  const sent = await tdClient.invoke({
    _: "sendMessage",
    chat_id: Number(chatId),
    input_message_content: {
      _: "inputMessageText",
      text: { _: "formattedText", text: cleanText }
    }
  });

  return {
    ok: true,
    authorizationState,
    message: "Message sent to Telegram via TDLib.",
    sentMessage: formatMessage(sent)
  };
}

export async function forwardTdlibMessage({ accountId = "main", fromChatId, messageId, toChatId } = {}) {
  const id = safeAccountId(accountId);
  if (!fromChatId) throw new Error("fromChatId is required");
  if (!messageId) throw new Error("messageId is required");
  if (!toChatId) throw new Error("toChatId is required");

  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return { ok: false, authorizationState, message: "Telegram account is not authorized yet." };
  }

  const result = await tdClient.invoke({
    _: "forwardMessages",
    chat_id: Number(toChatId),
    from_chat_id: Number(fromChatId),
    message_ids: [Number(messageId)],
    options: { _: "messageSendOptions" },
    send_copy: false,
    remove_caption: false
  });

  return {
    ok: true,
    authorizationState,
    message: "Message forwarded via TDLib.",
    messages: (result.messages ?? []).map(formatMessage)
  };
}

export async function addTdlibReaction({ accountId = "main", chatId, messageId, emoji } = {}) {
  const id = safeAccountId(accountId);
  if (!chatId) throw new Error("chatId is required");
  if (!messageId) throw new Error("messageId is required");
  if (!emoji) throw new Error("emoji is required");

  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return { ok: false, authorizationState, message: "Telegram account is not authorized yet." };
  }

  await tdClient.invoke({
    _: "addMessageReaction",
    chat_id: Number(chatId),
    message_id: Number(messageId),
    reaction_type: { _: "reactionTypeEmoji", emoji },
    is_big: false,
    update_recent_reactions: true
  });

  return { ok: true, authorizationState, message: `Reaction ${emoji} added via TDLib.` };
}

export async function pinTdlibMessage({ accountId = "main", chatId, messageId, disableNotification = false } = {}) {
  const id = safeAccountId(accountId);
  if (!chatId) throw new Error("chatId is required");
  if (!messageId) throw new Error("messageId is required");

  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return { ok: false, authorizationState, message: "Telegram account is not authorized yet." };
  }

  await tdClient.invoke({
    _: "pinChatMessage",
    chat_id: Number(chatId),
    message_id: Number(messageId),
    disable_notification: Boolean(disableNotification),
    only_for_self: false
  });

  return { ok: true, authorizationState, message: "Message pinned via TDLib." };
}

export async function editTdlibMessage({ accountId = "main", chatId, messageId, text } = {}) {
  const id = safeAccountId(accountId);
  const cleanText = String(text ?? "").trim();
  if (!chatId) throw new Error("chatId is required");
  if (!messageId) throw new Error("messageId is required");
  if (!cleanText) throw new Error("text is required");

  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return { ok: false, authorizationState, message: "Telegram account is not authorized yet." };
  }

  const result = await tdClient.invoke({
    _: "editMessageText",
    chat_id: Number(chatId),
    message_id: Number(messageId),
    input_message_content: {
      _: "inputMessageText",
      text: { _: "formattedText", text: cleanText }
    }
  });

  return {
    ok: true,
    authorizationState,
    message: "Message edited via TDLib.",
    editedMessage: formatMessage(result)
  };
}

export async function deleteTdlibMessages({ accountId = "main", chatId, messageIds, revoke = true } = {}) {
  const id = safeAccountId(accountId);
  if (!chatId) throw new Error("chatId is required");
  if (!Array.isArray(messageIds) || messageIds.length === 0) throw new Error("messageIds array is required");

  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return { ok: false, authorizationState, message: "Telegram account is not authorized yet." };
  }

  await tdClient.invoke({
    _: "deleteMessages",
    chat_id: Number(chatId),
    message_ids: messageIds.map(Number),
    revoke: Boolean(revoke)
  });

  return {
    ok: true,
    authorizationState,
    message: `${messageIds.length} message(s) deleted via TDLib.`,
    deletedCount: messageIds.length
  };
}

export async function getTdlibPhotoFile(fileId, accountId = "main") {
  const id = safeAccountId(accountId);
  const numericFileId = Number(fileId);
  if (!Number.isFinite(numericFileId)) {
    return {
      status: 400,
      body: null,
      contentType: "application/json; charset=utf-8",
      message: "fileId must be numeric"
    };
  }

  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return {
      status: 401,
      body: Buffer.from(JSON.stringify({ message: "Telegram account is not authorized yet." })),
      contentType: "application/json; charset=utf-8"
    };
  }

  const file = await tdClient.invoke({
    _: "downloadFile",
    file_id: numericFileId,
    priority: 16,
    offset: 0,
    limit: 0,
    synchronous: true
  });
  const localPath = file.local?.path;
  if (!localPath) {
    return {
      status: 404,
      body: Buffer.from(JSON.stringify({ message: "Photo file is not available locally." })),
      contentType: "application/json; charset=utf-8"
    };
  }

  return {
    status: 200,
    body: await readFile(localPath),
    contentType: "image/jpeg"
  };
}

export async function requestTdlibQrAuth(accountId = "main") {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const currentAuthorizationState = await getCurrentAuthorizationState(id, tdClient);

  if (currentAuthorizationState?._ === "authorizationStateWaitOtherDeviceConfirmation") {
    return {
      ok: true,
      method: TD_METHODS.qr,
      authorizationState: currentAuthorizationState,
      qrLink: currentAuthorizationState.link ?? null,
      message: "QR authorization is already waiting for Telegram confirmation."
    };
  }

  await tdClient.invoke({ _: TD_METHODS.qr, other_user_ids: [] });
  const authorizationState = await waitForAuthorizationState(
    id,
    (state) => state?._ === "authorizationStateWaitOtherDeviceConfirmation"
  );

  return {
    ok: true,
    method: TD_METHODS.qr,
    authorizationState,
    qrLink: authorizationState?._ === "authorizationStateWaitOtherDeviceConfirmation" ? authorizationState.link : null,
    message: "TDLib QR authorization requested. Wait for authorizationStateWaitOtherDeviceConfirmation."
  };
}

export async function requestTdlibPhoneAuth(phoneNumber, options = {}) {
  const id = safeAccountId(options.accountId ?? "main");
  let tdClient = await ensureClient(id);
  const currentAuthorizationState = await getCurrentAuthorizationState(id, tdClient);

  if (READY_STATES.has(currentAuthorizationState?._)) {
    return {
      ok: true,
      method: TD_METHODS.phone,
      authorizationState: currentAuthorizationState,
      account: await getCurrentAccount(id, tdClient),
      message: "Telegram account is already authorized."
    };
  }

  if (options.resetCurrentFlow || currentAuthorizationState?._ === "authorizationStateWaitOtherDeviceConfirmation") {
    await resetTdlibAuthSession({ accountId: id, deleteDatabase: true });
    tdClient = await ensureClient(id);
    await getCurrentAuthorizationState(id, tdClient);
  }

  await tdClient.invoke({
    _: TD_METHODS.phone,
    phone_number: phoneNumber,
    settings: {
      _: "phoneNumberAuthenticationSettings",
      allow_flash_call: false,
      allow_missed_call: false,
      is_current_phone_number: false,
      allow_sms_retriever_api: false,
      authentication_tokens: []
    }
  });
  const authorizationState = await waitForAuthorizationState(
    id,
    (state) => state?._ === "authorizationStateWaitCode" || state?._ === "authorizationStateWaitPassword"
  );

  return {
    ok: true,
    method: TD_METHODS.phone,
    authorizationState,
    account: READY_STATES.has(authorizationState?._) ? await getCurrentAccount(id, tdClient) : null,
    message: "Telegram phone authorization requested. Check Telegram for the login code."
  };
}

export async function checkTdlibAuthenticationCode(code, accountId = "main") {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  await tdClient.invoke({ _: TD_METHODS.code, code });
  const authorizationState = await waitForAuthorizationState(id, (state) =>
    ["authorizationStateReady", "authorizationStateWaitCode", "authorizationStateWaitPassword"].includes(state?._)
  );

  return {
    ok: true,
    method: TD_METHODS.code,
    authorizationState,
    account: READY_STATES.has(authorizationState?._) ? await getCurrentAccount(id, tdClient) : null,
    message: READY_STATES.has(authorizationState?._)
      ? "Telegram account authorized."
      : "Telegram authentication code submitted."
  };
}

export async function checkTdlibAuthenticationPassword(password, accountId = "main") {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  await tdClient.invoke({ _: "checkAuthenticationPassword", password });
  const authorizationState = await waitForAuthorizationState(id, (state) =>
    ["authorizationStateReady", "authorizationStateWaitPassword"].includes(state?._)
  );

  return {
    ok: true,
    method: "checkAuthenticationPassword",
    authorizationState,
    account: READY_STATES.has(authorizationState?._) ? await getCurrentAccount(id, tdClient) : null,
    message: READY_STATES.has(authorizationState?._)
      ? "Telegram account authorized."
      : "Two-factor password submitted."
  };
}

export async function logOutTdlib(accountId = "main") {
  const id = safeAccountId(accountId);
  const client = clients.get(id);
  if (!client) {
    return {
      ok: true,
      method: TD_METHODS.logout,
      message: "TDLib client is not running."
    };
  }

  await client.invoke({ _: TD_METHODS.logout });
  return {
    ok: true,
    method: TD_METHODS.logout,
    authorizationState: lastAuthorizationStates.get(id),
    message: "TDLib logout requested."
  };
}

export async function resetTdlibAuthSession({ accountId = "main", deleteDatabase = false } = {}) {
  const id = safeAccountId(accountId);
  await closeClient(id);
  // PHASE M (RISK-4): purge every account-scoped Map so a removed/reset slot
  // leaves no stale references behind (clients is cleared by closeClient).
  lastErrors.delete(id);
  lastAuthorizationStates.delete(id);
  pendingClients.delete(id);

  if (deleteDatabase) {
    await rm(tdlibRoot(id), { recursive: true, force: true });
  }

  return {
    ok: true,
    deletedDatabase: deleteDatabase,
    authorizationState: lastAuthorizationStates.get(id),
    message: deleteDatabase ? "TDLib local auth database was reset." : "TDLib client was closed."
  };
}

export async function getTdlibSessionSnapshot(accountId = "main") {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);

  return {
    authorizationState,
    account: READY_STATES.has(authorizationState?._) ? await getCurrentAccount(id, tdClient) : null,
    adapter: getTdlibAdapterStatus(id)
  };
}

// P17.2/P17.4: read-only account detail — profile (getMe), storage
// (getStorageStatisticsFast), active devices (getActiveSessions) and dialog
// counters. Never writes; safe to call from an info panel.
function formatSession(session) {
  return {
    id: session?.id != null ? String(session.id) : null,
    current: Boolean(session?.is_current),
    deviceModel: session?.device_model ?? null,
    platform: session?.platform ?? null,
    systemVersion: session?.system_version ?? null,
    appName: session?.application_name ?? null,
    appVersion: session?.application_version ?? null,
    official: Boolean(session?.is_official_application),
    country: session?.country ?? null,
    region: session?.region ?? null,
    ip: session?.ip ?? null,
    lastActive: session?.last_active_date ? new Date(session.last_active_date * 1000).toISOString() : null,
    loginDate: session?.log_in_date ? new Date(session.log_in_date * 1000).toISOString() : null
  };
}

function meUsername(me) {
  const active = me?.usernames?.active_usernames?.[0] ?? me?.usernames?.editable_username ?? me?.username;
  return active ? `@${active}` : null;
}

export async function getTdlibAccountDetail(accountId = "main") {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  const ready = READY_STATES.has(authorizationState?._);

  const detail = {
    slotId: id,
    session: {
      ready,
      authorizationState: authorizationState?._ ?? null,
      deviceModel: "EPICGRAM Local Client",
      systemVersion: `${process.platform} ${process.arch}`,
      appVersion: "0.1.0",
      createdAt: null,
      lastActive: new Date().toISOString()
    },
    account: null,
    storage: null,
    statistics: null,
    devices: []
  };

  if (!ready) return detail;

  try {
    const me = await tdClient.invoke({ _: "getMe" });
    let language = null;
    try {
      const opt = await tdClient.invoke({ _: "getOption", name: "language_pack_id" });
      language = opt?.value ?? null;
    } catch { /* option not available */ }
    detail.account = {
      id: String(me.id),
      username: meUsername(me),
      firstName: me.first_name ?? null,
      lastName: me.last_name ?? null,
      phone: me.phone_number ? `+${String(me.phone_number).slice(0, 4)}***${String(me.phone_number).slice(-2)}` : null,
      premium: Boolean(me.is_premium),
      verified: Boolean(me.is_verified),
      scam: Boolean(me.is_scam),
      fake: Boolean(me.is_fake),
      language,
      dc: null
    };
  } catch { /* getMe failed */ }

  try {
    const s = await tdClient.invoke({ _: "getStorageStatisticsFast" });
    detail.storage = {
      database: Number(s?.database_size ?? 0),
      media: Number(s?.files_size ?? 0),
      documents: 0,
      cache: Number(s?.log_size ?? 0),
      filesCount: Number(s?.file_count ?? 0)
    };
  } catch { /* storage stats failed */ }

  try {
    const sessions = await tdClient.invoke({ _: "getActiveSessions" });
    detail.devices = (sessions?.sessions ?? []).map(formatSession);
  } catch { /* sessions failed */ }

  try {
    const chats = await getCurrentChats(tdClient, 200);
    const count = (predicate) => chats.filter(predicate).length;
    detail.statistics = {
      dialogs: chats.length,
      privateChats: count((c) => c.category === "private"),
      groups: count((c) => c.category === "group"),
      supergroups: 0,
      channels: count((c) => c.category === "channel" || c.isChannel),
      bots: count((c) => c.category === "bot" || c.isBot),
      unread: chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)
    };
  } catch { /* chat counters failed */ }

  return detail;
}

// ─────────────────────────────────────────────────────────────────────────────
// Contacts API
// ─────────────────────────────────────────────────────────────────────────────

function formatUserShort(user) {
  if (!user) return null;
  const firstName = user.first_name ?? "";
  const lastName  = user.last_name  ?? "";
  return {
    id:          String(user.id),
    displayName: `${firstName} ${lastName}`.trim() || user.username || "Unknown",
    username:    user.username ? `@${user.username}` : null,
    phoneMasked: user.phone_number ? `+${String(user.phone_number).slice(0, 4)}***${String(user.phone_number).slice(-2)}` : null,
    type:        user.type?._ ?? "user",
    isBot:       user.type?._ === "userTypeBot",
    photoSmallFileId: user.profile_photo?.small?.id ? String(user.profile_photo.small.id) : null,
  };
}

export async function getTdlibContacts({ accountId = "main" } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { contacts: [], message: "Not authorized" };

  const result = await tdClient.invoke({ _: "getContacts" });
  const userIds = result.user_ids ?? [];
  const users = await Promise.allSettled(
    userIds.slice(0, 300).map(uid => tdClient.invoke({ _: "getUser", user_id: uid }))
  );
  return {
    contacts: users.filter(r => r.status === "fulfilled").map(r => formatUserShort(r.value)),
    total: userIds.length,
  };
}

export async function searchTdlibContacts({ accountId = "main", query = "", limit = 20 } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { contacts: [] };

  const result = await tdClient.invoke({ _: "searchContacts", query: String(query), limit: Math.min(limit, 50) });
  const users = await Promise.allSettled(
    (result.user_ids ?? []).map(uid => tdClient.invoke({ _: "getUser", user_id: uid }))
  );
  return { contacts: users.filter(r => r.status === "fulfilled").map(r => formatUserShort(r.value)) };
}

export async function getTdlibUserProfile({ accountId = "main", userId } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { ok: false, message: "Not authorized" };

  const uid = Number(userId);
  const [user, fullInfo] = await Promise.all([
    tdClient.invoke({ _: "getUser", user_id: uid }),
    tdClient.invoke({ _: "getUserFullInfo", user_id: uid }).catch(() => null),
  ]);
  return {
    ...formatUserShort(user),
    bio:             fullInfo?.bio?.text ?? null,
    commonChatCount: fullInfo?.group_in_common_count ?? 0,
  };
}

export async function toggleTdlibUserBlock({ accountId = "main", userId, blocked = true } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { ok: false, message: "Not authorized" };

  await tdClient.invoke({
    _: "toggleMessageSenderIsBlocked",
    sender_id: { _: "messageSenderUser", user_id: Number(userId) },
    is_blocked: Boolean(blocked),
  });
  return { ok: true, userId, blocked };
}

export async function getTdlibCommonChats({ accountId = "main", userId, limit = 20 } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { chats: [] };

  const result = await tdClient.invoke({ _: "getGroupsInCommon", user_id: Number(userId), offset_chat_id: 0, limit: Math.min(limit, 100) });
  const chatIds = result.chat_ids ?? [];
  const chats = await Promise.allSettled(chatIds.map(cid => tdClient.invoke({ _: "getChat", chat_id: cid })));
  return { chats: chats.filter(r => r.status === "fulfilled").map(r => formatChat(r.value)) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat management (archive, mute, read, pin)
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleTdlibChatArchived({ accountId = "main", chatId, archived = true } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { ok: false, message: "Not authorized" };

  await tdClient.invoke({
    _: "addChatToList",
    chat_id: Number(chatId),
    chat_list: archived ? { _: "chatListArchive" } : { _: "chatListMain" },
  });
  return { ok: true, chatId, archived };
}

export async function toggleTdlibChatMuted({ accountId = "main", chatId, muted = true } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { ok: false, message: "Not authorized" };

  await tdClient.invoke({
    _: "setChatNotificationSettings",
    chat_id: Number(chatId),
    notification_settings: {
      _: "chatNotificationSettings",
      use_default_mute_for: false,
      mute_for: muted ? 2147483647 : 0,
      use_default_sound: true,
      use_default_show_preview: true,
      use_default_disable_pinned_message_notifications: true,
      use_default_disable_mention_notifications: true,
    },
  });
  return { ok: true, chatId, muted };
}

export async function markTdlibChatRead({ accountId = "main", chatId } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { ok: false, message: "Not authorized" };

  const chat = await tdClient.invoke({ _: "getChat", chat_id: Number(chatId) });
  if (chat.last_message?.id) {
    await tdClient.invoke({ _: "readChatHistory", chat_id: Number(chatId), last_message_id: chat.last_message.id });
  }
  return { ok: true, chatId };
}

export async function toggleTdlibChatPinned({ accountId = "main", chatId, pinned = true } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { ok: false, message: "Not authorized" };

  await tdClient.invoke({
    _: "toggleChatIsPinned",
    chat_list: { _: "chatListMain" },
    chat_id: Number(chatId),
    is_pinned: Boolean(pinned),
  });
  return { ok: true, chatId, pinned };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat members (list, ban, kick, promote to admin)
// ─────────────────────────────────────────────────────────────────────────────

export async function getTdlibChatMembers({ accountId = "main", chatId, limit = 50, filter = "all" } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { members: [], message: "Not authorized" };

  const chat = await tdClient.invoke({ _: "getChat", chat_id: Number(chatId) });
  const chatType = chat.type?._;

  if (chatType === "chatTypeBasicGroup") {
    const full = await tdClient.invoke({ _: "getBasicGroupFullInfo", basic_group_id: chat.type.basic_group_id });
    return { members: full.members ?? [], total: (full.members ?? []).length };
  }
  if (chatType === "chatTypeSupergroup") {
    const filterMap = {
      all:    { _: "supergroupMembersFilterRecent" },
      admins: { _: "supergroupMembersFilterAdministrators" },
      banned: { _: "supergroupMembersFilterBanned", query: "" },
      bots:   { _: "supergroupMembersFilterBots" },
    };
    const result = await tdClient.invoke({
      _: "getSupergroupMembers",
      supergroup_id: chat.type.supergroup_id,
      filter: filterMap[filter] ?? filterMap.all,
      offset: 0,
      limit: Math.min(limit, 200),
    });
    return { members: result.members ?? [], total: result.total_count ?? 0 };
  }
  return { members: [], message: "Chat type does not support member listing" };
}

export async function setChatTdlibMemberStatus({ accountId = "main", chatId, userId, action } = {}) {
  // action: "ban" | "kick" | "admin" | "member"
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { ok: false, message: "Not authorized" };

  const chat = await tdClient.invoke({ _: "getChat", chat_id: Number(chatId) });
  if (chat.type?._ !== "chatTypeSupergroup") return { ok: false, message: "Only supergroups/channels support this operation" };

  const statusMap = {
    ban:    { _: "chatMemberStatusBanned", banned_until_date: 0 },
    kick:   { _: "chatMemberStatusLeft" },
    member: { _: "chatMemberStatusMember" },
    admin: {
      _: "chatMemberStatusAdministrator",
      custom_title: "",
      can_be_edited: true,
      rights: {
        _: "chatAdministratorRights",
        can_manage_chat: true, can_change_info: true, can_post_messages: true,
        can_edit_messages: true, can_delete_messages: true, can_invite_users: true,
        can_restrict_members: true, can_pin_messages: true, can_promote_members: false,
        can_manage_video_chats: true, can_post_stories: false, can_edit_stories: false,
        can_delete_stories: false, is_anonymous: false,
      },
    },
  };

  const status = statusMap[action];
  if (!status) return { ok: false, message: `Unknown action: ${action}. Use ban|kick|admin|member` };

  await tdClient.invoke({
    _: "setChatMemberStatus",
    chat_id: Number(chatId),
    member_id: { _: "messageSenderUser", user_id: Number(userId) },
    status,
  });
  return { ok: true, chatId, userId, action };
}

export async function getTdlibChatInviteLink({ accountId = "main", chatId } = {}) {
  const id = safeAccountId(accountId);
  const tdClient = await ensureClient(id);
  const authorizationState = await getStableAuthorizationState(id, tdClient);
  if (!READY_STATES.has(authorizationState?._)) return { ok: false, message: "Not authorized" };

  const link = await tdClient.invoke({
    _: "createChatInviteLink",
    chat_id: Number(chatId),
    name: "",
    expire_date: 0,
    member_limit: 0,
    creates_join_request: false,
  });
  return { ok: true, chatId, inviteLink: link.invite_link };
}

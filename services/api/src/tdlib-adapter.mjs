import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import * as tdl from "tdl";
import { getTdjson, getTdlibInfo } from "prebuilt-tdlib";

export const TD_METHODS = {
  qr: "requestQrCodeAuthentication",
  phone: "setAuthenticationPhoneNumber",
  code: "checkAuthenticationCode",
  logout: "logOut"
};

const AUTH_WAIT_TIMEOUT_MS = 10000;
const READY_STATES = new Set(["authorizationStateReady"]);
const TRANSIENT_AUTH_STATES = new Set([
  "authorizationStateWaitTdlibParameters",
  "authorizationStateWaitEncryptionKey",
  "authorizationStateWaitPhoneNumber"
]);

let configured = false;
let client = null;
let lastAuthorizationState = null;
let lastError = null;
let tdjsonPath = null;

function tdlibRoot() {
  return path.resolve(process.cwd(), ".epicgram", "tdlib");
}

function getClientOptions() {
  const root = tdlibRoot();
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

async function ensureClient() {
  if (client) return client;

  try {
    tdjsonPath = getTdjson();
    if (!configured) {
      tdl.configure({ tdjson: tdjsonPath, verbosityLevel: 1 });
      configured = true;
    }

    await mkdir(path.join(tdlibRoot(), "database"), { recursive: true });
    await mkdir(path.join(tdlibRoot(), "files"), { recursive: true });

    client = tdl.createClient(getClientOptions());
    client.on("update", (update) => {
      if (update?._ === "updateAuthorizationState") {
        lastAuthorizationState = update.authorization_state;
      }
    });
    client.on("error", (error) => {
      lastError = error instanceof Error ? error.message : String(error);
    });
    client.once("close", () => {
      client = null;
      lastAuthorizationState = { _: "authorizationStateClosed" };
    });

    return client;
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

async function closeClient() {
  if (!client) return;
  const closingClient = client;
  client = null;
  try {
    await closingClient.close();
  } finally {
    lastAuthorizationState = { _: "authorizationStateClosed" };
  }
}

function waitForAuthorizationState(predicate, timeoutMs = AUTH_WAIT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    if (predicate(lastAuthorizationState)) {
      resolve(lastAuthorizationState);
      return;
    }

    let timeout = null;
    const onUpdate = (update) => {
      if (update?._ !== "updateAuthorizationState") return;
      const authorizationState = update.authorization_state;
      lastAuthorizationState = authorizationState;
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

async function getCurrentAuthorizationState(tdClient) {
  const authorizationState = await tdClient.invoke({ _: "getAuthorizationState" });
  lastAuthorizationState = authorizationState;
  return authorizationState;
}

async function getStableAuthorizationState(tdClient) {
  const authorizationState = await getCurrentAuthorizationState(tdClient);
  if (!TRANSIENT_AUTH_STATES.has(authorizationState?._)) return authorizationState;
  return waitForAuthorizationState((state) => Boolean(state?._) && !TRANSIENT_AUTH_STATES.has(state._));
}

function formatAccount(user) {
  if (!user) return null;
  const firstName = user.first_name ?? "";
  const lastName = user.last_name ?? "";
  const displayName = `${firstName} ${lastName}`.trim() || user.username || "Telegram account";

  return {
    id: String(user.id),
    displayName,
    username: user.username ? `@${user.username}` : null,
    phoneMasked: user.phone_number ? `+${String(user.phone_number).slice(0, 4)}***${String(user.phone_number).slice(-2)}` : null,
    type: user.type?._ ?? "user"
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

async function getCurrentAccount(tdClient) {
  try {
    return formatAccount(await tdClient.invoke({ _: "getMe" }));
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
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

async function getChatsFromList(tdClient, chatList, list, limit) {
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

export function getTdlibAdapterStatus() {
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
    authorizationState: lastAuthorizationState?._ ?? null,
    lastError,
    requiredMethods: TD_METHODS,
    message: client
      ? "TDLib native adapter is loaded."
      : "TDLib adapter is installed and will load tdjson lazily on the first auth request."
  };
}

export async function getTdlibChats({ limit = 30 } = {}) {
  const tdClient = await ensureClient();
  const authorizationState = await getStableAuthorizationState(tdClient);
  if (!READY_STATES.has(authorizationState?._)) {
    return {
      authorizationState,
      chats: [],
      message: "Telegram account is not authorized yet."
    };
  }

  return {
    authorizationState,
    account: await getCurrentAccount(tdClient),
    chats: await getCurrentChats(tdClient, limit),
    message: "Telegram chats loaded from TDLib."
  };
}

export async function getTdlibMessages({ chatId, limit = 40 } = {}) {
  const tdClient = await ensureClient();
  const authorizationState = await getStableAuthorizationState(tdClient);
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

export async function sendTdlibMessage({ chatId, text } = {}) {
  const cleanText = String(text ?? "").trim();
  if (!chatId) throw new Error("chatId is required");
  if (!cleanText) throw new Error("text is required");

  const tdClient = await ensureClient();
  const authorizationState = await getStableAuthorizationState(tdClient);
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

export async function getTdlibPhotoFile(fileId) {
  const numericFileId = Number(fileId);
  if (!Number.isFinite(numericFileId)) {
    return {
      status: 400,
      body: null,
      contentType: "application/json; charset=utf-8",
      message: "fileId must be numeric"
    };
  }

  const tdClient = await ensureClient();
  const authorizationState = await getStableAuthorizationState(tdClient);
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

export async function requestTdlibQrAuth() {
  const tdClient = await ensureClient();
  const currentAuthorizationState = await getCurrentAuthorizationState(tdClient);

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
  let tdClient = await ensureClient();
  const currentAuthorizationState = await getCurrentAuthorizationState(tdClient);

  if (READY_STATES.has(currentAuthorizationState?._)) {
    return {
      ok: true,
      method: TD_METHODS.phone,
      authorizationState: currentAuthorizationState,
      account: await getCurrentAccount(tdClient),
      message: "Telegram account is already authorized."
    };
  }

  if (options.resetCurrentFlow || currentAuthorizationState?._ === "authorizationStateWaitOtherDeviceConfirmation") {
    await resetTdlibAuthSession({ deleteDatabase: true });
    tdClient = await ensureClient();
    await getCurrentAuthorizationState(tdClient);
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
    (state) => state?._ === "authorizationStateWaitCode" || state?._ === "authorizationStateWaitPassword"
  );

  return {
    ok: true,
    method: TD_METHODS.phone,
    authorizationState,
    account: READY_STATES.has(authorizationState?._) ? await getCurrentAccount(tdClient) : null,
    message: "Telegram phone authorization requested. Check Telegram for the login code."
  };
}

export async function checkTdlibAuthenticationCode(code) {
  const tdClient = await ensureClient();
  await tdClient.invoke({ _: TD_METHODS.code, code });
  const authorizationState = await waitForAuthorizationState((state) =>
    ["authorizationStateReady", "authorizationStateWaitCode", "authorizationStateWaitPassword"].includes(state?._)
  );

  return {
    ok: true,
    method: TD_METHODS.code,
    authorizationState,
    account: READY_STATES.has(authorizationState?._) ? await getCurrentAccount(tdClient) : null,
    message: READY_STATES.has(authorizationState?._)
      ? "Telegram account authorized."
      : "Telegram authentication code submitted."
  };
}

export async function logOutTdlib() {
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
    authorizationState: lastAuthorizationState,
    message: "TDLib logout requested."
  };
}

export async function resetTdlibAuthSession({ deleteDatabase = false } = {}) {
  await closeClient();
  lastError = null;
  tdjsonPath = null;

  if (deleteDatabase) {
    await rm(tdlibRoot(), { recursive: true, force: true });
  }

  return {
    ok: true,
    deletedDatabase: deleteDatabase,
    authorizationState: lastAuthorizationState,
    message: deleteDatabase ? "TDLib local auth database was reset." : "TDLib client was closed."
  };
}

export async function getTdlibSessionSnapshot() {
  const tdClient = await ensureClient();
  const authorizationState = await getStableAuthorizationState(tdClient);

  return {
    authorizationState,
    account: READY_STATES.has(authorizationState?._) ? await getCurrentAccount(tdClient) : null,
    adapter: getTdlibAdapterStatus()
  };
}

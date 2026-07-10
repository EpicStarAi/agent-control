import { mkdir, readFile, rename, copyFile, open } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import {
  checkTdlibAuthenticationCode,
  checkTdlibAuthenticationPassword,
  getTdlibChats,
  getTdlibMessages,
  getTdlibPhotoFile,
  getTdlibSessionSnapshot,
  getTdlibAdapterStatus,
  logOutTdlib,
  requestTdlibPhoneAuth,
  requestTdlibQrAuth,
  resetTdlibAuthSession,
  sendTdlibMessage
} from "./tdlib-adapter.mjs";

const stateDir = path.resolve(process.cwd(), ".epicgram");
const stateFile = path.join(stateDir, "telegram-runtime.json");

const initialState = {
  runtime: "not_configured",
  mode: "local_backend",
  activeAccountId: "main",
  authorizationState: "backend_ready",
  accounts: [{ slotId: "main", label: "Аккаунт 1", status: "waiting_auth" }],
  account: null,
  qrLink: null,
  phoneMasked: null,
  updatedAt: null,
  message: "Backend is running. TDLib runtime is not configured yet."
};

function now() {
  return new Date().toISOString();
}

function maskPhone(phoneNumber) {
  const clean = String(phoneNumber ?? "").replace(/[^\d+]/g, "");
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 4)}***${clean.slice(-2)}`;
}

function safeAccountId(accountId = "main") {
  const raw = String(accountId || "main").trim();
  if (raw === "undefined" || raw === "null") return "main";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "main";
}

function nextAccountLabel(accounts) {
  return `Аккаунт ${Array.isArray(accounts) ? accounts.length + 1 : 1}`;
}

function normalizeAccountSlot(slot, fallbackId = "main", index = 0) {
  const slotId = safeAccountId(slot?.slotId ?? slot?.id ?? fallbackId);
  return {
    slotId,
    id: slot?.id ?? null,
    label: slot?.label ?? slot?.displayName ?? `Аккаунт ${index + 1}`,
    displayName: slot?.displayName ?? null,
    username: slot?.username ?? null,
    phoneMasked: slot?.phoneMasked ?? null,
    status: slot?.status ?? (slot?.displayName ? "ready" : "waiting_auth"),
    authorizationState: slot?.authorizationState ?? null,
    locked: Boolean(slot?.locked),
    active: false
  };
}

function normalizeState(rawState) {
  const merged = { ...initialState, ...rawState };
  const rawAccounts = Array.isArray(merged.accounts) && merged.accounts.length > 0 ? merged.accounts : initialState.accounts;
  const accounts = rawAccounts.map((slot, index) => normalizeAccountSlot(slot, index === 0 ? "main" : `account-${index + 1}`, index));
  const activeAccountId = safeAccountId(merged.activeAccountId ?? accounts[0]?.slotId ?? "main");
  const hasActive = accounts.some((slot) => slot.slotId === activeAccountId);
  const normalizedAccounts = (hasActive ? accounts : [{ ...normalizeAccountSlot(null, activeAccountId, 0), label: nextAccountLabel(accounts) }, ...accounts])
    .map((slot) => ({ ...slot, active: slot.slotId === activeAccountId }));
  const activeAccount = normalizedAccounts.find((slot) => slot.slotId === activeAccountId) ?? normalizedAccounts[0];

  return {
    ...merged,
    activeAccountId,
    accounts: normalizedAccounts,
    account: activeAccount?.displayName ? activeAccount : merged.account ?? null
  };
}

function upsertAccountSlot(state, accountId, patch = {}) {
  const id = safeAccountId(accountId);
  const normalized = normalizeState(state);
  const existing = normalized.accounts.find((slot) => slot.slotId === id);
  const nextSlot = {
    ...(existing ?? normalizeAccountSlot(null, id, normalized.accounts.length)),
    ...patch,
    slotId: id
  };
  const accounts = existing
    ? normalized.accounts.map((slot) => (slot.slotId === id ? nextSlot : slot))
    : [...normalized.accounts, nextSlot];
  return normalizeState({ ...normalized, accounts });
}

function accountIdFromPayload(payload, state) {
  return safeAccountId(payload?.accountId ?? state?.activeAccountId ?? "main");
}

function configuredValue(value) {
  if (!value) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;
  if (normalized === "...") return false;
  if (normalized.startsWith("replace-with-")) return false;
  return true;
}

// PHASE M (RISK-1): serialize every state transaction. The whole
// read -> mutate -> write sequence of each mutating export runs inside this
// lock, so concurrent requests can never interleave and lose updates / corrupt
// the account list. Tasks run strictly one-at-a-time in arrival order; a failing
// task does not break the chain for the next one. Read-only paths (getPhoto)
// do not persist and so are intentionally left lock-free.
let stateMutationChain = Promise.resolve();
function withStateLock(task) {
  const run = stateMutationChain.then(task, task);
  stateMutationChain = run.then(() => undefined, () => undefined);
  return run;
}

// PHASE O: crash-safe JSON write. Writes to a temp file, fsyncs it, backs up the
// current good file to <file>.bak, then atomically renames the temp over the
// target. A crash mid-write can only damage the temp file; the real file is
// always either the previous or the new complete version — never half-written.
async function atomicWriteJson(targetFile, dataString) {
  await mkdir(path.dirname(targetFile), { recursive: true });
  const tmpFile = `${targetFile}.tmp`;
  const handle = await open(tmpFile, "w");
  try {
    await handle.writeFile(dataString, "utf8");
    try { await handle.sync(); } catch { /* fsync unsupported on this fs — best effort */ }
  } finally {
    await handle.close();
  }
  try { await copyFile(targetFile, `${targetFile}.bak`); } catch { /* no prior good file to back up */ }
  await rename(tmpFile, targetFile);
}

async function readState() {
  try {
    const raw = await readFile(stateFile, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    // PHASE O: main state missing/corrupt -> try the .bak backup before falling
    // back to a fresh initial state (which would otherwise drop the accounts).
    try {
      const rawBak = await readFile(`${stateFile}.bak`, "utf8");
      return normalizeState(JSON.parse(rawBak));
    } catch {
      return normalizeState({ ...initialState, updatedAt: now() });
    }
  }
}

async function saveState(nextState) {
  const state = normalizeState({ ...nextState, updatedAt: now() });
  await atomicWriteJson(stateFile, `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

function tdlibConfigured() {
  return missingTdlibConfig().length === 0;
}

function missingTdlibConfig() {
  const missing = [];
  if (process.env.EPICGRAM_TDLIB_ENABLED !== "true") missing.push("EPICGRAM_TDLIB_ENABLED=true");
  if (!configuredValue(process.env.TELEGRAM_API_ID)) missing.push("TELEGRAM_API_ID");
  if (!configuredValue(process.env.TELEGRAM_API_HASH)) missing.push("TELEGRAM_API_HASH");
  if (!configuredValue(process.env.EPICGRAM_TDLIB_DATABASE_KEY)) missing.push("EPICGRAM_TDLIB_DATABASE_KEY");
  return missing;
}

function notConfiguredMessage() {
  const missing = missingTdlibConfig();
  return `TDLib backend is reachable, but real Telegram login is blocked until this local config is set: ${missing.join(", ")}.`;
}

function configDiagnostics(accountId = "main") {
  return {
    tdlibConfigured: tdlibConfigured(),
    missingConfig: missingTdlibConfig(),
    enabled: process.env.EPICGRAM_TDLIB_ENABLED === "true",
    apiIdPresent: configuredValue(process.env.TELEGRAM_API_ID),
    apiHashPresent: configuredValue(process.env.TELEGRAM_API_HASH),
    databaseKeyPresent: configuredValue(process.env.EPICGRAM_TDLIB_DATABASE_KEY),
    adapter: getTdlibAdapterStatus(accountId)
  };
}

function isReadyAuthorizationState(authorizationState) {
  return authorizationState === "authorizationStateReady";
}

async function syncTdlibState(state) {
  if (!tdlibConfigured()) return state;
  const accountId = safeAccountId(state.activeAccountId);

  try {
    const snapshot = await getTdlibSessionSnapshot(accountId);
    const authorizationState = snapshot.authorizationState?._ ?? state.authorizationState;
    if (authorizationState && authorizationState !== state.authorizationState) {
      try {
        const { publish } = await import("./event-bus.mjs");
        publish({ type: "auth.state_changed", runtime: "telegram", accountId, data: { authorizationState } });
      } catch { /* event bus is optional */ }
    }
    const nextState = upsertAccountSlot(state, accountId, {
      ...(snapshot.account ?? {}),
      label: snapshot.account?.displayName ?? state.accounts.find((slot) => slot.slotId === accountId)?.label ?? "Аккаунт",
      status: isReadyAuthorizationState(authorizationState) ? "ready" : "waiting_auth",
      authorizationState
    });

    if (isReadyAuthorizationState(authorizationState)) {
      return saveState({
        ...nextState,
        runtime: "ready",
        authorizationState,
        account: snapshot.account ?? nextState.account,
        qrLink: null,
        message: "Telegram аккаунт авторизован."
      });
    }

    if (authorizationState && authorizationState !== state.authorizationState) {
      return saveState({
        ...nextState,
        runtime: "waiting_auth",
        authorizationState,
        message: nextState.message
      });
    }
  } catch {
    return state;
  }

  return state;
}

export async function getStatus() {
  return withStateLock(async () => {
  const state = await syncTdlibState(await readState());
  const accountId = safeAccountId(state.activeAccountId);
  const activeAccount = state.accounts.find((slot) => slot.slotId === accountId) ?? null;
  const ready = activeAccount?.status === "ready" || isReadyAuthorizationState(state.authorizationState);
  if (!tdlibConfigured()) {
    return {
      ...state,
      runtime: "not_configured",
      ...configDiagnostics(accountId),
      message: notConfiguredMessage()
    };
  }

  return {
    ...state,
    account: activeAccount?.displayName ? activeAccount : state.account,
    runtime: ready ? "ready" : "waiting_auth",
    ...configDiagnostics(accountId),
    message: ready
      ? "Telegram аккаунт авторизован."
      : "TDLib configuration is present. Runtime adapter is ready for TDLib client wiring."
  };
  });
}

export async function createAccountSlot() {
  return withStateLock(async () => {
  const state = await readState();
  const accountId = `account-${Date.now().toString(36)}`;
  const nextState = upsertAccountSlot(
    {
      ...state,
      activeAccountId: accountId,
      qrLink: null,
      phoneMasked: null,
      authorizationState: "backend_ready"
    },
    accountId,
    {
      label: nextAccountLabel(state.accounts),
      status: "waiting_auth",
      authorizationState: "backend_ready"
    }
  );
  const saved = await saveState({
    ...nextState,
    message: "Создан новый слот Telegram-аккаунта. Можно авторизовать QR или номером."
  });
  try {
    const { publish } = await import("./event-bus.mjs");
    publish({ type: "account.created", runtime: "telegram", accountId, data: { activeAccountId: accountId } });
  } catch { /* event bus is optional */ }
  return { status: 201, body: { ...saved, method: "account_new", ...configDiagnostics(accountId) } };
  });
}

export async function selectAccountSlot(payload) {
  return withStateLock(async () => {
  const state = await readState();
  const accountId = accountIdFromPayload(payload, state);
  const nextState = upsertAccountSlot(
    {
      ...state,
      activeAccountId: accountId,
      qrLink: null,
      phoneMasked: null,
      authorizationState: "backend_ready"
    },
    accountId,
    {
      status: state.accounts.find((slot) => slot.slotId === accountId)?.status ?? "waiting_auth"
    }
  );
  const saved = await saveState({ ...nextState, message: "Активный Telegram-аккаунт переключен." });
  try {
    const { publish } = await import("./event-bus.mjs");
    publish({ type: "account.switched", runtime: "telegram", accountId, data: { activeAccountId: accountId } });
    publish({ type: "session.changed", runtime: "telegram", accountId, data: { activeAccountId: accountId } });
  } catch { /* event bus is optional */ }
  return { status: 200, body: { ...saved, method: "account_select", ...configDiagnostics(accountId) } };
  });
}

// P17.2/P17.4: versioned read-only account detail. No state mutation, so it runs
// lock-free (like getPhoto) to avoid stalling the status/chat poll. `slice`
// selects info | storage | devices | statistics from one composite fetch.
export async function getAccountDetail({ accountId, slice = "info" } = {}) {
  const state = await readState();
  const id = safeAccountId(accountId ?? state.activeAccountId);
  if (!tdlibConfigured()) {
    return {
      status: 503,
      body: { slotId: id, tdlibConfigured: false, missingConfig: missingTdlibConfig(), message: notConfiguredMessage() }
    };
  }
  try {
    const { getTdlibAccountDetail } = await import("./tdlib-adapter.mjs");
    const detail = await getTdlibAccountDetail(id);
    const slices = {
      info: detail,
      storage: { slotId: id, storage: detail.storage },
      devices: { slotId: id, devices: detail.devices },
      statistics: { slotId: id, statistics: detail.statistics }
    };
    return { status: 200, body: slices[slice] ?? detail };
  } catch (error) {
    return { status: 500, body: { slotId: id, message: error instanceof Error ? error.message : "account detail failed" } };
  }
}

// P19.2: Identity/Accounts facade. Thin, read-mostly helpers over the slot
// registry so every client (Web/Desktop/Android) shares one account model.
// `lock` is a slot flag + event (account.locked/unlocked); send-enforcement on a
// locked slot is a later increment.
export async function listAccounts() {
  const state = normalizeState(await readState());
  return { status: 200, body: { accounts: state.accounts, activeAccountId: state.activeAccountId, active: state.account ?? null } };
}

export async function getCurrentAccount() {
  const state = normalizeState(await readState());
  const active = state.accounts.find((slot) => slot.slotId === state.activeAccountId) ?? null;
  return { status: 200, body: { activeAccountId: state.activeAccountId, account: active } };
}

export async function lockAccountSlot({ accountId, locked = true } = {}) {
  return withStateLock(async () => {
    const state = await readState();
    const id = safeAccountId(accountId ?? state.activeAccountId);
    const exists = normalizeState(state).accounts.some((slot) => slot.slotId === id);
    if (!exists) return { status: 404, body: { slotId: id, message: "Такого слота нет." } };
    const saved = await saveState(upsertAccountSlot(state, id, { locked: Boolean(locked) }));
    try {
      const { publish } = await import("./event-bus.mjs");
      publish({ type: locked ? "account.locked" : "account.unlocked", runtime: "telegram", accountId: id, data: { locked: Boolean(locked) } });
    } catch { /* event bus is optional */ }
    return { status: 200, body: { ...saved, method: locked ? "account_lock" : "account_unlock", slotId: id } };
  });
}

// P22A: versioned read-only Telegram data. `dialogs` reuses getChats (real
// TDLib). `saved`/`drafts` return honest structured empty states until backed by
// TDLib — never faked. All read-only; no send/scrape/mass/bypass.
export async function getDialogs({ accountId } = {}) {
  const r = await getChats({ accountId });
  const chats = Array.isArray(r.body?.chats) ? r.body.chats : [];
  const isCh = (c) => c.category === "channel" || c.isChannel;
  const isGr = (c) => c.category === "group";
  const isBot = (c) => c.category === "bot" || c.isBot;
  const isPer = (c) => c.category === "private" || c.category === "bot";
  const counts = {
    all: chats.length,
    chats: chats.filter(isPer).length,
    channels: chats.filter(isCh).length,
    groups: chats.filter(isGr).length,
    bots: chats.filter(isBot).length,
    saved: 0,
    drafts: 0
  };
  return {
    status: r.status,
    body: {
      slotId: safeAccountId(accountId ?? r.body?.activeAccountId),
      ready: r.status === 200,
      source: "tdlib",
      counts,
      dialogs: chats,
      message: r.body?.message ?? null
    }
  };
}

export async function getSaved({ accountId } = {}) {
  return {
    status: 200,
    body: {
      slotId: safeAccountId(accountId),
      available: false,
      items: [],
      message: "Saved Messages read endpoint пока не реализован (TDLib self-chat) — честная заглушка, данные не подделываются."
    }
  };
}

export async function getDrafts({ accountId } = {}) {
  return {
    status: 200,
    body: {
      slotId: safeAccountId(accountId),
      available: false,
      items: [],
      message: "Drafts read endpoint пока не реализован — честная заглушка, данные не подделываются."
    }
  };
}

export async function removeAccountSlot(payload) {
  return withStateLock(async () => {
  const state = await readState();
  const normalized = normalizeState(state);
  const accountId = safeAccountId(payload?.accountId ?? normalized.activeAccountId ?? "main");
  const remaining = normalized.accounts.filter((slot) => slot.slotId !== accountId);
  if (remaining.length === normalized.accounts.length) {
    return { status: 404, body: { ...normalized, method: "account_remove", message: "Такого слота нет." } };
  }
  if (remaining.length === 0) {
    return { status: 400, body: { ...normalized, method: "account_remove", message: "Нельзя удалить единственный аккаунт." } };
  }
  // Actually wipe the TDLib session/database for this slot so it does not
  // reappear on the next status sync.
  try {
    await resetTdlibAuthSession({ accountId, deleteDatabase: true });
  } catch {
    // Still remove the slot from local state even if TDLib is already stopped.
  }
  const wasActive = normalized.activeAccountId === accountId;
  const nextActive = wasActive ? remaining[0].slotId : normalized.activeAccountId;
  const saved = await saveState({
    ...normalized,
    accounts: remaining,
    activeAccountId: nextActive,
    qrLink: null,
    phoneMasked: null,
    message: "Слот Telegram-аккаунта удалён."
  });
  try {
    const { publish } = await import("./event-bus.mjs");
    publish({ type: "account.removed", runtime: "telegram", accountId, data: { activeAccountId: nextActive } });
  } catch { /* event bus is optional */ }
  return { status: 200, body: { ...saved, method: "account_remove", ...configDiagnostics(nextActive) } };
  });
}

// PHASE O: explicit, opt-in maintenance. Removes ONLY stale unauthorized slots
// (not "ready", no displayName, and not the active account). NEVER runs
// automatically and NEVER removes an authorized account. Not wired to any route;
// call deliberately from a maintenance script if needed.
export async function cleanupStaleSlots() {
  return withStateLock(async () => {
    const state = normalizeState(await readState());
    const kept = state.accounts.filter((slot) =>
      slot.status === "ready" || Boolean(slot.displayName) || slot.slotId === state.activeAccountId
    );
    const removed = state.accounts.length - kept.length;
    if (removed === 0) {
      return { status: 200, body: { ...state, method: "cleanup", removed: 0, message: "Нет устаревших слотов для очистки." } };
    }
    const saved = await saveState({ ...state, accounts: kept });
    return { status: 200, body: { ...saved, method: "cleanup", removed, message: `Очищено устаревших waiting_auth слотов: ${removed}.` } };
  });
}

export async function getConfig() {
  const state = await readState();
  const accountId = safeAccountId(state.activeAccountId);
  return {
    runtime: tdlibConfigured() ? "config_ready" : "not_configured",
    ...configDiagnostics(accountId),
    message: tdlibConfigured()
      ? "Local TDLib config is present. Native TDLib adapter is the next required layer."
      : notConfiguredMessage()
  };
}

export async function getChats({ accountId: requestedAccountId } = {}) {
  return withStateLock(async () => {
  const state = await syncTdlibState(await readState());
  const accountId = safeAccountId(requestedAccountId ?? state.activeAccountId);
  if (!tdlibConfigured()) {
    return {
      status: 503,
      body: {
        ...state,
        tdlibConfigured: false,
        missingConfig: missingTdlibConfig(),
        chats: [],
        message: notConfiguredMessage()
      }
    };
  }

  try {
    const result = await getTdlibChats({ accountId, limit: 40 });
    const nextState = result.account
      ? await saveState(upsertAccountSlot(state, accountId, {
          ...result.account,
          label: result.account.displayName,
          status: "ready",
          authorizationState: result.authorizationState?._
        }))
      : state;
    return {
      status: isReadyAuthorizationState(result.authorizationState?._) ? 200 : 401,
      body: {
        ...nextState,
        runtime: isReadyAuthorizationState(result.authorizationState?._) ? "ready" : "waiting_auth",
        authorizationState: result.authorizationState?._ ?? state.authorizationState,
        account: result.account ?? nextState.account ?? null,
        chats: result.chats,
        chatsCount: result.chats.length,
        adapter: getTdlibAdapterStatus(accountId),
        message: result.message
      }
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ...state,
        chats: [],
        chatsCount: 0,
        adapter: getTdlibAdapterStatus(accountId),
        message: error instanceof Error ? error.message : "TDLib chat loading failed."
      }
    };
  }
  });
}

export async function getMessages({ accountId: requestedAccountId, chatId }) {
  return withStateLock(async () => {
  const state = await syncTdlibState(await readState());
  const accountId = safeAccountId(requestedAccountId ?? state.activeAccountId);
  if (!chatId) {
    return {
      status: 400,
      body: {
        ...state,
        messages: [],
        message: "chatId is required"
      }
    };
  }

  if (!tdlibConfigured()) {
    return {
      status: 503,
      body: {
        ...state,
        tdlibConfigured: false,
        missingConfig: missingTdlibConfig(),
        messages: [],
        message: notConfiguredMessage()
      }
    };
  }

  try {
    const result = await getTdlibMessages({ accountId, chatId, limit: 40 });
    return {
      status: isReadyAuthorizationState(result.authorizationState?._) ? 200 : 401,
      body: {
        ...state,
        runtime: isReadyAuthorizationState(result.authorizationState?._) ? "ready" : "waiting_auth",
        authorizationState: result.authorizationState?._ ?? state.authorizationState,
        messages: result.messages,
        messagesCount: result.messages.length,
        totalCount: result.totalCount,
        adapter: getTdlibAdapterStatus(accountId),
        message: result.message
      }
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ...state,
        messages: [],
        messagesCount: 0,
        adapter: getTdlibAdapterStatus(accountId),
        message: error instanceof Error ? error.message : "TDLib message loading failed."
      }
    };
  }
  });
}

export async function getPhoto({ accountId: requestedAccountId, fileId }) {
  const state = await readState();
  const accountId = safeAccountId(requestedAccountId ?? state.activeAccountId);
  if (!fileId) {
    return {
      status: 400,
      body: Buffer.from(JSON.stringify({ message: "fileId is required" })),
      contentType: "application/json; charset=utf-8"
    };
  }

  try {
    return await getTdlibPhotoFile(fileId, accountId);
  } catch (error) {
    return {
      status: 500,
      body: Buffer.from(JSON.stringify({ message: error instanceof Error ? error.message : "TDLib photo loading failed." })),
      contentType: "application/json; charset=utf-8"
    };
  }
}

// PHASE N.1: render the already-issued QR login link as a PNG so a browser can
// display it directly. READ-ONLY: it reads the existing state.qrLink (set by a
// prior requestQrAuth) and never starts or mutates an auth flow, so it needs no
// state lock. Returns 404 if no active QR link is present.
export async function getQrImage() {
  const state = await readState();
  const qrLink = state.qrLink;
  if (!qrLink) {
    return {
      status: 404,
      body: Buffer.from(JSON.stringify({ message: "Нет активной QR-ссылки. Сначала вызовите POST /telegram/auth/qr." })),
      contentType: "application/json; charset=utf-8"
    };
  }
  try {
    const png = await QRCode.toBuffer(qrLink, { type: "png", width: 320, margin: 2, errorCorrectionLevel: "M" });
    return { status: 200, body: png, contentType: "image/png" };
  } catch (error) {
    return {
      status: 500,
      body: Buffer.from(JSON.stringify({ message: error instanceof Error ? error.message : "QR image generation failed." })),
      contentType: "application/json; charset=utf-8"
    };
  }
}

export async function requestQrAuth(payload = {}) {
  return withStateLock(async () => {
  const state = await readState();
  const accountId = accountIdFromPayload(payload, state);
  if (!tdlibConfigured()) {
    return {
      status: 503,
      body: {
        ...state,
        method: "qr",
        runtime: "not_configured",
        tdlibConfigured: false,
        missingConfig: missingTdlibConfig(),
        message: notConfiguredMessage()
      }
    };
  }

  const adapterStatus = getTdlibAdapterStatus(accountId);
  if (
    state.qrLink &&
    adapterStatus.nativeBindingLoaded &&
    adapterStatus.authorizationState === "authorizationStateWaitOtherDeviceConfirmation"
  ) {
    return {
      status: 202,
      body: {
        ...state,
        method: "qr",
        runtime: "waiting_auth",
        adapter: adapterStatus,
        message: "QR авторизация уже ожидает подтверждение в Telegram. Отсканируйте текущий код."
      }
    };
  }

  try {
    const result = await requestTdlibQrAuth(accountId);
    const nextState = await saveState(upsertAccountSlot({
      ...state,
      activeAccountId: accountId,
      runtime: isReadyAuthorizationState(result.authorizationState?._) ? "ready" : "waiting_auth",
      authorizationState: result.authorizationState?._ ?? "wait_other_device_confirmation",
      qrLink: result.qrLink ?? null,
      message: result.message
    }, accountId, {
      status: isReadyAuthorizationState(result.authorizationState?._) ? "ready" : "waiting_auth",
      authorizationState: result.authorizationState?._ ?? "wait_other_device_confirmation",
      ...(result.account ?? {})
    }));

    return {
      status: 202,
      body: {
        ...nextState,
        method: "qr",
        adapter: getTdlibAdapterStatus(accountId)
      }
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ...state,
        method: "qr",
        runtime: "error",
        adapter: getTdlibAdapterStatus(accountId),
        message: error instanceof Error ? error.message : "TDLib QR authorization failed."
      }
    };
  }
  });
}

export async function requestPhoneAuth(payload) {
  return withStateLock(async () => {
  const phoneNumber = payload?.phoneNumber;
  if (!phoneNumber) {
    return { status: 400, body: { message: "phoneNumber is required" } };
  }

  const state = await readState();
  const accountId = accountIdFromPayload(payload, state);
  const phoneMasked = maskPhone(phoneNumber);

  if (!tdlibConfigured()) {
    return {
      status: 503,
      body: {
        ...state,
        method: "phone",
        runtime: "not_configured",
        tdlibConfigured: false,
        missingConfig: missingTdlibConfig(),
        phoneMasked,
        message: notConfiguredMessage()
      }
    };
  }

  try {
    const result = await requestTdlibPhoneAuth(phoneNumber, { accountId, resetCurrentFlow: true });
    const nextState = await saveState(upsertAccountSlot({
      ...state,
      activeAccountId: accountId,
      runtime: isReadyAuthorizationState(result.authorizationState?._) ? "ready" : "waiting_auth",
      authorizationState: result.authorizationState?._ ?? "wait_code",
      phoneMasked,
      message: result.message
    }, accountId, {
      phoneMasked,
      status: isReadyAuthorizationState(result.authorizationState?._) ? "ready" : "waiting_auth",
      authorizationState: result.authorizationState?._ ?? "wait_code",
      ...(result.account ?? {})
    }));

    return {
      status: 202,
      body: {
        ...nextState,
        method: "phone",
        adapter: getTdlibAdapterStatus(accountId)
      }
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ...state,
        method: "phone",
        runtime: "error",
        phoneMasked,
        adapter: getTdlibAdapterStatus(accountId),
        message: error instanceof Error ? error.message : "TDLib phone authorization failed."
      }
    };
  }
  });
}

export async function verifyCode(payload) {
  return withStateLock(async () => {
  const code = payload?.code;
  if (!code) {
    return { status: 400, body: { message: "code is required" } };
  }

  const state = await readState();
  const accountId = accountIdFromPayload(payload, state);
  if (!tdlibConfigured()) {
    return {
      status: 503,
      body: {
        ...state,
        runtime: "not_configured",
        tdlibConfigured: false,
        missingConfig: missingTdlibConfig(),
        message: notConfiguredMessage()
      }
    };
  }

  try {
    const result = await checkTdlibAuthenticationCode(code, accountId);
    const nextState = await saveState(upsertAccountSlot({
      ...state,
      activeAccountId: accountId,
      runtime: isReadyAuthorizationState(result.authorizationState?._) ? "ready" : "waiting_auth",
      authorizationState: result.authorizationState?._ ?? "wait_code",
      qrLink: isReadyAuthorizationState(result.authorizationState?._) ? null : state.qrLink,
      message: result.message
    }, accountId, {
      status: isReadyAuthorizationState(result.authorizationState?._) ? "ready" : "waiting_auth",
      authorizationState: result.authorizationState?._ ?? "wait_code",
      ...(result.account ?? {})
    }));

    return {
      status: 202,
      body: {
        ...nextState,
        adapter: getTdlibAdapterStatus(accountId),
        message: result.message
      }
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ...state,
        runtime: "error",
        adapter: getTdlibAdapterStatus(accountId),
        message: error instanceof Error ? error.message : "TDLib code verification failed."
      }
    };
  }
  });
}

export async function verify2fa(payload) {
  return withStateLock(async () => {
  const password = payload?.password;
  if (!password) {
    return { status: 400, body: { message: "password is required" } };
  }

  const state = await readState();
  const accountId = accountIdFromPayload(payload, state);
  if (!tdlibConfigured()) {
    return {
      status: 503,
      body: {
        ...state,
        runtime: "not_configured",
        tdlibConfigured: false,
        missingConfig: missingTdlibConfig(),
        message: notConfiguredMessage()
      }
    };
  }

  try {
    const result = await checkTdlibAuthenticationPassword(password, accountId);
    const ready = isReadyAuthorizationState(result.authorizationState?._);
    const nextState = await saveState(upsertAccountSlot({
      ...state,
      activeAccountId: accountId,
      runtime: ready ? "ready" : "waiting_auth",
      authorizationState: result.authorizationState?._ ?? "wait_password",
      qrLink: ready ? null : state.qrLink,
      message: result.message
    }, accountId, {
      status: ready ? "ready" : "waiting_auth",
      authorizationState: result.authorizationState?._ ?? "wait_password",
      ...(result.account ?? {})
    }));

    return {
      status: 202,
      body: {
        ...nextState,
        adapter: getTdlibAdapterStatus(accountId),
        message: result.message
      }
    };
  } catch (error) {
    return {
      status: 500,
      body: {
        ...state,
        runtime: "error",
        adapter: getTdlibAdapterStatus(accountId),
        message: error instanceof Error ? error.message : "TDLib 2FA verification failed."
      }
    };
  }
  });
}

export async function logout(payload = {}) {
  return withStateLock(async () => {
  const currentState = await readState();
  const accountId = accountIdFromPayload(payload, currentState);
  try {
    await logOutTdlib(accountId);
  } catch {
    // Continue clearing local runtime state even if TDLib is already stopped.
  }

  const state = await saveState(upsertAccountSlot({
    ...currentState,
    runtime: tdlibConfigured() ? "waiting_auth" : "not_configured",
    authorizationState: "backend_ready",
    qrLink: null,
    phoneMasked: null,
    message: tdlibConfigured() ? "Local runtime state cleared." : notConfiguredMessage()
  }, accountId, { status: "waiting_auth", authorizationState: "backend_ready", displayName: null, username: null }));

  return { status: 200, body: state };
  });
}

export async function resetAuth(payload = {}) {
  return withStateLock(async () => {
  const currentState = await readState();
  const accountId = accountIdFromPayload(payload, currentState);
  try {
    await resetTdlibAuthSession({ accountId, deleteDatabase: true });
  } catch {
    // Local runtime state still needs to be cleared even if TDLib is already stopped.
  }

  const state = await saveState(upsertAccountSlot({
    ...currentState,
    runtime: tdlibConfigured() ? "waiting_auth" : "not_configured",
    authorizationState: tdlibConfigured() ? "backend_ready" : "not_configured",
    qrLink: null,
    phoneMasked: null,
    message: tdlibConfigured()
      ? "Авторизация сброшена. Можно запросить новый QR или код по номеру."
      : notConfiguredMessage()
  }, accountId, { status: "waiting_auth", authorizationState: "backend_ready", displayName: null, username: null, phoneMasked: null }));

  return {
    status: 202,
    body: {
      ...state,
      method: "reset",
      ...configDiagnostics(accountId)
    }
  };
  });
}

const outboxFile = path.join(stateDir, "outbox.json");

async function appendOutbox(entry) {
  // PHASE M (RISK-1): outbox.json has the same read-modify-write hazard as the
  // state file, so its append runs under the same serialization lock. Callers
  // (sendMessage) are NOT wrapped, so there is no nested-lock deadlock.
  return withStateLock(async () => {
  let log = [];
  try {
    log = JSON.parse(await readFile(outboxFile, "utf8"));
    if (!Array.isArray(log)) log = [];
  } catch {
    log = [];
  }
  log.push({ ...entry, at: now() });
  await atomicWriteJson(outboxFile, `${JSON.stringify(log.slice(-500), null, 2)}\n`);
  });
}

// Operator-gated outbound send.
//
// SAFETY: this is the ONLY path that writes to Telegram, and it only proceeds
// when the request carries an explicit operator approval flag (the human
// clicking "Отправить" in the UI). The AI layer never calls this. The configured
// EPICGRAM_AI_SEND_MODE is honored and never weakened: any value other than an
// explicit auto mode requires the operator approval flag to be present.
export async function sendMessage(payload) {
  const state = await readState();
  const accountId = accountIdFromPayload(payload, state);
  const chatId = payload?.chatId;
  const text = String(payload?.text ?? "").trim();
  const operatorApproved = payload?.operatorApproved === true;
  const sendMode = process.env.EPICGRAM_AI_SEND_MODE || "operator_approval_required";

  if (!chatId) return { status: 400, body: { message: "chatId is required" } };
  if (!text) return { status: 400, body: { message: "text is required" } };

  if (!tdlibConfigured()) {
    return {
      status: 503,
      body: { tdlibConfigured: false, missingConfig: missingTdlibConfig(), message: notConfiguredMessage() }
    };
  }

  // Approval gate. Only an explicit "auto_send" mode could bypass operator
  // approval — and we ship "operator_approval_required", so a missing approval
  // flag is always rejected here.
  const autoSendAllowed = sendMode === "auto_send";
  if (!operatorApproved && !autoSendAllowed) {
    await appendOutbox({ chatId: String(chatId), text, status: "blocked_no_approval", sendMode });
    return {
      status: 412,
      body: {
        sent: false,
        sendMode,
        message:
          "Отправка заблокирована approval-гейтом. Нужно явное подтверждение оператора (operatorApproved=true)."
      }
    };
  }

  try {
    const result = await sendTdlibMessage({ accountId, chatId, text });
    if (!result.ok) {
      await appendOutbox({ chatId: String(chatId), text, status: "failed", reason: result.message, sendMode });
      return { status: 409, body: { sent: false, sendMode, message: result.message } };
    }
    await appendOutbox({
      chatId: String(chatId),
      text,
      status: "sent",
      sendMode,
      approvedBy: process.env.EPICGRAM_OPERATOR_EMAIL || "operator"
    });
    return {
      status: 200,
      body: { sent: true, sendMode, sentMessage: result.sentMessage, message: "Сообщение отправлено в Telegram." }
    };
  } catch (error) {
    await appendOutbox({
      chatId: String(chatId),
      text,
      status: "error",
      reason: error instanceof Error ? error.message : String(error),
      sendMode
    });
    return {
      status: 500,
      body: { sent: false, sendMode, message: error instanceof Error ? error.message : "TDLib send failed." }
    };
  }
}

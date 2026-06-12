import { mkdir, rm } from "node:fs/promises";
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

async function getCurrentAccount(tdClient) {
  try {
    return formatAccount(await tdClient.invoke({ _: "getMe" }));
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    return null;
  }
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
  const authorizationState = await getCurrentAuthorizationState(tdClient);

  return {
    authorizationState,
    account: READY_STATES.has(authorizationState?._) ? await getCurrentAccount(tdClient) : null,
    adapter: getTdlibAdapterStatus()
  };
}

import { mkdir } from "node:fs/promises";
import path from "node:path";
import * as tdl from "tdl";
import { getTdjson, getTdlibInfo } from "prebuilt-tdlib";

export const TD_METHODS = {
  qr: "requestQrCodeAuthentication",
  phone: "setAuthenticationPhoneNumber",
  code: "checkAuthenticationCode",
  logout: "logOut"
};

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
  const currentAuthorizationState = await tdClient.invoke({ _: "getAuthorizationState" });
  lastAuthorizationState = currentAuthorizationState;

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
  return {
    ok: true,
    method: TD_METHODS.qr,
    authorizationState: lastAuthorizationState,
    qrLink: lastAuthorizationState?._ === "authorizationStateWaitOtherDeviceConfirmation" ? lastAuthorizationState.link : null,
    message: "TDLib QR authorization requested. Wait for authorizationStateWaitOtherDeviceConfirmation."
  };
}

export async function requestTdlibPhoneAuth(phoneNumber) {
  const tdClient = await ensureClient();
  await tdClient.invoke({ _: TD_METHODS.phone, phone_number: phoneNumber });
  return {
    ok: true,
    method: TD_METHODS.phone,
    authorizationState: lastAuthorizationState,
    message: "Telegram phone authorization requested. Check Telegram for the login code."
  };
}

export async function checkTdlibAuthenticationCode(code) {
  const tdClient = await ensureClient();
  await tdClient.invoke({ _: TD_METHODS.code, code });
  return {
    ok: true,
    method: TD_METHODS.code,
    authorizationState: lastAuthorizationState,
    message: "Telegram authentication code submitted."
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

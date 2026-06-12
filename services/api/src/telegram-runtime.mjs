import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  checkTdlibAuthenticationCode,
  getTdlibAdapterStatus,
  requestTdlibPhoneAuth,
  requestTdlibQrAuth
} from "./tdlib-adapter.mjs";

const stateDir = path.resolve(process.cwd(), ".epicgram");
const stateFile = path.join(stateDir, "telegram-runtime.json");

const initialState = {
  runtime: "not_configured",
  mode: "local_backend",
  authorizationState: "backend_ready",
  accounts: [],
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

function configuredValue(value) {
  if (!value) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;
  if (normalized === "...") return false;
  if (normalized.startsWith("replace-with-")) return false;
  return true;
}

async function readState() {
  try {
    const raw = await readFile(stateFile, "utf8");
    return { ...initialState, ...JSON.parse(raw) };
  } catch {
    return { ...initialState, updatedAt: now() };
  }
}

async function saveState(nextState) {
  await mkdir(stateDir, { recursive: true });
  const state = { ...nextState, updatedAt: now() };
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
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

function configDiagnostics() {
  return {
    tdlibConfigured: tdlibConfigured(),
    missingConfig: missingTdlibConfig(),
    enabled: process.env.EPICGRAM_TDLIB_ENABLED === "true",
    apiIdPresent: configuredValue(process.env.TELEGRAM_API_ID),
    apiHashPresent: configuredValue(process.env.TELEGRAM_API_HASH),
    databaseKeyPresent: configuredValue(process.env.EPICGRAM_TDLIB_DATABASE_KEY),
    adapter: getTdlibAdapterStatus()
  };
}

export async function getStatus() {
  const state = await readState();
  if (!tdlibConfigured()) {
    return {
      ...state,
      runtime: "not_configured",
      ...configDiagnostics(),
      message: notConfiguredMessage()
    };
  }

  return {
    ...state,
    runtime: state.accounts.length > 0 ? "ready" : "waiting_auth",
    ...configDiagnostics(),
    message: "TDLib configuration is present. Runtime adapter is ready for TDLib client wiring."
  };
}

export async function getConfig() {
  return {
    runtime: tdlibConfigured() ? "config_ready" : "not_configured",
    ...configDiagnostics(),
    message: tdlibConfigured()
      ? "Local TDLib config is present. Native TDLib adapter is the next required layer."
      : notConfiguredMessage()
  };
}

export async function requestQrAuth() {
  const state = await readState();
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

  const nextState = await saveState({
    ...state,
    runtime: "waiting_auth",
    authorizationState: "wait_other_device_confirmation",
    qrLink: null,
    message: (await requestTdlibQrAuth()).message
  });

  return {
    status: 202,
    body: {
      ...nextState,
      method: "qr"
    }
  };
}

export async function requestPhoneAuth(payload) {
  const phoneNumber = payload?.phoneNumber;
  if (!phoneNumber) {
    return { status: 400, body: { message: "phoneNumber is required" } };
  }

  const state = await readState();
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

  const nextState = await saveState({
    ...state,
    runtime: "waiting_auth",
    authorizationState: "wait_code",
    phoneMasked,
    message: (await requestTdlibPhoneAuth()).message
  });

  return {
    status: 202,
    body: {
      ...nextState,
      method: "phone"
    }
  };
}

export async function verifyCode(payload) {
  const code = payload?.code;
  if (!code) {
    return { status: 400, body: { message: "code is required" } };
  }

  const state = await readState();
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

  return {
    status: 202,
    body: {
      ...state,
      runtime: "waiting_auth",
      authorizationState: "wait_code",
      message: (await checkTdlibAuthenticationCode()).message
    }
  };
}

export async function logout() {
  const state = await saveState({
    ...initialState,
    runtime: tdlibConfigured() ? "waiting_auth" : "not_configured",
    authorizationState: "backend_ready",
    message: tdlibConfigured() ? "Local runtime state cleared." : notConfiguredMessage()
  });

  return { status: 200, body: state };
}

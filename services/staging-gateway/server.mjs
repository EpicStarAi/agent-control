import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const JSON_LIMIT_BYTES = 16 * 1024 * 1024;
const REQUEST_LIMIT_BYTES = 64 * 1024;
const NO_STORE_HEADERS = {
  "cache-control": "private, no-store, max-age=0, must-revalidate",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "x-epicgram-gateway": "owner-scoped",
};
const PRIVATE_RESPONSE_KEYS = new Set([
  "apihash",
  "apiid",
  "databasekey",
  "databasedirectory",
  "databasepath",
  "filesdirectory",
  "filespath",
  "phonenumber",
  "session",
  "sessionpath",
]);

function json(response, status, body) {
  response.writeHead(status, { ...NO_STORE_HEADERS, "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function tokenMatches(actual, expected) {
  const left = crypto.createHash("sha256").update(String(actual)).digest();
  const right = crypto.createHash("sha256").update(String(expected)).digest();
  return crypto.timingSafeEqual(left, right);
}

function bearerToken(request) {
  const value = String(request.headers.authorization || "");
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function validateConfig(input = process.env) {
  const token = String(input.EPICGRAM_STAGING_GATEWAY_TOKEN || "").trim();
  const sendToken = String(input.EPICGRAM_STAGING_SEND_TOKEN || "").trim();
  const internalSendSecret = String(input.EPICGRAM_STAGING_INTERNAL_SEND_SECRET || "").trim();
  const allowLegacyApproval = String(input.EPICGRAM_STAGING_ALLOW_LEGACY_APPROVAL || "").trim().toLowerCase() === "true";
  const accountId = String(input.EPICGRAM_STAGING_ACCOUNT_ID || "").trim();
  const accountAlias = String(input.EPICGRAM_STAGING_ACCOUNT_ALIAS || "owner").trim();
  const upstream = new URL(String(input.EPICGRAM_STAGING_UPSTREAM || "http://127.0.0.1:8788"));
  const stateFile = path.resolve(String(input.EPICGRAM_STAGING_STATE_FILE || "/var/lib/epicgram-staging-gateway/accounts.json"));
  const auditFile = path.resolve(String(input.EPICGRAM_STAGING_AUDIT_FILE || "/var/lib/epicgram-staging-gateway/audit.jsonl"));

  if (token.length < 32) throw new Error("EPICGRAM_STAGING_GATEWAY_TOKEN must contain at least 32 characters");
  if (!accountId) throw new Error("EPICGRAM_STAGING_ACCOUNT_ID is required");
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(accountAlias)) throw new Error("EPICGRAM_STAGING_ACCOUNT_ALIAS is invalid");
  if (upstream.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(upstream.hostname)) {
    throw new Error("EPICGRAM_STAGING_UPSTREAM must be an HTTP loopback URL");
  }

  return {
    token,
    sendToken,
    internalSendSecret,
    allowLegacyApproval,
    accountId,
    accountAlias,
    upstream,
    stateFile,
    auditFile,
    host: String(input.HOST || "127.0.0.1"),
    port: Number(input.PORT || 8798),
  };
}

function appendAudit(config, event) {
  fs.mkdirSync(path.dirname(config.auditFile), { recursive: true, mode: 0o700 });
  fs.appendFileSync(config.auditFile, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`, { mode: 0o600 });
  fs.chmodSync(config.auditFile, 0o600);
}

function validAlias(value) {
  return /^[a-zA-Z0-9_-]{1,64}$/.test(String(value || ""));
}

function validAccountId(value) {
  return /^[a-zA-Z0-9_-]{1,160}$/.test(String(value || ""));
}

function initialState(config) {
  return {
    version: 1,
    activeAlias: config.accountAlias,
    accounts: [{ alias: config.accountAlias, accountId: config.accountId, createdAt: new Date().toISOString() }],
  };
}

function normalizeState(config, input) {
  const accounts = [];
  const seenAliases = new Set();
  const seenIds = new Set();
  for (const item of Array.isArray(input?.accounts) ? input.accounts : []) {
    const alias = String(item?.alias || "");
    const accountId = String(item?.accountId || "");
    if (!validAlias(alias) || !validAccountId(accountId) || seenAliases.has(alias) || seenIds.has(accountId)) continue;
    seenAliases.add(alias);
    seenIds.add(accountId);
    accounts.push({ alias, accountId, createdAt: String(item?.createdAt || new Date().toISOString()) });
  }
  const activeAlias = accounts.some((item) => item.alias === input?.activeAlias)
    ? input.activeAlias
    : accounts[0]?.alias ?? null;
  return { version: 1, activeAlias, accounts };
}

function saveState(config, state) {
  fs.mkdirSync(path.dirname(config.stateFile), { recursive: true, mode: 0o700 });
  const temp = `${config.stateFile}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, config.stateFile);
  fs.chmodSync(config.stateFile, 0o600);
}

function loadState(config) {
  if (!fs.existsSync(config.stateFile)) {
    const state = initialState(config);
    saveState(config, state);
    return state;
  }
  try {
    return normalizeState(config, JSON.parse(fs.readFileSync(config.stateFile, "utf8")));
  } catch {
    throw new Error("gateway_state_unavailable");
  }
}

function mappingForAlias(state, alias) {
  return state.accounts.find((item) => item.alias === alias) || null;
}

function requestedAlias(state, body = {}) {
  const requested = String(body.accountId ?? body.id ?? body.slotId ?? state.activeAlias ?? "").trim();
  return validAlias(requested) ? requested : "";
}

function newAlias(state) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const alias = `account-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
    if (!mappingForAlias(state, alias)) return alias;
  }
  throw new Error("alias_generation_failed");
}

async function readRequestJson(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > REQUEST_LIMIT_BYTES) throw new Error("request_too_large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function readUpstreamJson(response) {
  const length = Number(response.headers.get("content-length") || 0);
  if (length > JSON_LIMIT_BYTES) throw new Error("upstream_response_too_large");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > JSON_LIMIT_BYTES) throw new Error("upstream_response_too_large");
  return JSON.parse(buffer.toString("utf8"));
}

async function requestUpstream(config, pathname, { method = "GET", searchParams, body, headers } = {}) {
  const url = new URL(pathname, config.upstream);
  for (const [key, value] of searchParams || []) url.searchParams.set(key, value);
  return fetch(url, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...(headers || {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
}

function sanitizeValue(value, state) {
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, state));
  if (value && typeof value === "object") {
    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (PRIVATE_RESPONSE_KEYS.has(key.toLowerCase())) continue;
      output[key] = sanitizeValue(item, state);
    }
    return output;
  }
  if (typeof value !== "string") return value;
  let output = value;
  for (const mapping of state.accounts) output = output.split(mapping.accountId).join(mapping.alias);
  return output;
}

function publicAccount(mapping, account, activeAlias) {
  const identity = account?.account && typeof account.account === "object" ? account.account : {};
  const online = account?.online === true || account?.authorizationState === "authorizationStateReady";
  return {
    id: mapping.alias,
    slotId: mapping.alias,
    label: account?.label || "EPICGRAM account",
    online,
    status: online ? "ready" : "waiting_auth",
    authorizationState: account?.authorizationState || "unknown",
    active: mapping.alias === activeAlias,
    account: {
      displayName: identity.displayName || account?.displayName || "Telegram",
      username: identity.username || account?.username || null,
      phoneMasked: identity.phoneMasked || account?.phoneMasked || null,
    },
    displayName: identity.displayName || account?.displayName || "Telegram",
    username: identity.username || account?.username || null,
    phoneMasked: identity.phoneMasked || account?.phoneMasked || null,
  };
}

async function listPublicAccounts(config, state) {
  const upstream = await requestUpstream(config, "/telegram/accounts");
  if (!upstream.ok) throw new Error(`upstream_accounts_${upstream.status}`);
  const body = await readUpstreamJson(upstream);
  const upstreamAccounts = Array.isArray(body?.accounts) ? body.accounts : [];
  return state.accounts.map((mapping) => {
    const account = upstreamAccounts.find((item) => String(item?.id ?? item?.slotId ?? "") === mapping.accountId);
    return publicAccount(mapping, account, state.activeAlias);
  });
}

async function statusBody(config, state, extra = {}) {
  const accounts = await listPublicAccounts(config, state);
  const active = accounts.find((item) => item.slotId === state.activeAlias) || null;
  return {
    ok: true,
    runtime: "owner_scoped_gateway",
    ready: active?.online === true,
    connected: active?.online === true,
    authorizationState: active?.authorizationState || "no_active_account",
    activeAccountId: state.activeAlias,
    account: active?.account || null,
    total: accounts.length,
    online: accounts.filter((item) => item.online).length,
    accounts,
    mutationsEnabled: true,
    ...extra,
  };
}

function boundedLimit(raw, fallback) {
  const value = Number(raw || fallback);
  return String(Number.isFinite(value) ? Math.max(1, Math.min(100, Math.trunc(value))) : fallback);
}

async function proxyJson(response, upstream, state) {
  const body = sanitizeValue(await readUpstreamJson(upstream), state);
  json(response, upstream.status, body);
}

async function proxyMedia(response, upstream) {
  if (!upstream.ok || !upstream.body) {
    json(response, upstream.status === 404 ? 404 : 502, { ok: false, code: "MEDIA_UNAVAILABLE" });
    return;
  }
  const headers = { ...NO_STORE_HEADERS, "content-type": upstream.headers.get("content-type") || "application/octet-stream" };
  for (const name of ["content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  response.writeHead(upstream.status, headers);
  Readable.fromWeb(upstream.body).pipe(response);
}

async function createAccount(config, state, label) {
  if (state.accounts.length >= 100) throw new Error("account_limit_reached");
  const upstream = await requestUpstream(config, "/telegram/accounts/new", { method: "POST", body: { label: String(label || "EPICGRAM staging slot").slice(0, 80) } });
  const body = await readUpstreamJson(upstream);
  const accountId = String(body?.id ?? body?.slotId ?? body?.activeAccountId ?? "");
  if (!upstream.ok || !validAccountId(accountId)) throw new Error("account_creation_failed");
  const alias = newAlias(state);
  state.accounts.push({ alias, accountId, createdAt: new Date().toISOString() });
  state.activeAlias = alias;
  saveState(config, state);
  return alias;
}

async function removeAccount(config, state, alias) {
  const mapping = mappingForAlias(state, alias);
  if (!mapping) return { status: 404, body: { ok: false, code: "ACCOUNT_NOT_FOUND" } };
  const upstream = await requestUpstream(config, "/telegram/accounts/remove", {
    method: "POST",
    body: { id: mapping.accountId, accountId: mapping.accountId },
  });
  const body = sanitizeValue(await readUpstreamJson(upstream), state);
  if (!upstream.ok || body?.ok === false) return { status: upstream.status, body };
  state.accounts = state.accounts.filter((item) => item.alias !== alias);
  state.activeAlias = state.accounts[0]?.alias ?? null;
  saveState(config, state);
  return { status: 200, body };
}

async function replaceAccount(config, state, alias) {
  const mapping = mappingForAlias(state, alias);
  if (!mapping) throw new Error("account_not_found");
  const removed = await removeAccount(config, state, alias);
  if (removed.status >= 300) throw new Error("account_reset_failed");
  const upstream = await requestUpstream(config, "/telegram/accounts/new", { method: "POST", body: { label: "EPICGRAM reset slot" } });
  const body = await readUpstreamJson(upstream);
  const accountId = String(body?.id ?? body?.slotId ?? body?.activeAccountId ?? "");
  if (!upstream.ok || !validAccountId(accountId)) throw new Error("account_reset_failed");
  state.accounts.push({ alias, accountId, createdAt: new Date().toISOString() });
  state.activeAlias = alias;
  saveState(config, state);
}

async function handleRequest(config, request, response) {
  const url = new URL(request.url || "/", "http://gateway.local");

  if (request.method === "GET" && url.pathname === "/health") {
    json(response, 200, { ok: true, service: "epicgram-staging-gateway", mode: "owner-scoped" });
    return;
  }
  if (!tokenMatches(bearerToken(request), config.token)) {
    json(response, 401, { ok: false, code: "UNAUTHORIZED" });
    return;
  }

  const state = loadState(config);

  if (request.method === "GET" && ["/telegram/status", "/telegram/state", "/telegram/accounts", "/v1/accounts", "/v1/accounts/current"].includes(url.pathname)) {
    const status = await statusBody(config, state);
    if (url.pathname === "/v1/accounts/current") {
      json(response, 200, { ok: true, account: status.accounts.find((item) => item.active) || null, activeAccountId: status.activeAccountId });
      return;
    }
    if (["/telegram/accounts", "/v1/accounts"].includes(url.pathname)) {
      json(response, 200, { ok: true, total: status.total, online: status.online, ready: status.online, activeAccountId: status.activeAccountId, accounts: status.accounts });
      return;
    }
    json(response, 200, status);
    return;
  }

  if (request.method === "GET" && url.pathname === "/telegram/config") {
    json(response, 200, { ok: true, runtime: "owner_scoped_gateway", mutationsEnabled: true, sessionExport: false, credentialExport: false });
    return;
  }

  if (request.method === "POST" && ["/telegram/accounts/new", "/telegram/accounts/add"].includes(url.pathname)) {
    const body = await readRequestJson(request);
    const alias = await createAccount(config, state, body.label);
    json(response, 201, await statusBody(config, state, { message: "Создан новый изолированный TDLib-слот.", createdAccountId: alias }));
    return;
  }

  if (request.method === "POST" && url.pathname === "/telegram/accounts/select") {
    const body = await readRequestJson(request);
    const alias = requestedAlias(state, body);
    if (!mappingForAlias(state, alias)) {
      json(response, 404, { ok: false, code: "ACCOUNT_NOT_FOUND" });
      return;
    }
    state.activeAlias = alias;
    saveState(config, state);
    json(response, 200, await statusBody(config, state, { message: "Аккаунт переключён." }));
    return;
  }

  if (request.method === "POST" && url.pathname === "/telegram/accounts/remove") {
    const body = await readRequestJson(request);
    const alias = requestedAlias(state, body);
    if (String(body.confirmAlias || "") !== alias) {
      json(response, 409, { ok: false, code: "DELETE_CONFIRMATION_REQUIRED" });
      return;
    }
    const removed = await removeAccount(config, state, alias);
    if (removed.status >= 300) {
      json(response, removed.status, removed.body);
      return;
    }
    json(response, 200, await statusBody(config, state, { message: "TDLib-сессия удалена." }));
    return;
  }

  if (request.method === "POST" && ["/telegram/auth/reset", "/telegram/logout"].includes(url.pathname)) {
    const body = await readRequestJson(request);
    const alias = requestedAlias(state, body);
    if (String(body.confirmAlias || "") !== alias) {
      json(response, 409, { ok: false, code: "DELETE_CONFIRMATION_REQUIRED" });
      return;
    }
    if (url.pathname === "/telegram/logout") {
      const removed = await removeAccount(config, state, alias);
      if (removed.status >= 300) return json(response, removed.status, removed.body);
      return json(response, 200, await statusBody(config, state, { message: "Аккаунт и локальная TDLib-сессия удалены." }));
    }
    await replaceAccount(config, state, alias);
    json(response, 200, await statusBody(config, state, { message: "Сессия сброшена. Начните авторизацию заново." }));
    return;
  }

  if (request.method === "POST" && ["/telegram/auth/qr", "/telegram/auth/phone", "/telegram/auth/code", "/telegram/auth/2fa"].includes(url.pathname)) {
    const body = await readRequestJson(request);
    const alias = requestedAlias(state, body);
    const mapping = mappingForAlias(state, alias);
    if (!mapping) return json(response, 404, { ok: false, code: "ACCOUNT_NOT_FOUND" });
    const upstreamBody = { ...body, id: mapping.accountId, accountId: mapping.accountId };
    delete upstreamBody.confirmAlias;
    const upstream = await requestUpstream(config, url.pathname, { method: "POST", body: upstreamBody });
    const result = sanitizeValue(await readUpstreamJson(upstream), state);
    const status = await statusBody(config, state);
    json(response, upstream.status, { ...result, ...status, ok: upstream.ok && result?.ok !== false, activeAccountId: alias, accounts: status.accounts });
    return;
  }

  if (request.method === "POST" && url.pathname === "/telegram/send") {
    const sendToken = String(request.headers["x-epicgram-staging-send-token"] || "");
    if (config.sendToken.length < 32 || !tokenMatches(sendToken, config.sendToken)) {
      json(response, 403, { ok: false, sent: false, code: "SEND_CAPABILITY_REQUIRED" });
      return;
    }
    if (config.internalSendSecret.length < 32 && !config.allowLegacyApproval) {
      json(response, 503, { ok: false, sent: false, code: "UPSTREAM_SEND_NOT_CONFIGURED" });
      return;
    }
    const body = await readRequestJson(request);
    const alias = requestedAlias(state, body);
    const mapping = mappingForAlias(state, alias);
    if (!mapping) return json(response, 404, { ok: false, sent: false, code: "ACCOUNT_NOT_FOUND" });
    const chatId = String(body.chatId || "");
    const actionType = String(body.actionType || "telegram_send").slice(0, 40);
    const textHash = crypto.createHash("sha256").update(String(body.text || "")).digest("hex");
    const upstream = await requestUpstream(config, "/telegram/send", {
      method: "POST",
      body: { ...body, accountId: mapping.accountId, operatorApproved: true },
      headers: config.internalSendSecret.length >= 32
        ? { "x-epicgram-internal-send-secret": config.internalSendSecret }
        : {},
    });
    const upstreamBody = sanitizeValue(await readUpstreamJson(upstream), state);
    appendAudit(config, {
      event: "telegram_send",
      accountAlias: alias,
      chatId,
      actionType,
      payloadHash: textHash,
      outcome: upstream.ok && upstreamBody?.sent === true ? "ok" : "failed",
      status: upstream.status,
      code: String(upstreamBody?.code || (upstream.ok ? "UNKNOWN" : "UPSTREAM_ERROR")).slice(0, 80),
    });
    json(response, upstream.status, upstreamBody);
    return;
  }

  if (request.method === "GET" && url.pathname === "/telegram/chats") {
    const alias = String(url.searchParams.get("accountId") || state.activeAlias || "");
    const mapping = mappingForAlias(state, alias);
    if (!mapping) return json(response, 404, { ok: false, code: "ACCOUNT_NOT_FOUND", chats: [] });
    const upstream = await requestUpstream(config, "/telegram/chats", { searchParams: [["accountId", mapping.accountId], ["limit", boundedLimit(url.searchParams.get("limit"), 80)]] });
    await proxyJson(response, upstream, state);
    return;
  }

  if (request.method === "GET" && url.pathname === "/telegram/messages") {
    const alias = String(url.searchParams.get("accountId") || state.activeAlias || "");
    const mapping = mappingForAlias(state, alias);
    const chatId = String(url.searchParams.get("chatId") || "");
    if (!mapping) return json(response, 404, { ok: false, code: "ACCOUNT_NOT_FOUND", messages: [] });
    if (!/^-?\d+$/.test(chatId)) return json(response, 400, { ok: false, code: "CHAT_ID_REQUIRED" });
    const params = [["accountId", mapping.accountId], ["chatId", chatId], ["limit", boundedLimit(url.searchParams.get("limit"), 50)]];
    const fromMessageId = String(url.searchParams.get("fromMessageId") || "");
    if (/^\d+$/.test(fromMessageId)) params.push(["fromMessageId", fromMessageId]);
    const upstream = await requestUpstream(config, "/telegram/messages", { searchParams: params });
    await proxyJson(response, upstream, state);
    return;
  }

  if (request.method === "GET" && url.pathname === "/telegram/photo") {
    const alias = String(url.searchParams.get("accountId") || state.activeAlias || "");
    const mapping = mappingForAlias(state, alias);
    const fileId = String(url.searchParams.get("fileId") || "");
    if (!mapping) return json(response, 404, { ok: false, code: "ACCOUNT_NOT_FOUND" });
    if (!/^\d+$/.test(fileId)) return json(response, 400, { ok: false, code: "FILE_ID_REQUIRED" });
    const suffix = url.searchParams.get("thumb") === "true" ? "/thumb" : "";
    const upstream = await requestUpstream(config, `/telegram/file/${encodeURIComponent(mapping.accountId)}/${fileId}${suffix}`);
    await proxyMedia(response, upstream);
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/telegram/file/")) {
    const parts = url.pathname.slice("/telegram/file/".length).split("/").filter(Boolean);
    const mapping = mappingForAlias(state, parts[0]);
    const fileId = parts[1] || "";
    if (!mapping) return json(response, 404, { ok: false, code: "ACCOUNT_NOT_FOUND" });
    if (!/^\d+$/.test(fileId)) return json(response, 400, { ok: false, code: "FILE_ID_REQUIRED" });
    const upstream = await requestUpstream(config, `/telegram/file/${encodeURIComponent(mapping.accountId)}/${fileId}${parts[2] === "thumb" ? "/thumb" : ""}`);
    await proxyMedia(response, upstream);
    return;
  }

  json(response, 404, { ok: false, code: "ROUTE_NOT_ALLOWED" });
}

export function createGatewayServer(input = process.env) {
  const config = validateConfig(input);
  return http.createServer((request, response) => {
    handleRequest(config, request, response).catch((error) => {
      const known = new Set(["account_limit_reached", "account_not_found", "request_too_large"]);
      const code = known.has(error?.message) ? String(error.message).toUpperCase() : "UPSTREAM_UNAVAILABLE";
      json(response, error?.message === "request_too_large" ? 413 : 502, { ok: false, code });
    });
  });
}

async function main() {
  const config = validateConfig(process.env);
  loadState(config);
  const server = createGatewayServer(process.env);
  server.listen(config.port, config.host, () => {
    console.log(`[epicgram-staging-gateway] listening on http://${config.host}:${config.port}`);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[epicgram-staging-gateway] ${error.message}`);
    process.exit(1);
  });
}

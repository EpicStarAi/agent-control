import crypto from "node:crypto";
import http from "node:http";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const JSON_LIMIT_BYTES = 16 * 1024 * 1024;
const NO_STORE_HEADERS = {
  "cache-control": "private, no-store, max-age=0, must-revalidate",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "x-epicgram-gateway": "owner-scoped-read-only",
};

function json(response, status, body) {
  response.writeHead(status, {
    ...NO_STORE_HEADERS,
    "content-type": "application/json; charset=utf-8",
  });
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
  const accountId = String(input.EPICGRAM_STAGING_ACCOUNT_ID || "").trim();
  const accountAlias = String(input.EPICGRAM_STAGING_ACCOUNT_ALIAS || "owner").trim();
  const upstream = new URL(String(input.EPICGRAM_STAGING_UPSTREAM || "http://127.0.0.1:8788"));

  if (token.length < 32) throw new Error("EPICGRAM_STAGING_GATEWAY_TOKEN must contain at least 32 characters");
  if (!accountId) throw new Error("EPICGRAM_STAGING_ACCOUNT_ID is required");
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(accountAlias)) throw new Error("EPICGRAM_STAGING_ACCOUNT_ALIAS is invalid");
  if (upstream.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(upstream.hostname)) {
    throw new Error("EPICGRAM_STAGING_UPSTREAM must be an HTTP loopback URL");
  }

  return {
    token,
    accountId,
    accountAlias,
    upstream,
    host: String(input.HOST || "127.0.0.1"),
    port: Number(input.PORT || 8798),
  };
}

async function readUpstreamJson(response) {
  const length = Number(response.headers.get("content-length") || 0);
  if (length > JSON_LIMIT_BYTES) throw new Error("upstream_response_too_large");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > JSON_LIMIT_BYTES) throw new Error("upstream_response_too_large");
  return JSON.parse(buffer.toString("utf8"));
}

async function fetchUpstream(config, pathname, searchParams) {
  const url = new URL(pathname, config.upstream);
  for (const [key, value] of searchParams || []) url.searchParams.set(key, value);
  return fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
}

function publicAccount(config, account) {
  const identity = account?.account && typeof account.account === "object" ? account.account : {};
  return {
    id: config.accountAlias,
    slotId: config.accountAlias,
    label: account?.label || "EPICGRAM owner",
    online: account?.online === true,
    status: account?.online === true ? "ready" : "offline",
    authorizationState: account?.authorizationState || "unknown",
    active: true,
    account: {
      displayName: identity.displayName || account?.displayName || "Telegram",
      username: identity.username || account?.username || null,
      phoneMasked: null,
    },
    displayName: identity.displayName || account?.displayName || "Telegram",
    username: identity.username || account?.username || null,
    phoneMasked: null,
  };
}

async function loadOwnerAccount(config) {
  const upstream = await fetchUpstream(config, "/telegram/accounts");
  if (!upstream.ok) throw new Error(`upstream_accounts_${upstream.status}`);
  const body = await readUpstreamJson(upstream);
  const accounts = Array.isArray(body?.accounts) ? body.accounts : [];
  const account = accounts.find((item) => String(item?.id ?? item?.slotId ?? "") === config.accountId);
  if (!account) throw new Error("configured_account_not_found");
  return publicAccount(config, account);
}

function boundedLimit(raw, fallback) {
  const value = Number(raw || fallback);
  return String(Number.isFinite(value) ? Math.max(1, Math.min(100, Math.trunc(value))) : fallback);
}

async function proxyJson(response, upstream) {
  const body = await readUpstreamJson(upstream);
  json(response, upstream.status, body);
}

async function proxyMedia(response, upstream) {
  if (!upstream.ok || !upstream.body) {
    json(response, upstream.status === 404 ? 404 : 502, { ok: false, code: "MEDIA_UNAVAILABLE" });
    return;
  }
  const headers = {
    ...NO_STORE_HEADERS,
    "content-type": upstream.headers.get("content-type") || "application/octet-stream",
  };
  for (const name of ["content-length", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) headers[name] = value;
  }
  response.writeHead(upstream.status, headers);
  Readable.fromWeb(upstream.body).pipe(response);
}

async function handleRequest(config, request, response) {
  const url = new URL(request.url || "/", "http://gateway.local");

  if (request.method === "GET" && url.pathname === "/health") {
    json(response, 200, { ok: true, service: "epicgram-staging-gateway", mode: "owner-scoped-read-only" });
    return;
  }

  if (!tokenMatches(bearerToken(request), config.token)) {
    json(response, 401, { ok: false, code: "UNAUTHORIZED" });
    return;
  }

  if (request.method !== "GET") {
    json(response, 403, { ok: false, code: "READ_ONLY_GATEWAY", message: "Staging Telegram mutations are disabled." });
    return;
  }

  if (["/telegram/status", "/telegram/accounts", "/v1/accounts", "/v1/accounts/current"].includes(url.pathname)) {
    const account = await loadOwnerAccount(config);
    if (url.pathname === "/telegram/status") {
      json(response, 200, {
        ok: true,
        runtime: "owner_scoped_gateway",
        ready: account.online,
        connected: account.online,
        authorizationState: account.authorizationState,
        activeAccountId: config.accountAlias,
        account: account.account,
        accounts: [account],
        mutationsEnabled: false,
      });
      return;
    }
    if (url.pathname === "/v1/accounts/current") {
      json(response, 200, { ok: true, account, activeAccountId: config.accountAlias });
      return;
    }
    json(response, 200, { ok: true, total: 1, online: account.online ? 1 : 0, ready: account.online ? 1 : 0, accounts: [account] });
    return;
  }

  if (url.pathname === "/telegram/chats") {
    const upstream = await fetchUpstream(config, "/telegram/chats", [
      ["accountId", config.accountId],
      ["limit", boundedLimit(url.searchParams.get("limit"), 80)],
    ]);
    await proxyJson(response, upstream);
    return;
  }

  if (url.pathname === "/telegram/messages") {
    const chatId = String(url.searchParams.get("chatId") || "");
    if (!/^-?\d+$/.test(chatId)) {
      json(response, 400, { ok: false, code: "CHAT_ID_REQUIRED" });
      return;
    }
    const params = [
      ["accountId", config.accountId],
      ["chatId", chatId],
      ["limit", boundedLimit(url.searchParams.get("limit"), 50)],
    ];
    const fromMessageId = String(url.searchParams.get("fromMessageId") || "");
    if (/^\d+$/.test(fromMessageId)) params.push(["fromMessageId", fromMessageId]);
    const upstream = await fetchUpstream(config, "/telegram/messages", params);
    await proxyJson(response, upstream);
    return;
  }

  if (url.pathname === "/telegram/photo") {
    const fileId = String(url.searchParams.get("fileId") || "");
    if (!/^\d+$/.test(fileId)) {
      json(response, 400, { ok: false, code: "FILE_ID_REQUIRED" });
      return;
    }
    const suffix = url.searchParams.get("thumb") === "true" ? "/thumb" : "";
    const upstream = await fetchUpstream(config, `/telegram/file/${encodeURIComponent(config.accountId)}/${fileId}${suffix}`);
    await proxyMedia(response, upstream);
    return;
  }

  if (url.pathname.startsWith("/telegram/file/")) {
    const parts = url.pathname.slice("/telegram/file/".length).split("/").filter(Boolean);
    const fileId = parts[1] || "";
    const thumb = parts[2] === "thumb";
    if (!/^\d+$/.test(fileId)) {
      json(response, 400, { ok: false, code: "FILE_ID_REQUIRED" });
      return;
    }
    const upstream = await fetchUpstream(config, `/telegram/file/${encodeURIComponent(config.accountId)}/${fileId}${thumb ? "/thumb" : ""}`);
    await proxyMedia(response, upstream);
    return;
  }

  json(response, 404, { ok: false, code: "ROUTE_NOT_ALLOWED" });
}

export function createGatewayServer(input = process.env) {
  const config = validateConfig(input);
  return http.createServer((request, response) => {
    handleRequest(config, request, response).catch((error) => {
      const code = error?.message === "configured_account_not_found" ? "OWNER_ACCOUNT_UNAVAILABLE" : "UPSTREAM_UNAVAILABLE";
      json(response, 502, { ok: false, code });
    });
  });
}

async function main() {
  const config = validateConfig(process.env);
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

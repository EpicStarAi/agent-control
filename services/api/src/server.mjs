import http from "node:http";
import { loadLocalEnv } from "./env.mjs";
import { getAiStatus } from "./ai-runtime.mjs";
import { generateDraftReply } from "./ai-chat.mjs";
import { getRecentMemory } from "./memory-store.mjs";
import {
  getConfig,
  getChats,
  getStatus,
  createAccountSlot,
  selectAccountSlot,
  removeAccountSlot,
  getMessages,
  getPhoto,
  logout,
  requestPhoneAuth,
  requestQrAuth,
  resetAuth,
  verifyCode,
  verify2fa,
  sendMessage
} from "./telegram-runtime.mjs";

await loadLocalEnv();

const host = process.env.EPICGRAM_API_HOST || "127.0.0.1";
const port = Number(process.env.EPICGRAM_API_PORT || 8788);
const webClientUrl = process.env.EPICGRAM_WEB_CLIENT_URL || "http://127.0.0.1:3015/";

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function send(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  response.end(`${JSON.stringify(body)}\n`);
}

function sendBinary(response, status, body, contentType) {
  response.writeHead(status, {
    "content-type": contentType,
    "access-control-allow-origin": "*",
    "cache-control": status === 200 ? "public, max-age=86400" : "no-store"
  });
  response.end(body);
}

function redirect(response, location) {
  response.writeHead(302, {
    location,
    "cache-control": "no-store"
  });
  response.end();
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

    if (request.method === "OPTIONS") return send(response, 204, {});
    if (request.method === "GET" && url.pathname === "/") {
      const accept = request.headers.accept ?? "";
      if (accept.includes("text/html")) return redirect(response, webClientUrl);
      return send(response, 200, {
        ok: true,
        service: "epicgram-api",
        webClientUrl,
        health: "/health",
        telegramStatus: "/telegram/status"
      });
    }
    if (request.method === "GET" && url.pathname === "/health") {
      return send(response, 200, { ok: true, service: "epicgram-api" });
    }
    if (request.method === "GET" && url.pathname === "/ai/status") {
      return send(response, 200, getAiStatus());
    }
    if (request.method === "POST" && url.pathname === "/ai/suggest") {
      const payload = await readJson(request);
      const result = await generateDraftReply({
        conversationId: payload?.conversationId ?? payload?.chatId,
        chatTitle: payload?.chatTitle,
        history: Array.isArray(payload?.history) ? payload.history : [],
        instruction: payload?.instruction
      });
      return send(response, result.ok ? 200 : result.status ?? 502, result);
    }
    if (request.method === "GET" && url.pathname === "/ai/memory") {
      const conversationId = url.searchParams.get("conversationId") ?? url.searchParams.get("chatId");
      const limit = Number(url.searchParams.get("limit") ?? 20);
      const entries = await getRecentMemory(conversationId, Number.isFinite(limit) ? limit : 20);
      return send(response, 200, { conversationId, count: entries.length, entries });
    }
    if (request.method === "POST" && url.pathname === "/telegram/send") {
      const result = await sendMessage(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "GET" && url.pathname === "/telegram/status") {
      return send(response, 200, await getStatus());
    }
    if (request.method === "GET" && url.pathname === "/telegram/config") {
      return send(response, 200, await getConfig());
    }
    if (request.method === "POST" && url.pathname === "/telegram/accounts/new") {
      const result = await createAccountSlot();
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/accounts/select") {
      const result = await selectAccountSlot(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/accounts/remove") {
      const result = await removeAccountSlot(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "GET" && url.pathname === "/telegram/chats") {
      const result = await getChats({ accountId: url.searchParams.get("accountId") });
      return send(response, result.status, result.body);
    }
    if (request.method === "GET" && url.pathname === "/telegram/messages") {
      const result = await getMessages({
        accountId: url.searchParams.get("accountId"),
        chatId: url.searchParams.get("chatId")
      });
      return send(response, result.status, result.body);
    }
    if (request.method === "GET" && url.pathname === "/telegram/photo") {
      const result = await getPhoto({
        accountId: url.searchParams.get("accountId"),
        fileId: url.searchParams.get("fileId")
      });
      return sendBinary(response, result.status, result.body, result.contentType);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/qr") {
      const result = await requestQrAuth(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/phone") {
      const result = await requestPhoneAuth(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/code") {
      const result = await verifyCode(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/2fa") {
      const result = await verify2fa(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/reset") {
      const result = await resetAuth(await readJson(request));
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/logout") {
      const result = await logout(await readJson(request));
      return send(response, result.status, result.body);
    }

    if (request.method === "POST" && url.pathname === "/operator/command") {
      const b = await readJson(request);
      const { runOperator } = await import("./operator-agent.mjs");
      const out = await runOperator({ text: String(b.text || ""), history: Array.isArray(b.history) ? b.history : [], accountId: b.accountId });
      return send(response, 200, { ok: true, ...out });
    }
    if (request.method === "POST" && url.pathname === "/operator/confirm") {
      const b = await readJson(request);
      const { confirmAction } = await import("./operator-agent.mjs");
      const out = await confirmAction({ action: b.action, accountId: b.accountId });
      return send(response, 200, out);
    }

    return send(response, 404, { message: "Not found" });
  } catch (error) {
    return send(response, 500, {
      message: error instanceof Error ? error.message : "Unexpected backend error"
    });
  }
});

server.listen(port, host, () => {
  console.log(`EPICGRAM API listening on http://${host}:${port}`);
});

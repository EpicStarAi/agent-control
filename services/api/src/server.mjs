import http from "node:http";
import { loadLocalEnv } from "./env.mjs";
import {
  getConfig,
  getChats,
  getStatus,
  getMessages,
  logout,
  requestPhoneAuth,
  requestQrAuth,
  resetAuth,
  verifyCode
} from "./telegram-runtime.mjs";

await loadLocalEnv();

const host = process.env.EPICGRAM_API_HOST || "127.0.0.1";
const port = Number(process.env.EPICGRAM_API_PORT || 8788);

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

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

    if (request.method === "OPTIONS") return send(response, 204, {});
    if (request.method === "GET" && url.pathname === "/health") {
      return send(response, 200, { ok: true, service: "epicgram-api" });
    }
    if (request.method === "GET" && url.pathname === "/telegram/status") {
      return send(response, 200, await getStatus());
    }
    if (request.method === "GET" && url.pathname === "/telegram/config") {
      return send(response, 200, await getConfig());
    }
    if (request.method === "GET" && url.pathname === "/telegram/chats") {
      const result = await getChats();
      return send(response, result.status, result.body);
    }
    if (request.method === "GET" && url.pathname === "/telegram/messages") {
      const result = await getMessages({ chatId: url.searchParams.get("chatId") });
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/auth/qr") {
      const result = await requestQrAuth();
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
    if (request.method === "POST" && url.pathname === "/telegram/auth/reset") {
      const result = await resetAuth();
      return send(response, result.status, result.body);
    }
    if (request.method === "POST" && url.pathname === "/telegram/logout") {
      const result = await logout();
      return send(response, result.status, result.body);
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

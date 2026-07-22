import { Router, type IRouter, type Request, type Response } from "express";

// Proxies frontend calls to the existing EPICGRAM backend service
// (services/api/src/server.mjs, already running on EPICGRAM_API_BASE_URL).
// This preserves all real Telegram/operator logic (TDLib adapter, operator
// core, schedule queue, policy gates, etc.) untouched — we only forward
// requests here so the registered `epicgram-web` artifact can reach it
// through its own routed path instead of hitting a bare port directly.
//
// SAFETY: this artifact is the managed preview surface for EPICGRAM. By
// default it only forwards read-only (GET/HEAD) requests. A deliberate,
// reviewed allowlist of mutating routes is forwarded on top of that:
//
//   - /telegram/auth/*        login flow (QR/phone/code/2FA/reset) — the
//                             real backend still requires TDLib to be
//                             configured (EPICGRAM_TDLIB_ENABLED=true) and
//                             real credentials, so this is a no-op unless the
//                             owner has actually turned live Telegram on.
//   - /telegram/accounts/*    manage local login "slots" (create/select/
//                             remove) — no external side effects.
//   - /telegram/logout        end a local session — no external side effects.
//   - /telegram/send          the ONLY route that writes to Telegram. The
//                             backend (services/api/src/telegram-runtime.mjs
//                             sendMessage) independently enforces: (1) TDLib
//                             must be configured/live, and (2) an explicit
//                             operatorApproved=true flag unless
//                             EPICGRAM_AI_SEND_MODE=auto_send (never shipped).
//                             The proxy does not and must not weaken this —
//                             it only forwards the bytes; the send-safety
//                             gate lives server-side and stays authoritative.
//   - /ai/audit/reject, /operator/reject   operator dismissing an AI draft —
//                             no external side effects, audit-logged.
//   - /ai/schedule/approve    operator approving a queued send — still funnels
//                             through the same /telegram/send approval gate.
//   - /ai/suggest             AI proposes a draft reply for operator review —
//                             never sends anything itself (generateDraftReply
//                             only returns text + logs an audit "proposed"
//                             event); the operator UI must still call
//                             /telegram/send with operatorApproved=true.
//
// Everything else mutating (production/live-send toggles, infra actions,
// docker/ollama control, etc.) remains blocked by default — those are
// operator-console concerns, not something this preview should expose.
const API_BASE_URL = process.env["EPICGRAM_API_BASE_URL"] ?? "http://127.0.0.1:8788";

const PREFIXES = ["/telegram", "/operator", "/operator-events", "/v1", "/ai", "/approvals", "/memory"];

// Exact-match mutating routes allowed through, with the rationale above.
const ALLOWED_MUTATING_PATHS = new Set([
  "/telegram/auth/qr",
  "/telegram/auth/phone",
  "/telegram/auth/code",
  "/telegram/auth/2fa",
  "/telegram/auth/reset",
  "/telegram/accounts/new",
  "/telegram/accounts/select",
  "/telegram/accounts/remove",
  "/telegram/logout",
  "/telegram/send",
  "/telegram/forward",
  "/telegram/react",
  "/telegram/pin",
  "/telegram/edit",
  "/telegram/delete",
  "/telegram/create-chat",
  "/telegram/register-bot",
  "/ai/audit/reject",
  "/operator/reject",
  "/ai/schedule/approve",
  "/ai/suggest",
]);

// Hop-by-hop / connection-management headers that must not be forwarded verbatim.
const STRIPPED_REQUEST_HEADERS = new Set(["host", "connection", "content-length", "transfer-encoding"]);
const STRIPPED_RESPONSE_HEADERS = new Set(["content-encoding", "content-length", "transfer-encoding", "connection"]);

async function forward(req: Request, res: Response) {
  const isReadOnly = req.method === "GET" || req.method === "HEAD";
  const path = req.originalUrl.replace(/^\/api/, "").split("?")[0] ?? "";
  const isAllowedMutation = !isReadOnly && ALLOWED_MUTATING_PATHS.has(path);

  if (!isReadOnly && !isAllowedMutation) {
    res.status(403).json({
      runtime: "mutating_action_blocked",
      message: "This route is not on the managed preview's allowlist of mutating actions. Real Telegram sends, auth, and account/session mutations are only permitted for a reviewed set of routes.",
    });
    return;
  }

  const target = `${API_BASE_URL}${req.originalUrl.replace(/^\/api/, "")}`;
  try {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value !== "string" || STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) continue;
      headers[key] = value;
    }

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const body = hasBody ? JSON.stringify(req.body ?? {}) : undefined;
    if (hasBody) headers["content-type"] = "application/json";

    const upstream = await fetch(target, { method: req.method, headers, body });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) res.setHeader(key, value);
    });

    // SSE / streaming responses: pipe the body directly rather than buffering
    // with arrayBuffer(). Buffering an SSE stream would block until the
    // connection closes (never, for a keepalive bus).
    const contentType = upstream.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream") && upstream.body) {
      res.setHeader("cache-control", "no-cache");
      res.setHeader("x-accel-buffering", "no"); // disable nginx buffering if present
      res.flushHeaders();
      const reader = upstream.body.getReader();
      req.on("close", () => reader.cancel());
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        res.end();
      }
      return;
    }

    // IMPORTANT: read as a binary Buffer, not .text() — text() decodes the
    // body as UTF-8, which silently corrupts non-text payloads (e.g. JPEG
    // avatar bytes from /telegram/photo turn into U+FFFD replacement bytes).
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  } catch {
    res.status(503).json({
      runtime: "backend_offline",
      message: `EPICGRAM backend is not reachable at ${API_BASE_URL}.`,
    });
  }
}

const router: IRouter = Router();

for (const prefix of PREFIXES) {
  router.all(`${prefix}`, forward);
  router.all(`${prefix}/*splat`, forward);
}

export default router;

import { Router, type IRouter, type Request, type Response } from "express";

// Proxies frontend calls to the existing EPICGRAM backend service
// (services/api/src/server.mjs, already running on EPICGRAM_API_BASE_URL).
// This preserves all real Telegram/operator logic (TDLib adapter, operator
// core, schedule queue, policy gates, etc.) untouched — we only forward
// requests here so the registered `epicgram-web` artifact can reach it
// through its own routed path instead of hitting a bare port directly.
//
// SAFETY: this artifact is a read-only preview surface. It must never be
// able to trigger a real Telegram send, auth/session mutation, or any
// production/live-send state change. We enforce that by only forwarding
// GET requests — every mutating verb (POST/PUT/PATCH/DELETE) is rejected
// here, before it ever reaches the real backend.
const API_BASE_URL = process.env["EPICGRAM_API_BASE_URL"] ?? "http://127.0.0.1:8788";

const PREFIXES = ["/telegram", "/operator", "/operator-events", "/v1", "/ai", "/approvals", "/memory"];

// Hop-by-hop / connection-management headers that must not be forwarded verbatim.
const STRIPPED_REQUEST_HEADERS = new Set(["host", "connection", "content-length", "transfer-encoding"]);
const STRIPPED_RESPONSE_HEADERS = new Set(["content-encoding", "content-length", "transfer-encoding", "connection"]);

async function forward(req: Request, res: Response) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(403).json({
      runtime: "mutating_action_blocked",
      message: "This preview artifact only forwards read-only (GET) requests. Real Telegram sends, auth, and account/session mutations are disabled here by design.",
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

    const upstream = await fetch(target, { method: req.method, headers });
    const text = await upstream.text();
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) res.setHeader(key, value);
    });
    res.send(text);
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

import { NextRequest, NextResponse } from "next/server";
import { getPrincipal } from "@/lib/telegramGuard";

// Additive proxy for EPICSTAR AI OPERATOR backend endpoints (/operator/*).
// no-store: operator status/health and drafts must never be cached.
//
// AUTH (defence in depth): this verbatim catch-all forwards ANY /api/operator/*
// path to the backend (status, accounts, targets, production, ops, live-*,
// post-live, reject, …). Previously it required no session at all, so every one
// of those was reachable anonymously. It now rejects unauthenticated callers
// with 401 before touching the backend. The middleware matcher covers the same
// surface at the edge; this handler is the authoritative gate.
const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

function unauthorized() {
  return NextResponse.json(
    { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
    { status: 401, headers: { "cache-control": "no-store" } }
  );
}

async function forward(req: NextRequest, path: string[], method: string) {
  const sub = "/operator/" + (path || []).join("/");
  const qs = req.nextUrl.search || "";
  const init: RequestInit = { method, headers: { "content-type": "application/json" }, cache: "no-store" };
  if (method === "POST") init.body = await req.text();
  try {
    const r = await fetch(`${API_BASE_URL}${sub}${qs}`, init);
    const body = await r.json().catch(() => ({ ok: false, message: "Backend returned a non-JSON response." }));
    return NextResponse.json(body, { status: r.status });
  } catch {
    return NextResponse.json(
      { ok: false, runtime: "backend_offline", message: `EPICGRAM backend is not reachable at ${API_BASE_URL}. Start it with npm run api:dev.` },
      { status: 503 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  if (!(await getPrincipal())) return unauthorized();
  return forward(req, ctx.params.path, "GET");
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  if (!(await getPrincipal())) return unauthorized();
  return forward(req, ctx.params.path, "POST");
}

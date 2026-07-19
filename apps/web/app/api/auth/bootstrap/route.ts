import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { bootstrapLogin, getSession } from "@/lib/authData";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";

// POST /api/auth/bootstrap — narrow, public entry endpoint for the /login CTA.
//
// It creates ONLY an EPICGRAM owner session (user + workspace + session) and sets
// the HttpOnly session cookie. It does NOT perform any Telegram authorization —
// that happens later inside /client via the binding wizard. No caller-supplied
// id (ownerId/userId/accountId) is trusted; everything is generated server-side.
// If a valid session already exists, it is reused (no new workspace is minted).
export const dynamic = "force-dynamic";

// Open-redirect guard: only an internal absolute path is allowed. Anything else
// (protocol, protocol-relative //, backslashes) collapses to /client.
function safeNext(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (/^\/(?!\/)[A-Za-z0-9/_\-.~?=&%]*$/.test(s)) return s;
  return "/client";
}

const RL = globalThis as unknown as { __epicBootstrapRL?: Map<string, { n: number; t: number }> };
RL.__epicBootstrapRL = RL.__epicBootstrapRL || new Map();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const now = Date.now();
  const m = RL.__epicBootstrapRL!;
  const rec = m.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60000) { rec.n = 0; rec.t = now; }
  if (rec.n >= 10) return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  rec.n++; m.set(ip, rec);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }
  const next = safeNext(body?.next);

  // Reuse an already-valid session — never mint a fresh workspace on every click.
  const existing = cookies().get(SESSION_COOKIE)?.value || "";
  if (existing) {
    const s = await getSession(existing);
    if (s.authenticated) return NextResponse.json({ ok: true, next, reused: true });
  }

  const r = await bootstrapLogin();
  if (!r.ok || !r.token) return NextResponse.json({ ok: false, reason: "bootstrap_failed" }, { status: 500 });

  const res = NextResponse.json({ ok: true, next, reused: false });
  res.cookies.set(SESSION_COOKIE, r.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}

import { NextResponse } from "next/server";
import { referralLogin } from "@/lib/authData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import { SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";

// P30 — referral-code login (gate into the closed app). Sets an httpOnly session cookie.
// The raw referral code and session token are never returned in the body or logged.
export const dynamic = "force-dynamic";
const RL = (globalThis as unknown as { __epicAuthRL?: Map<string, { n: number; t: number }> });
RL.__epicAuthRL = RL.__epicAuthRL || new Map();

function safeNext(value: unknown): string {
  const next = typeof value === "string" ? value : "/client";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/client";
}

function sameOriginUrl(req: Request, path: string): URL {
  const url = new URL(path, req.url);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto");
  if (host) url.host = host;
  if (url.hostname === "0.0.0.0") url.hostname = "127.0.0.1";
  if (proto === "http" || proto === "https") url.protocol = `${proto}:`;
  return url;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const now = Date.now(); const m = RL.__epicAuthRL!; const rec = m.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60000) { rec.n = 0; rec.t = now; }
  const contentType = req.headers.get("content-type") || "";
  const wantsHtml = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
  if (rec.n >= 8) {
    if (wantsHtml) return NextResponse.redirect(sameOriginUrl(req, "/login?next=/client&error=rate_limited"), { status: 303 });
    return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  }
  rec.n++; m.set(ip, rec);

  let body: Record<string, unknown> = {};
  if (wantsHtml) {
    const form = await req.formData().catch(() => null);
    body = Object.fromEntries(form?.entries() ?? []);
  } else {
    body = await req.json().catch(() => ({} as Record<string, unknown>));
  }
  const code = typeof body?.code === "string" ? body.code : "";
  const next = safeNext(body?.next);
  const r = await referralLogin(code);
  broadcast("audit.logged", { event: r.ok ? "auth.referral.login_success" : "auth.referral.login_failed" });
  await appendOperatorEvent({ missionId: null, sourceOperator: "AccessGate", eventType: "logged",
    message: r.ok ? `Access Gate: вход по referral · workspace создан` : `Access Gate: неудачная попытка входа (${r.reason})`,
    riskLevel: r.ok ? "none" : "low", approvalState: "not_required" }).catch(() => {});

  const res = wantsHtml
    ? NextResponse.redirect(sameOriginUrl(req, r.ok ? next : `/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(r.reason ?? "invalid")}`), { status: 303 })
    : NextResponse.json({ ok: r.ok, reason: r.reason, user: r.user, workspace: r.workspace, source: r.source }, { status: r.ok ? 200 : 401 });
  if (r.ok && r.token) res.cookies.set(SESSION_COOKIE, r.token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.floor(SESSION_TTL_MS / 1000) });
  return res;
}

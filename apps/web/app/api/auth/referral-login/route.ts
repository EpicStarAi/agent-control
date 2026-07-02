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

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || "local";
  const now = Date.now(); const m = RL.__epicAuthRL!; const rec = m.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60000) { rec.n = 0; rec.t = now; }
  if (rec.n >= 8) return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
  rec.n++; m.set(ip, rec);

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const code = typeof body?.code === "string" ? body.code : "";
  const r = await referralLogin(code);
  broadcast("audit.logged", { event: r.ok ? "auth.referral.login_success" : "auth.referral.login_failed" });
  await appendOperatorEvent({ missionId: null, sourceOperator: "AccessGate", eventType: "logged",
    message: r.ok ? `Access Gate: вход по referral · workspace создан` : `Access Gate: неудачная попытка входа (${r.reason})`,
    riskLevel: r.ok ? "none" : "low", approvalState: "not_required" }).catch(() => {});

  const res = NextResponse.json({ ok: r.ok, reason: r.reason, user: r.user, workspace: r.workspace, source: r.source }, { status: r.ok ? 200 : 401 });
  if (r.ok && r.token) res.cookies.set(SESSION_COOKIE, r.token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: Math.floor(SESSION_TTL_MS / 1000) });
  return res;
}

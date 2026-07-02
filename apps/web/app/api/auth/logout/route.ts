import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logout } from "@/lib/authData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import { SESSION_COOKIE } from "@/lib/auth";

// P30 — logout: expire the session (no delete) and clear the cookie.
export const dynamic = "force-dynamic";

export async function POST() {
  const token = cookies().get(SESSION_COOKIE)?.value || "";
  const r = await logout(token);
  broadcast("audit.logged", { event: "auth.referral.logout" });
  await appendOperatorEvent({ missionId: null, sourceOperator: "AccessGate", eventType: "logged",
    message: "Access Gate: выход · сессия завершена", riskLevel: "none", approvalState: "not_required" }).catch(() => {});
  const res = NextResponse.json({ ...r });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return res;
}

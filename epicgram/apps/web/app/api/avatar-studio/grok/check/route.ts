import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { browserCheck } from "@/lib/renderProviders/grokImagineBrowser";
import { broadcast } from "@/lib/operatorBus";

// P27.6 — operator "Check Grok Browser". Launches the persistent profile ONLY when
// EPIC_GROK_BROWSER=1 (operator-side); otherwise returns NOT_CONFIGURED without launch.
// Never returns cookies/session/headers.
export const dynamic = "force-dynamic";

export async function POST() {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const r = await browserCheck();
  broadcast("audit.logged", { event: "avatar.grok.check", workspaceId: ws, status: r.status });
  return NextResponse.json({ ok: true, status: r.status, detail: r.detail });
}

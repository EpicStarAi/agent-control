import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { runQueueOnce } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P27.2 — execute ONE mock queue pass (queued → running → done + asset).
// MOCK ONLY: no Grok, no Playwright, no external calls.
export const dynamic = "force-dynamic";

export async function POST() {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { processed, results, source } = await runQueueOnce(ws);
  broadcast("audit.logged", { event: "avatar.queue.run_once", workspaceId: ws, processed });
  return NextResponse.json({ ok: true, processed, results, source, note: "mock queue pass (P27.2) — no external execution" });
}

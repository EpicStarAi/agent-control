import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { runGrokOnce } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P27.6 — run exactly ONE queued grok_imagine_browser job (real browser, operator-side).
// Result asset is pending_review, never auto-approved. No auto-publish.
export const dynamic = "force-dynamic";

export async function POST() {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const r = await runGrokOnce(ws);
  broadcast("audit.logged", { event: "avatar.grok.run_one", workspaceId: ws, jobId: r.jobId, status: r.status });
  return NextResponse.json({ ...r, note: "one real grok_imagine_browser job (operator-side)" });
}

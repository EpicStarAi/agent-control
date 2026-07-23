import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getJob, setJob, setAssetStatusByJob } from "@/lib/avatarStudioData";
import { canTransition } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P27.2 — reject a done render job (guarded). Also rejects its linked asset.
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: job } = await getJob(ws, params.id);
  if (!job) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  if (!canTransition(job.status, "rejected")) return NextResponse.json({ ok: false, message: `invalid transition ${job.status} → rejected` }, { status: 409 });
  const { data: updated } = await setJob(ws, params.id, { status: "rejected" });
  await setAssetStatusByJob(ws, params.id, "rejected");
  broadcast("audit.logged", { event: "avatar.render.rejected", workspaceId: ws, jobId: params.id });
  return NextResponse.json({ ok: true, job: updated });
}

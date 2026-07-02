import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getJob, setJob, setAssetStatusByJob } from "@/lib/avatarStudioData";
import { canTransition } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P27.2 — approve a done render job (guarded). Also approves its linked asset.
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: job } = await getJob(ws, params.id);
  if (!job) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  if (!canTransition(job.status, "approved")) return NextResponse.json({ ok: false, message: `invalid transition ${job.status} → approved` }, { status: 409 });
  const { data: updated } = await setJob(ws, params.id, { status: "approved" });
  await setAssetStatusByJob(ws, params.id, "approved");
  broadcast("audit.logged", { event: "avatar.render.approved", workspaceId: ws, jobId: params.id });
  return NextResponse.json({ ok: true, job: updated });
}

import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getJob, setJob, setAssetStatusByJob, listAssetsByJob } from "@/lib/avatarStudioData";
import { canTransition, canApproveAsset } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P27.4 — approve a done job. QUALITY GATE: the linked asset must be pending_review
// and quality_status=passed, OR the operator supplies an explicit override reason.
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: job } = await getJob(ws, params.id);
  if (!job) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  if (!canTransition(job.status, "approved")) return NextResponse.json({ ok: false, message: `invalid transition ${job.status} → approved` }, { status: 409 });
  const body = (await req.json().catch(() => ({}))) as { override?: boolean; reason?: string };
  const override = body.override ? String(body.reason || "").trim() : "";
  const { data: assets } = await listAssetsByJob(ws, params.id);
  if (assets.length && !assets.some(a => canApproveAsset(a, override))) {
    return NextResponse.json({ ok: false, message: "quality gate: asset not passed (send override + reason to force)" }, { status: 409 });
  }
  const { data: updated } = await setJob(ws, params.id, { status: "approved" });
  await setAssetStatusByJob(ws, params.id, "approved");
  broadcast("audit.logged", { event: "avatar.render.approved", workspaceId: ws, jobId: params.id, override: Boolean(override) });
  return NextResponse.json({ ok: true, job: updated, override: override || undefined });
}

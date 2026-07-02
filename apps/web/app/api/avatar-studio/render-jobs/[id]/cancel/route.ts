import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getJob, setJob } from "@/lib/avatarStudioData";
import { canTransition } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P27.2 — cancel a job. Only queued / running / regenerate_requested may be cancelled.
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: job } = await getJob(ws, params.id);
  if (!job) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  if (!canTransition(job.status, "cancelled")) return NextResponse.json({ ok: false, message: `cannot cancel from ${job.status}` }, { status: 409 });
  const { data: updated } = await setJob(ws, params.id, { status: "cancelled" });
  broadcast("audit.logged", { event: "avatar.render.cancelled", workspaceId: ws, jobId: params.id });
  return NextResponse.json({ ok: true, job: updated });
}

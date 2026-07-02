import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getJob, createJob } from "@/lib/avatarStudioData";
import { newBatchId } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P27.7 — regenerate candidates for a scene group. Given a representative job, create
// N fresh QUEUED candidate jobs preserving avatar/pack/scene/prompt/provider context.
// No auto-approve, no auto-publish. Safe disabled reasons if context is missing.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { jobId?: string; candidateCount?: number };
  const { data: job } = await getJob(ws, String(body.jobId || ""));
  if (!job) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  if (!job.prompt) return NextResponse.json({ ok: false, reason: "MISSING_PROMPT_CONTEXT" }, { status: 400 });
  if (!job.avatarId) return NextResponse.json({ ok: false, reason: "MISSING_AVATAR_CONTEXT" }, { status: 400 });
  if (!job.packId) return NextResponse.json({ ok: false, reason: "MISSING_RENDER_PACK" }, { status: 400 });

  const count = Math.max(1, Math.min(4, Number(body.candidateCount) || 3));
  const batchId = newBatchId();
  const jobs = [];
  for (let ci = 0; ci < count; ci++) {
    const { data: nj } = await createJob(ws, {
      avatarId: job.avatarId, packId: job.packId, engine: job.engine, status: "queued",
      sceneKey: job.sceneKey, prompt: job.prompt, batchId, priority: job.priority, attempts: 0, maxAttempts: job.maxAttempts,
      candidateIndex: ci, providerId: job.providerId, selectedBy: job.selectedBy, capabilitiesSnapshot: job.capabilitiesSnapshot,
    });
    jobs.push(nj);
  }
  broadcast("audit.logged", { event: "avatar.candidates.regenerate", workspaceId: ws, fromJob: job.id, batchId, count });
  return NextResponse.json({ ok: true, batchId, count, jobs, note: "queued — run the queue to render candidates" });
}

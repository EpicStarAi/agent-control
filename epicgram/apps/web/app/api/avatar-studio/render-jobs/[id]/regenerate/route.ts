import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getJob, setJob, createJob } from "@/lib/avatarStudioData";
import { canTransition } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P27.2 — regenerate: create a NEW queued job that preserves the original prompt,
// avatar, pack and scene. Original job is flagged regenerate_requested when allowed.
// Mock only — no external execution here (runner does the mock render).
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: orig } = await getJob(ws, params.id);
  if (!orig) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  if (canTransition(orig.status, "regenerate_requested")) {
    await setJob(ws, orig.id, { status: "regenerate_requested" });
  }
  const { data: job } = await createJob(ws, {
    avatarId: orig.avatarId, packId: orig.packId, engine: orig.engine, status: "queued",
    sceneKey: orig.sceneKey, prompt: orig.prompt, batchId: orig.batchId, priority: orig.priority,
    attempts: 0, maxAttempts: orig.maxAttempts,
  });
  broadcast("audit.logged", { event: "avatar.render.regenerate", workspaceId: ws, fromJob: orig.id, newJob: job.id });
  return NextResponse.json({ ok: true, job, from: orig.id, note: "new queued job (mock)" });
}

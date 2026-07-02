import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getAvatar, getPassport, createJob, listJobs } from "@/lib/avatarStudioData";
import { getPack, sceneTemplate, buildAvatarPrompt, newBatchId } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P27.2 — render jobs. POST creates a QUEUED batch (one job per pack scene, shared
// batch_id). Rendering happens later via the mock queue runner (/run-once).
// No external calls here.
export const dynamic = "force-dynamic";

export async function GET() {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data, source } = await listJobs(ws);
  return NextResponse.json({ jobs: data, source });
}

export async function POST(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { avatarId?: string; packId?: string; engine?: string; priority?: number };
  const pack = getPack(String(body.packId || ""));
  if (!pack) return NextResponse.json({ ok: false, message: "unknown pack" }, { status: 400 });
  const { data: avatar } = await getAvatar(ws, String(body.avatarId || ""));
  if (!avatar) return NextResponse.json({ ok: false, message: "avatar not found" }, { status: 404 });
  const { data: passport } = await getPassport(ws, avatar.id);
  const engine = String(body.engine || pack.engine || "grok_imagine_ui");
  const priority = Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0;
  const batchId = newBatchId();

  const jobs = [];
  for (const scene of pack.scenes) {
    const prompt = buildAvatarPrompt(passport, sceneTemplate(scene));
    const { data: job } = await createJob(ws, { avatarId: avatar.id, packId: pack.id, engine, status: "queued",
      sceneKey: scene, prompt, batchId, priority, attempts: 0, maxAttempts: 3 });
    jobs.push(job);
  }
  broadcast("audit.logged", { event: "avatar.batch.queued", workspaceId: ws, batchId, pack: pack.id, count: jobs.length });
  return NextResponse.json({ ok: true, batchId, count: jobs.length, jobs, note: "queued — call /render-jobs/run-once (mock)" });
}

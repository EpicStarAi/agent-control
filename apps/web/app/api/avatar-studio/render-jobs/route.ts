import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getAvatar, getPassport, createJob, createAsset, listJobs } from "@/lib/avatarStudioData";
import { getPack, sceneTemplate, buildAvatarPrompt, getAdapter } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P27.1 — render jobs. POST fans a pack's scenes into jobs via the MOCK adapter
// (no browser automation, no external calls). Each done job yields a draft asset.
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
  const body = (await req.json().catch(() => ({}))) as { avatarId?: string; packId?: string };
  const avatarId = String(body.avatarId || "");
  const pack = getPack(String(body.packId || ""));
  if (!pack) return NextResponse.json({ ok: false, message: "unknown pack" }, { status: 400 });
  const { data: avatar } = await getAvatar(ws, avatarId);
  if (!avatar) return NextResponse.json({ ok: false, message: "avatar not found" }, { status: 404 });
  const { data: passport } = await getPassport(ws, avatarId);
  const adapter = getAdapter(pack.engine);

  const jobs = [];
  for (const scene of pack.scenes) {
    const prompt = buildAvatarPrompt(passport, sceneTemplate(scene));
    const r = await adapter.createJob({ avatarId, sceneKey: scene, prompt });
    const { data: job } = await createJob(ws, { avatarId, packId: pack.id, engine: pack.engine, status: r.status, sceneKey: scene, prompt, resultUrl: r.resultUrl, error: r.error });
    if (job.status === "done") {
      await createAsset(ws, { avatarId, jobId: job.id, assetType: "image", imageUrl: job.resultUrl, prompt, status: "draft" });
    }
    jobs.push(job);
  }
  broadcast("audit.logged", { event: "avatar.render.enqueued", workspaceId: ws, avatarId, pack: pack.id, count: jobs.length });
  return NextResponse.json({ ok: true, jobs, note: "mock render (P27.1) — no external execution" });
}

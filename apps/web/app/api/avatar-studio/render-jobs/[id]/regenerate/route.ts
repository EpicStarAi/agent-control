import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getJob, setJob, createAsset } from "@/lib/avatarStudioData";
import { getAdapter } from "@/lib/avatarStudio";
import { broadcast } from "@/lib/operatorBus";

// P27.1 — regenerate a render job via the MOCK adapter (no external execution).
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: job } = await getJob(ws, params.id);
  if (!job) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  const adapter = getAdapter(job.engine);
  const r = await adapter.createJob({ avatarId: job.avatarId, sceneKey: job.sceneKey, prompt: job.prompt });
  const { data: updated } = await setJob(ws, params.id, { status: r.status, resultUrl: r.resultUrl, error: r.error });
  if (updated && updated.status === "done") {
    await createAsset(ws, { avatarId: job.avatarId, jobId: job.id, assetType: "image", imageUrl: r.resultUrl, prompt: job.prompt, status: "draft" });
  }
  broadcast("audit.logged", { event: "avatar.render.regenerated", workspaceId: ws, jobId: params.id });
  return NextResponse.json({ ok: true, job: updated, note: "mock regenerate (P27.1)" });
}

import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { setJob, setAssetStatusByJob } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P27.1 — approve a render job (local status). MANUAL approval; no execution/publish.
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: job } = await setJob(ws, params.id, { status: "approved" });
  if (!job) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  await setAssetStatusByJob(ws, params.id, "approved");
  broadcast("audit.logged", { event: "avatar.render.approved", workspaceId: ws, jobId: params.id });
  return NextResponse.json({ ok: true, job });
}

import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { listScenes, createScene } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P29.3 Story Planner — Scene list/create (within an episode). ws-scoped.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const episodeId = new URL(req.url).searchParams.get("episodeId") || undefined;
  const { data: scenes, source } = await listScenes(ws, episodeId);
  return NextResponse.json({ ok: true, scenes, source });
}

export async function POST(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string; episodeId?: string; projectId?: string; characterIds?: string[]; summary?: string; goal?: string; output?: string; orderIndex?: number };
  if (!body.name || !String(body.name).trim()) return NextResponse.json({ ok: false, reason: "MISSING_NAME" }, { status: 400 });
  if (!body.episodeId) return NextResponse.json({ ok: false, reason: "MISSING_EPISODE" }, { status: 400 });
  const { data: scene, source } = await createScene(ws, {
    name: body.name, episodeId: body.episodeId, projectId: body.projectId,
    characterIds: Array.isArray(body.characterIds) ? body.characterIds : [],
    summary: body.summary, goal: body.goal, output: body.output, orderIndex: body.orderIndex,
  });
  broadcast("audit.logged", { event: "avatar.scene.create", workspaceId: ws, sceneId: scene.id });
  return NextResponse.json({ ok: true, scene, source });
}

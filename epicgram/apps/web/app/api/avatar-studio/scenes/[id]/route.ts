import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getScene, updateScene, deleteScene } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";
import type { Scene } from "@/lib/avatarStudio";

// P29.3 Story Planner — single Scene read / patch / delete. ws-scoped.
// PATCH updates cast/summary/goal/output/status. No auto-generation here (that's P29.4).
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: scene, source } = await getScene(ws, params.id);
  if (!scene) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, scene, source });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: existing } = await getScene(ws, params.id);
  if (!existing) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Partial<Scene>;
  const patch: Partial<Scene> = {};
  if (body.name != null) patch.name = body.name;
  if (Array.isArray(body.characterIds)) patch.characterIds = body.characterIds;
  if (body.summary != null) patch.summary = body.summary;
  if (body.goal != null) patch.goal = body.goal;
  if (body.output != null) patch.output = body.output;
  if (body.status != null) patch.status = body.status;
  if (body.orderIndex != null) patch.orderIndex = body.orderIndex;
  const { data: scene, source } = await updateScene(ws, params.id, patch);
  broadcast("audit.logged", { event: "avatar.scene.update", workspaceId: ws, sceneId: params.id, fields: Object.keys(patch) });
  return NextResponse.json({ ok: true, scene, source });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: existing } = await getScene(ws, params.id);
  if (!existing) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  await deleteScene(ws, params.id);
  broadcast("audit.logged", { event: "avatar.scene.delete", workspaceId: ws, sceneId: params.id });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getCharacter, updateCharacter, deleteCharacter } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P29.1 Cast Layer — single Character read / patch / delete. Scoped session→workspace.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: character, source } = await getCharacter(ws, params.id);
  if (!character) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, character, source });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: existing } = await getCharacter(ws, params.id);
  if (!existing) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, string>;
  const patch: Record<string, unknown> = {};
  for (const k of ["name", "role", "archetype", "status", "projectId", "avatarId", "economyProfile", "storySeed"]) {
    if (body[k] != null) patch[k] = body[k];
  }
  const { data: character, source } = await updateCharacter(ws, params.id, patch);
  broadcast("audit.logged", { event: "avatar.character.update", workspaceId: ws, characterId: params.id, fields: Object.keys(patch) });
  return NextResponse.json({ ok: true, character, source });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: existing } = await getCharacter(ws, params.id);
  if (!existing) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  await deleteCharacter(ws, params.id);
  broadcast("audit.logged", { event: "avatar.character.delete", workspaceId: ws, characterId: params.id });
  return NextResponse.json({ ok: true });
}

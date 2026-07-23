import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { listRelationships, createRelationship, deleteRelationship, getCharacter } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P29.1 Cast Layer — Relationship graph (character↔character edges). ws-scoped.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const characterId = new URL(req.url).searchParams.get("characterId") || undefined;
  const { data: relationships, source } = await listRelationships(ws, characterId);
  return NextResponse.json({ ok: true, relationships, source });
}

export async function POST(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { sourceCharacterId?: string; targetCharacterId?: string; relationType?: string; description?: string; strength?: number; projectId?: string };
  const src = String(body.sourceCharacterId || ""); const tgt = String(body.targetCharacterId || "");
  if (!src || !tgt) return NextResponse.json({ ok: false, reason: "MISSING_CHARACTER" }, { status: 400 });
  if (src === tgt) return NextResponse.json({ ok: false, reason: "SELF_RELATION" }, { status: 400 });
  const { data: a } = await getCharacter(ws, src); if (!a) return NextResponse.json({ ok: false, reason: "MISSING_SOURCE" }, { status: 400 });
  const { data: b } = await getCharacter(ws, tgt); if (!b) return NextResponse.json({ ok: false, reason: "MISSING_TARGET" }, { status: 400 });
  const { data: relationship, source } = await createRelationship(ws, {
    sourceCharacterId: src, targetCharacterId: tgt, relationType: body.relationType as never,
    description: body.description, strength: body.strength, projectId: body.projectId || a.projectId,
  });
  broadcast("audit.logged", { event: "avatar.relationship.create", workspaceId: ws, relationshipId: relationship.id });
  return NextResponse.json({ ok: true, relationship, source });
}

export async function DELETE(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ ok: false, reason: "MISSING_ID" }, { status: 400 });
  await deleteRelationship(ws, id);
  broadcast("audit.logged", { event: "avatar.relationship.delete", workspaceId: ws, relationshipId: id });
  return NextResponse.json({ ok: true });
}

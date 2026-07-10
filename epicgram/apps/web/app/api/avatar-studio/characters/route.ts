import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { listCharacters, createCharacter, getAvatar, getProject } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P29.1 Cast Layer — Character (wraps an avatar) list/create. Scoped session→workspace.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get("projectId") || undefined;
  const { data: characters, source } = await listCharacters(ws, projectId);
  return NextResponse.json({ ok: true, characters, source });
}

export async function POST(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string; projectId?: string; avatarId?: string; role?: string; archetype?: string; status?: string; economyProfile?: string; storySeed?: string };
  if (!body.name || !String(body.name).trim()) return NextResponse.json({ ok: false, reason: "MISSING_NAME" }, { status: 400 });
  if (body.projectId) { const { data: proj } = await getProject(ws, body.projectId); if (!proj) return NextResponse.json({ ok: false, reason: "MISSING_PROJECT" }, { status: 400 }); }
  if (body.avatarId) { const { data: av } = await getAvatar(ws, body.avatarId); if (!av) return NextResponse.json({ ok: false, reason: "MISSING_AVATAR" }, { status: 400 }); }
  const { data: character, source } = await createCharacter(ws, {
    name: body.name, projectId: body.projectId, avatarId: body.avatarId, role: body.role as never,
    archetype: body.archetype, status: body.status as never, economyProfile: body.economyProfile, storySeed: body.storySeed,
  });
  broadcast("audit.logged", { event: "avatar.character.create", workspaceId: ws, characterId: character.id, projectId: character.projectId });
  return NextResponse.json({ ok: true, character, source });
}

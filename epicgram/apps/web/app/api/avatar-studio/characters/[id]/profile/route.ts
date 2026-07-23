import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getCharacter, getCharacterProfile, upsertCharacterProfile } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";
import type { CharacterProfile } from "@/lib/avatarStudio";

// P29.2 — Character Profile (passport of a character): goals, profession, interests,
// speech style, memory, skills, constraints, tone of voice. 1:1 upsert. ws-scoped.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: character } = await getCharacter(ws, params.id);
  if (!character) return NextResponse.json({ ok: false, reason: "MISSING_CHARACTER" }, { status: 404 });
  const { data: profile, source } = await getCharacterProfile(ws, params.id);
  return NextResponse.json({ ok: true, profile, source });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: character } = await getCharacter(ws, params.id);
  if (!character) return NextResponse.json({ ok: false, reason: "MISSING_CHARACTER" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Partial<CharacterProfile>;
  const { data: profile, source } = await upsertCharacterProfile(ws, params.id, body);
  broadcast("audit.logged", { event: "avatar.character.profile.saved", workspaceId: ws, characterId: params.id });
  return NextResponse.json({ ok: true, profile, source });
}

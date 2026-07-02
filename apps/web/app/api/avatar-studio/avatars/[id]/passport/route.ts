import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getAvatar, upsertPassport } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";
import type { AvatarPassport } from "@/lib/avatarStudio";

// P27.1 — upsert an avatar passport (identity/style notes, forbidden rules, profile json).
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: avatar } = await getAvatar(ws, params.id);
  if (!avatar) return NextResponse.json({ ok: false, message: "avatar not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Partial<AvatarPassport>;
  const { data, source } = await upsertPassport(ws, params.id, body);
  broadcast("audit.logged", { event: "avatar.passport.saved", workspaceId: ws, avatarId: params.id });
  return NextResponse.json({ ok: true, passport: data, source });
}

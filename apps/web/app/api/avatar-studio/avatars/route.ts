import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { listAvatars, createAvatar } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";
import type { Avatar } from "@/lib/avatarStudio";

// P27.1 — avatars. Scoped session→workspace. No secrets.
export const dynamic = "force-dynamic";

export async function GET() {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data, source } = await listAvatars(ws);
  return NextResponse.json({ avatars: data, source });
}

export async function POST(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<Avatar>;
  if (!String(body.name || "").trim()) return NextResponse.json({ ok: false, message: "name required" }, { status: 400 });
  const status: Avatar["status"] = body.consentConfirmed ? "active" : "draft";
  const { data, source } = await createAvatar(ws, { name: body.name, sourceImageUrl: body.sourceImageUrl, consentConfirmed: Boolean(body.consentConfirmed), status });
  broadcast("audit.logged", { event: "avatar.created", workspaceId: ws, avatarId: data.id });
  return NextResponse.json({ ok: true, avatar: data, source });
}

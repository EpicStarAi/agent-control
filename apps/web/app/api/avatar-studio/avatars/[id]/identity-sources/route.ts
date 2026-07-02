import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getAvatar, listIdentitySources, createIdentitySource } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P27.8 — register / list avatar identity reference sources.
// NOT face recognition, NOT biometric verification: operator-registered metadata only.
// No cloud storage required (mock-safe: URL / manual / metadata). No secrets stored.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: avatar } = await getAvatar(ws, params.id);
  if (!avatar) return NextResponse.json({ ok: false, reason: "MISSING_AVATAR" }, { status: 404 });
  const { data: sources, source } = await listIdentitySources(ws, params.id);
  return NextResponse.json({ ok: true, sources, source });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: avatar } = await getAvatar(ws, params.id);
  if (!avatar) return NextResponse.json({ ok: false, reason: "MISSING_AVATAR" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { type?: string; label?: string; fileUrl?: string; consentConfirmed?: boolean };
  const type = (body.type === "prompt" || body.type === "manual" || body.type === "photo") ? body.type : "photo";
  const { data: src } = await createIdentitySource(ws, params.id, {
    type, label: body.label, fileUrl: body.fileUrl, consentConfirmed: Boolean(body.consentConfirmed),
  });
  broadcast("audit.logged", { event: "avatar.identity_source.add", workspaceId: ws, avatarId: params.id, sourceId: src.id, type: src.type });
  return NextResponse.json({ ok: true, status: "IDENTITY_SOURCE_ADDED", source: src });
}

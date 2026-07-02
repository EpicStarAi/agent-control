import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { getAvatar, getPassport } from "@/lib/avatarStudioData";

// P27.1 — single avatar + its passport. Scoped session→workspace.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: avatar, source } = await getAvatar(ws, params.id);
  if (!avatar) return NextResponse.json({ ok: false, message: "not found" }, { status: 404 });
  const { data: passport } = await getPassport(ws, params.id);
  return NextResponse.json({ avatar, passport, source });
}

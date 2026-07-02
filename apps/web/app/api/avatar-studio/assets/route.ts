import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { listAssets } from "@/lib/avatarStudioData";

// P27.4 — list avatar assets (with quality + candidate metadata). Scoped session→workspace.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const avatarId = new URL(req.url).searchParams.get("avatarId") || undefined;
  const { data, source } = await listAssets(ws, avatarId);
  return NextResponse.json({ assets: data, source });
}

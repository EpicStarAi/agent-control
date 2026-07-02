import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { listSeasons, createSeason } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P29.3 Story Planner — Season list/create. ws-scoped.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const projectId = new URL(req.url).searchParams.get("projectId") || undefined;
  const { data: seasons, source } = await listSeasons(ws, projectId);
  return NextResponse.json({ ok: true, seasons, source });
}

export async function POST(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string; projectId?: string; orderIndex?: number };
  if (!body.name || !String(body.name).trim()) return NextResponse.json({ ok: false, reason: "MISSING_NAME" }, { status: 400 });
  const { data: season, source } = await createSeason(ws, { name: body.name, projectId: body.projectId, orderIndex: body.orderIndex });
  broadcast("audit.logged", { event: "avatar.season.create", workspaceId: ws, seasonId: season.id });
  return NextResponse.json({ ok: true, season, source });
}

import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { listEpisodes, createEpisode } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P29.3 Story Planner — Episode list/create (within a season). ws-scoped.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const seasonId = new URL(req.url).searchParams.get("seasonId") || undefined;
  const { data: episodes, source } = await listEpisodes(ws, seasonId);
  return NextResponse.json({ ok: true, episodes, source });
}

export async function POST(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string; seasonId?: string; projectId?: string; synopsis?: string; orderIndex?: number };
  if (!body.name || !String(body.name).trim()) return NextResponse.json({ ok: false, reason: "MISSING_NAME" }, { status: 400 });
  if (!body.seasonId) return NextResponse.json({ ok: false, reason: "MISSING_SEASON" }, { status: 400 });
  const { data: episode, source } = await createEpisode(ws, { name: body.name, seasonId: body.seasonId, projectId: body.projectId, synopsis: body.synopsis, orderIndex: body.orderIndex });
  broadcast("audit.logged", { event: "avatar.episode.create", workspaceId: ws, episodeId: episode.id });
  return NextResponse.json({ ok: true, episode, source });
}

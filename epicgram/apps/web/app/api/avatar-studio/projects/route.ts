import { NextResponse } from "next/server";
import { currentWorkspaceId } from "@/lib/sessionWs";
import { listProjects, createProject } from "@/lib/avatarStudioData";
import { broadcast } from "@/lib/operatorBus";

// P29.1 Cast Layer — Project (Universe) list/create. Scoped session→workspace.
export const dynamic = "force-dynamic";

export async function GET() {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { data: projects, source } = await listProjects(ws);
  return NextResponse.json({ ok: true, projects, source });
}

export async function POST(req: Request) {
  const ws = await currentWorkspaceId();
  if (!ws) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { name?: string; type?: string; status?: string; description?: string };
  if (!body.name || !String(body.name).trim()) return NextResponse.json({ ok: false, reason: "MISSING_NAME" }, { status: 400 });
  const { data: project, source } = await createProject(ws, { name: body.name, type: body.type, status: body.status, description: body.description });
  broadcast("audit.logged", { event: "avatar.project.create", workspaceId: ws, projectId: project.id });
  return NextResponse.json({ ok: true, project, source });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/authData";
import { listMemory, addMemory } from "@/lib/memoryData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import { SESSION_COOKIE } from "@/lib/auth";
import { normalizeScope, type MemoryEntry, type MemoryScope } from "@/lib/memory";

// P34 — Workspace Memory. Scoped to the caller's session→workspace: the workspace_id
// comes from the cookie, never from the body, so one workspace can never read/write
// another's memory. Requires an authenticated referral session. No secrets stored.
export const dynamic = "force-dynamic";

async function workspaceId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value || "";
  const s = await getSession(token);
  return s.authenticated ? (s.workspace?.id || null) : null;
}

export async function GET(req: Request) {
  const id = await workspaceId();
  if (!id) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const raw = new URL(req.url).searchParams.get("scope");
  const scope: MemoryScope | undefined = raw ? normalizeScope(raw) : undefined;
  const { entries, source } = await listMemory(id, scope);
  return NextResponse.json({ entries, source });
}

export async function POST(req: Request) {
  const id = await workspaceId();
  if (!id) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<MemoryEntry>;
  if (!body || !String(body.key || "").trim()) {
    return NextResponse.json({ ok: false, message: "key required" }, { status: 400 });
  }
  const r = await addMemory(id, body);
  broadcast("audit.logged", { event: "memory.updated", workspaceId: id, scope: r.entry.scope });
  await appendOperatorEvent({ missionId: null, sourceOperator: "Operator-Core", eventType: "logged",
    message: `AI Memory обновлена · ${r.entry.scope} · «${r.entry.key}»`,
    riskLevel: "none", approvalState: "not_required" }).catch(() => {});
  return NextResponse.json(r);
}

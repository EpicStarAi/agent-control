import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/authData";
import { getProfile, saveProfile } from "@/lib/profileData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import { SESSION_COOKIE } from "@/lib/auth";
import type { WorkspaceProfile } from "@/lib/profile";

// P31 — workspace profile (Profile Wizard). Scoped to the caller's session→workspace.
// Reading/writing another workspace's profile is impossible: the id comes from the cookie,
// never from the request body. Requires an authenticated referral session.
export const dynamic = "force-dynamic";

async function workspaceId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value || "";
  const s = await getSession(token);
  return s.authenticated ? (s.workspace?.id || null) : null;
}

export async function GET() {
  const id = await workspaceId();
  if (!id) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const { profile, source } = await getProfile(id);
  return NextResponse.json({ profile, source });
}

export async function POST(req: Request) {
  const id = await workspaceId();
  if (!id) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<WorkspaceProfile>;
  const r = await saveProfile(id, body ?? {});
  broadcast("audit.logged", { event: "profile.wizard.completed", workspaceId: id });
  await appendOperatorEvent({ missionId: null, sourceOperator: "AccessGate", eventType: "logged",
    message: `Profile Wizard завершён · workspace scoped · оператор «${r.profile.displayName || "—"}»`,
    riskLevel: "none", approvalState: "not_required" }).catch(() => {});
  return NextResponse.json(r);
}

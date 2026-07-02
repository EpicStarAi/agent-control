import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/authData";
import { catalog, setConnection } from "@/lib/connectionsData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import { SESSION_COOKIE } from "@/lib/auth";
import { isKnownProvider, providerClass, type Connection, type ProviderClass } from "@/lib/connections";

// P36 — Universal Connect Layer. Provider-agnostic: the client connects any
// provider identically; the Router never special-cases Telegram. Scoped to the
// caller's session→workspace (id from cookie, never body). Records connection
// intent + status only — NO tokens/keys are accepted or stored (session_ref is
// an opaque pointer). Real provider auth (e.g. Telegram TDLib) happens elsewhere.
export const dynamic = "force-dynamic";

async function workspaceId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value || "";
  const s = await getSession(token);
  return s.authenticated ? (s.workspace?.id || null) : null;
}
const CLASSES = new Set(["communication", "media", "service"]);

export async function GET(req: Request) {
  const id = await workspaceId();
  if (!id) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const raw = new URL(req.url).searchParams.get("class");
  const klass = raw && CLASSES.has(raw) ? (raw as ProviderClass) : undefined;
  const { providers, source } = await catalog(id, klass);
  return NextResponse.json({ providers, source });
}

export async function POST(req: Request) {
  const id = await workspaceId();
  if (!id) return NextResponse.json({ authenticated: false, message: "referral session required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Partial<Connection>;
  const provider = String(body.provider || "").trim();
  if (!isKnownProvider(provider)) return NextResponse.json({ ok: false, message: "unknown provider" }, { status: 400 });
  // Never accept secrets. Only status + an opaque ref are recorded.
  const r = await setConnection(id, { provider, status: body.status ?? "connected", sessionRef: String(body.sessionRef || "").slice(0, 120) });
  broadcast("audit.logged", { event: "connection.updated", workspaceId: id, provider, class: providerClass(provider) });
  await appendOperatorEvent({ missionId: null, sourceOperator: "Connect-Service", eventType: "logged",
    message: `Connect Service · ${provider} → ${r.connection.status} (${providerClass(provider)})`,
    riskLevel: "none", approvalState: "not_required" }).catch(() => {});
  return NextResponse.json(r);
}

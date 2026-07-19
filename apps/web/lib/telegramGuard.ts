import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/authData";
import { SESSION_COOKIE } from "@/lib/auth";

// INCIDENT hotfix/client-auth-guard — server-side authorization gate for the
// Telegram surface.
//
// Context: /client and every /api/telegram/* route shipped with no session
// check at all, so any anonymous visitor was served the one global TDLib
// session held by the backend singleton. The gate below MUST be enforced
// inside each route handler: a Next.js middleware redirect only protects the
// page, leaving `curl /api/telegram/chats` fully open.
//
// Nothing here trusts the browser. accountId, owner identity, session paths
// and approval flags arriving from the client are ignored by design.

export type Principal = {
  userId: string;
  workspaceId: string;
  role: string;
};

// Authenticated Telegram responses must never be stored by a browser, shared
// proxy or CDN — they carry another person's private data.
export const PRIVATE_NO_STORE: Record<string, string> = {
  "cache-control": "private, no-store, max-age=0, must-revalidate",
  pragma: "no-cache",
  "x-epicgram-guard": "telegram-auth-guard"
};

export function guardedJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body as Record<string, unknown>, { status, headers: PRIVATE_NO_STORE });
}

// ---------------------------------------------------------------------------
// Redacted audit
// ---------------------------------------------------------------------------

// Fields that must never reach a log line. The Telegram login code, the 2FA
// password and the full phone number are the ones that matter most here.
const FORBIDDEN_KEYS = new Set([
  "code",
  "password",
  "phone",
  "phonenumber",
  "text",
  "token",
  "session",
  "sessionref",
  "apihash",
  "apiid",
  "databasekey",
  "qrlink"
]);

export type AuditRecord = {
  event: "telegram_access_denied";
  reason: string;
  route: string;
  method: string;
  actor: string;
  outcome: "denied";
  at: string;
};

// Pure + exported so tests can assert redaction without touching the log sink.
export function buildAuditRecord(input: {
  reason: string;
  route: string;
  method: string;
  principal?: Principal | null;
  at?: string;
}): AuditRecord {
  return {
    event: "telegram_access_denied",
    reason: input.reason,
    route: String(input.route).slice(0, 120),
    method: String(input.method).slice(0, 10),
    // Authenticated denials are attributed by opaque user id only — never by
    // name, phone or Telegram identity.
    actor: input.principal?.userId ? `user:${input.principal.userId}` : "anonymous",
    outcome: "denied",
    at: input.at ?? new Date().toISOString()
  };
}

// Defence in depth: even though buildAuditRecord only emits a fixed field set,
// assert no forbidden key can ever be serialised.
export function assertRedacted(record: Record<string, unknown>): boolean {
  return Object.keys(record).every((k) => !FORBIDDEN_KEYS.has(k.toLowerCase()));
}

export function recordDenial(input: {
  reason: string;
  route: string;
  method: string;
  principal?: Principal | null;
}): AuditRecord {
  const record = buildAuditRecord(input);
  if (assertRedacted(record as unknown as Record<string, unknown>)) {
    // Structured, secret-free. Collected by the platform log pipeline.
    console.warn(`[security-audit] ${JSON.stringify(record)}`);
  }
  return record;
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function getPrincipal(): Promise<Principal | null> {
  const token = cookies().get(SESSION_COOKIE)?.value || "";
  if (!token) return null;
  const s = await getSession(token);
  if (!s.authenticated || !s.user?.id || !s.workspace?.id) return null;
  return { userId: s.user.id, workspaceId: s.workspace.id, role: s.user.role || "user" };
}

// Returns the principal, or a ready-to-return 401 response. Every
// /api/telegram/* handler starts with this — including read-only ones.
export async function requirePrincipal(
  route: string,
  method: string
): Promise<{ ok: true; principal: Principal } | { ok: false; response: NextResponse }> {
  const principal = await getPrincipal();
  if (!principal) {
    recordDenial({ reason: "unauthenticated", route, method });
    return {
      ok: false,
      response: guardedJson(
        { authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
        401
      )
    };
  }
  return { ok: true, principal };
}

// ---------------------------------------------------------------------------
// Account binding
// ---------------------------------------------------------------------------

// Resolves which Telegram account the authenticated caller owns.
//
// There is currently NO authenticated-user -> telegram_account_id -> TDLib
// session-owner association model in this codebase (lib/auth.ts models
// User/Session/Workspace and stops there). Until P-EPICGRAM-CLIENT-PLATFORM-1
// introduces that mapping with a verified owner id, this resolver returns null
// for everyone and callers fall back to a safe empty state.
//
// It deliberately does NOT derive an account from Connection.sessionRef: that
// value is client-influenced, so honouring it would let any referral-session
// holder point at the shared "main" slot and reach the live account again —
// i.e. reintroduce this exact incident behind a login form.
//
// Deny-by-default. Do not "fix" this by returning a default/fallback account.
export async function resolveBoundAccountId(_principal: Principal): Promise<string | null> {
  return null;
}

// Discriminated result the /api/telegram/* and operator routes consume:
//   { kind: "ok", accountId }  — caller owns a ready, owner-matched slot
//   { kind: "mismatch" }       — a binding exists but is NOT owner-matched (403)
//   { kind: "no_binding" }     — no bound account (safe empty state)
export type BoundAccountResolution =
  | { kind: "ok"; accountId: string }
  | { kind: "mismatch" }
  | { kind: "no_binding" };

// Thin, deny-by-default wrapper around resolveBoundAccountId that the route
// handlers already depend on. It intentionally does NOT introduce any new
// account-resolution behaviour: it delegates to resolveBoundAccountId (which
// returns null for everyone until P-EPICGRAM-CLIENT-PLATFORM-1 lands the
// owner-matched binding model), so every caller still falls through to the safe
// empty state. It can never return "ok" while resolveBoundAccountId returns null,
// so the incident-containment posture (no cross-user account exposure) is
// preserved exactly. Owner-mismatch detection is reserved for that later model.
export async function resolveBoundAccount(principal: Principal): Promise<BoundAccountResolution> {
  const accountId = await resolveBoundAccountId(principal);
  if (!accountId) return { kind: "no_binding" };
  return { kind: "ok", accountId };
}

export function safeEmptyState(reason: "no_binding") {
  return {
    authenticated: true,
    connected: false,
    runtime: "no_account_bound",
    reason,
    activeAccountId: null,
    account: null,
    accounts: [],
    chats: [],
    messages: [],
    ownerMatched: false,
    mutationsEnabled: false,
    message:
      "К вашему профилю не привязан Telegram-аккаунт. Привязка появится после включения owner-matched TDLib-сессии."
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

// Server-side mutation switch. Defaults to DISABLED. The browser cannot
// influence this: `operatorApproved` and any other request-supplied approval
// flag is ignored entirely.
export function telegramMutationsEnabled(): boolean {
  return String(process.env.TELEGRAM_MUTATION ?? "false").trim().toLowerCase() === "true";
}

export const MUTATION_DENIED_MESSAGE =
  "Telegram-мутации отключены (TELEGRAM_MUTATION=false). Действие не выполнено.";

// Every send/edit/delete/join/leave/profile route funnels through this.
export function denyMutation(
  route: string,
  method: string,
  principal: Principal | null,
  kind: string
): NextResponse {
  recordDenial({ reason: `mutation_denied:${kind}`, route, method, principal });
  return guardedJson(
    { sent: false, executed: false, mutationsEnabled: false, message: MUTATION_DENIED_MESSAGE },
    403
  );
}

export function denyOwnerMismatch(
  route: string,
  method: string,
  principal: Principal | null
): NextResponse {
  recordDenial({ reason: "owner_mismatch", route, method, principal });
  return guardedJson(
    { authenticated: true, ownerMatched: false, message: "Доступ к этой сессии запрещён." },
    403
  );
}

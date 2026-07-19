import { NextResponse } from "next/server";
import { getPrincipal, resolveBoundAccount } from "@/lib/telegramGuard";

// Operator Office runtime status — ACCOUNT-AWARE (fix [HIGH]).
// Chain: OperatorOffice -> /api/operator/qclaw/status -> resolveBoundAccount(principal)
//        -> backend GET /telegram/accounts (127.0.0.1:8788) -> the caller's OWN slot.
// It NEVER reads legacy /telegram/status (the shared NOVIKOVA singleton). No ready
// binding -> safe empty (not connected, no account). Owner mismatch -> 403.
// Auth: valid EPICGRAM session cookie required; unauthenticated -> 401.

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";
const SEND_POLICY = "locked";
const APPROVAL_REQUIRED = true;

function maskId(id: string | null | undefined): string | null {
  if (!id) return null;
  const s = String(id);
  if (s.length <= 5) return "***";
  return `${s.slice(0, 4)}***${s.slice(-2)}`;
}

type BackendAccount = {
  id?: string | null;
  slotId?: string | null;
  online?: boolean;
  authorizationState?: string | null;
  account?: { id?: string | null; displayName?: string | null; username?: string | null } | null;
};

function emptyState(reason: string, extra: Record<string, unknown> = {}) {
  return {
    ok: true,
    runtime: { state: "no_account_bound", tdlib: "n/a", nativeBindingLoaded: false },
    authorizationState: "no_account_bound",
    account: null,
    selectedChat: null,
    sendPolicy: SEND_POLICY,
    approvalRequired: APPROVAL_REQUIRED,
    reason,
    telegram: { connected: false, authorizationState: "no_account_bound", activeAccount: null },
    ...extra,
  };
}

export async function GET() {
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const bound = await resolveBoundAccount(principal);
  if (bound.kind === "mismatch") {
    return NextResponse.json(
      { ok: false, ownerMatched: false, message: "Доступ к этой сессии запрещён." },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }
  if (bound.kind !== "ok") {
    return NextResponse.json(emptyState("no_binding"), { status: 200, headers: { "cache-control": "no-store" } });
  }

  const accountId = bound.accountId;
  let slot: BackendAccount | null = null;
  let reachable = false;
  try {
    const resp = await fetch(`${API_BASE_URL}/telegram/accounts`, {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });
    reachable = resp.ok;
    if (resp.ok) {
      const body = (await resp.json().catch(() => null)) as { accounts?: BackendAccount[] } | null;
      const list = Array.isArray(body?.accounts) ? (body!.accounts as BackendAccount[]) : [];
      slot = list.find((a) => String(a.slotId ?? a.id) === accountId) ?? null;
    }
  } catch {
    reachable = false;
  }

  if (!reachable) {
    return NextResponse.json(
      emptyState("backend_unreachable", {
        runtime: { state: "unavailable", tdlib: "unavailable", nativeBindingLoaded: false },
        authorizationState: "unavailable",
        telegram: { connected: false, authorizationState: "unavailable", activeAccount: null },
      }),
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
  if (!slot) {
    return NextResponse.json(emptyState("slot_not_registered"), { status: 200, headers: { "cache-control": "no-store" } });
  }

  const authorizationState = slot.authorizationState ?? "unknown";
  const connected = slot.online === true || authorizationState === "authorizationStateReady";
  const acc = slot.account ?? null;

  return NextResponse.json(
    {
      ok: true,
      runtime: { state: connected ? "ready" : "waiting_auth", tdlib: "configured", nativeBindingLoaded: connected },
      authorizationState,
      account: {
        id: maskId(accountId),
        displayName: acc?.displayName ?? null,
        username: acc?.username ?? null,
        phoneMasked: null,
      },
      selectedChat: null,
      sendPolicy: SEND_POLICY,
      approvalRequired: APPROVAL_REQUIRED,
      telegram: {
        connected,
        authorizationState,
        activeAccount: {
          displayName: acc?.displayName ?? null,
          username: acc?.username ?? null,
          idMasked: maskId(accountId),
        },
      },
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}

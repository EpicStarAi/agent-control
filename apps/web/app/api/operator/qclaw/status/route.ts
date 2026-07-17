import { NextResponse } from "next/server";
import { getPrincipal } from "@/lib/telegramGuard";

// Real runtime status for the Operator Office console.
// Chain: OperatorOffice -> /api/operator/qclaw/status -> backend /telegram/status
//        (127.0.0.1:8788) -> real TDLib runtime.
// This dedicated segment route takes precedence over the /api/operator/[...path]
// catch-all proxy, which forwarded to a non-existent backend /operator/qclaw/status
// and therefore returned 404. We proxy the REAL status endpoint and normalize it.
// Fail-closed: on any backend error we still report the locked send policy and never
// assume a live/authorized state. No mock, no static fallback — data is backend-derived.
//
// Auth: requires valid EPICGRAM session cookie (same as /api/telegram/*).
// If not authenticated -> 401. This prevents NOVIKOVA account data leakage.

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

type BackendAccount = {
  id?: string | null;
  displayName?: string | null;
  username?: string | null;
  phoneMasked?: string | null;
  type?: string | null;
};

type BackendStatus = {
  runtime?: string;
  mode?: string;
  authorizationState?: string;
  accounts?: BackendAccount[];
  tdlibConfigured?: boolean;
  enabled?: boolean;
  adapter?: {
    runtimeAdapter?: string;
    nativeBindingLoaded?: boolean;
    authorizationState?: string;
    tdlibInfo?: { version?: string; commit?: string } | null;
  } | null;
};

// Operator Office is strictly read-only: live send is never enabled from here.
const SEND_POLICY = "locked";
const APPROVAL_REQUIRED = true;

// The account id is not a secret, but we surface it masked (never the raw phone/secret).
function maskId(id: string | null | undefined): string | null {
  if (!id) return null;
  const s = String(id);
  if (s.length <= 5) return "***";
  return `${s.slice(0, 4)}***${s.slice(-2)}`;
}

export async function GET() {
  // --- Auth gate (mirrors /api/telegram/status pattern) ---
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  let backend: BackendStatus | null = null;
  let reachable = false;

  try {
    const resp = await fetch(`${API_BASE_URL}/telegram/status`, {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });
    reachable = resp.ok;
    if (resp.ok) {
      backend = (await resp.json().catch(() => null)) as BackendStatus | null;
    }
  } catch {
    reachable = false;
  }

  // Fail-closed: backend unreachable or non-OK → never assume live state.
  if (!reachable || !backend || typeof backend !== "object") {
    return NextResponse.json(
      {
        ok: false,
        runtime: { state: "unavailable", tdlib: "unavailable", nativeBindingLoaded: false },
        authorizationState: "unavailable",
        account: null,
        selectedChat: null,
        sendPolicy: SEND_POLICY,
        approvalRequired: APPROVAL_REQUIRED,
        telegram: { connected: false, authorizationState: "unavailable", activeAccount: null },
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  const adapter = backend.adapter ?? null;
  const authorizationState =
    backend.authorizationState ?? adapter?.authorizationState ?? "unknown";
  const connected = authorizationState === "authorizationStateReady";

  const acc =
    Array.isArray(backend.accounts) && backend.accounts.length > 0
      ? backend.accounts[0]
      : null;

  const tdlibVersion =
    adapter?.tdlibInfo?.version ??
    (backend.tdlibConfigured ? "configured" : "unknown");
  const nativeBindingLoaded = Boolean(adapter?.nativeBindingLoaded);

  const account = acc
    ? {
        id: maskId(acc.id),
        displayName: acc.displayName ?? null,
        username: acc.username ?? null,
        phoneMasked: acc.phoneMasked ?? null,
      }
    : null;

  return NextResponse.json(
    {
      ok: true,
      runtime: {
        state: backend.runtime ?? "unknown",
        tdlib: tdlibVersion,
        nativeBindingLoaded,
      },
      authorizationState,
      account,
      // Runtime status carries no notion of a selected chat.
      selectedChat: null,
      sendPolicy: SEND_POLICY,
      approvalRequired: APPROVAL_REQUIRED,
      // Shape consumed by OperatorOffice panels + console.
      telegram: {
        connected,
        authorizationState,
        activeAccount: acc
          ? {
              displayName: acc.displayName ?? null,
              username: acc.username ?? null,
              idMasked: maskId(acc.id),
            }
          : null,
      },
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}

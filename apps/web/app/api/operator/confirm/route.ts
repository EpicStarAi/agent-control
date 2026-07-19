import { NextRequest, NextResponse } from "next/server";
import { proxyOperatorRequest } from "../_proxy";
import {
  getPrincipal,
  resolveBoundAccount,
  telegramMutationsEnabled,
  denyMutation,
} from "@/lib/telegramGuard";

// Confirms a pending operator action (e.g. send_message). The backend executes
// only when it receives this explicit confirmation — so this route is a real
// mutator and is gated like every /api/telegram/* send path:
//   1. authenticated session required           -> 401
//   2. global TELEGRAM_MUTATION kill-switch      -> 403 when disabled
//   3. owner-matched, ready binding required     -> 403 when absent/mismatched
// Only after all three does the confirmation reach the backend. The client
// cannot influence any of these decisions.
const H = { "cache-control": "no-store" } as const;

export async function POST(request: NextRequest) {
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
      { status: 401, headers: H }
    );
  }

  if (!telegramMutationsEnabled()) {
    return denyMutation("/api/operator/confirm", "POST", principal, "operator_confirm_disabled");
  }

  const bound = await resolveBoundAccount(principal);
  if (bound.kind !== "ok") {
    return NextResponse.json(
      { ok: false, ownerMatched: bound.kind !== "mismatch", executed: false, message: "К вашему профилю не привязан owner-matched Telegram-аккаунт." },
      { status: 403, headers: H }
    );
  }

  const body = await request.text();
  return proxyOperatorRequest("/operator/confirm", { method: "POST", body });
}

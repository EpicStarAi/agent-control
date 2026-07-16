import { requirePrincipal, resolveBoundAccountId, safeEmptyState, guardedJson } from "@/lib/telegramGuard";

// INCIDENT hotfix/client-auth-guard: this route previously returned the
// backend's global TDLib status — the one live account — to any anonymous
// caller. Now an authenticated EPICGRAM session is required and the account is
// resolved server-side from that session only. No fallback/default account.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePrincipal("/api/telegram/status", "GET");
  if (!auth.ok) return auth.response;

  const accountId = await resolveBoundAccountId(auth.principal);
  if (!accountId) return guardedJson(safeEmptyState("no_binding"), 200);

  // Unreachable until the binding model lands. Left explicit so that whoever
  // adds the mapping must add the owner-match check here rather than fall
  // through to the shared backend session.
  return guardedJson(safeEmptyState("no_binding"), 200);
}

import { requirePrincipal, resolveBoundAccountId, safeEmptyState, guardedJson } from "@/lib/telegramGuard";

// INCIDENT hotfix/client-auth-guard: this wildcard proxy forwarded any path
// slice plus a browser-supplied accountId to the backend account API with no
// session check. Authenticated session required; safe empty state until an
// owner-matched binding exists. The path slice is no longer forwarded.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePrincipal("/api/v1/telegram/account", "GET");
  if (!auth.ok) return auth.response;

  const accountId = await resolveBoundAccountId(auth.principal);
  if (!accountId) return guardedJson(safeEmptyState("no_binding"), 200);

  return guardedJson(safeEmptyState("no_binding"), 200);
}

import { requirePrincipal, resolveBoundAccountId, safeEmptyState, guardedJson } from "@/lib/telegramGuard";

// INCIDENT hotfix/client-auth-guard: authenticated session required. The
// account is resolved server-side only; with no binding the caller gets a safe
// empty state — never the shared/default account.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePrincipal("/api/v1/telegram/drafts", "GET");
  if (!auth.ok) return auth.response;

  const accountId = await resolveBoundAccountId(auth.principal);
  if (!accountId) return guardedJson({ ...safeEmptyState("no_binding"), drafts: [] }, 200);

  return guardedJson({ ...safeEmptyState("no_binding"), drafts: [] }, 200);
}

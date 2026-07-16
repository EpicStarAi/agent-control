import { NextRequest } from "next/server";
import { requirePrincipal, resolveBoundAccountId, safeEmptyState, guardedJson } from "@/lib/telegramGuard";

// INCIDENT hotfix/client-auth-guard: previously any anonymous caller could read
// the messages of any chat by passing accountId/chatId. Both parameters are now
// ignored until the caller's session resolves to an owned account.
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/messages", "GET");
  if (!auth.ok) return auth.response;

  const accountId = await resolveBoundAccountId(auth.principal);
  if (!accountId) return guardedJson({ ...safeEmptyState("no_binding"), messages: [] }, 200);

  return guardedJson({ ...safeEmptyState("no_binding"), messages: [] }, 200);
}

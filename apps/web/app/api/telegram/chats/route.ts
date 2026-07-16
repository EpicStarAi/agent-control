import { NextRequest } from "next/server";
import { requirePrincipal, resolveBoundAccountId, safeEmptyState, guardedJson } from "@/lib/telegramGuard";

// INCIDENT hotfix/client-auth-guard: this route previously forwarded the
// browser-supplied `accountId` straight to the backend with no session check,
// returning the live chat list to anonymous callers. The query parameter is
// now ignored entirely — the account may only come from the caller's session.
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/chats", "GET");
  if (!auth.ok) return auth.response;

  const accountId = await resolveBoundAccountId(auth.principal);
  if (!accountId) return guardedJson({ ...safeEmptyState("no_binding"), chats: [] }, 200);

  return guardedJson({ ...safeEmptyState("no_binding"), chats: [] }, 200);
}

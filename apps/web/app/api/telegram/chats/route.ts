import { NextRequest } from "next/server";
import { requirePrincipal, resolveBoundAccount, safeEmptyState, guardedJson, denyOwnerMismatch } from "@/lib/telegramGuard";
import { getChats } from "@/lib/telegramBindingService";

// INCIDENT hotfix/client-auth-guard + P-EPICGRAM-CLIENT-PLATFORM-2.
// The browser-supplied `accountId` is ignored entirely. Chats are served only
// for the caller's owner-matched, ready binding; cross-tenant/forbidden -> 403.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/chats", "GET");
  if (!auth.ok) return auth.response;

  const r = await resolveBoundAccount(auth.principal);
  if (r.kind === "mismatch") return denyOwnerMismatch("/api/telegram/chats", "GET", auth.principal);
  if (r.kind !== "ok") return guardedJson({ ...safeEmptyState("no_binding"), chats: [] }, 200);

  const limit = Number(request.nextUrl.searchParams.get("limit")) || 30;
  const res = await getChats({ userId: auth.principal.userId, workspaceId: auth.principal.workspaceId, role: auth.principal.role }, limit);

  return guardedJson(
    {
      authenticated: true,
      connected: true,
      ownerMatched: true,
      activeAccountId: r.accountId,
      chats: res.ok ? res.chats : [],
      mutationsEnabled: false,
    },
    200
  );
}

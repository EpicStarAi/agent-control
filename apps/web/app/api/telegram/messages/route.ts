import { NextRequest } from "next/server";
import { requirePrincipal, resolveBoundAccount, safeEmptyState, guardedJson, denyOwnerMismatch } from "@/lib/telegramGuard";
import { getMessages } from "@/lib/telegramBindingService";

// INCIDENT hotfix/client-auth-guard + P-EPICGRAM-CLIENT-PLATFORM-2.
// accountId is ignored; chatId is read from the query but messages are served
// only for the caller's owner-matched, ready binding. Cross-tenant -> 403.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/messages", "GET");
  if (!auth.ok) return auth.response;

  const r = await resolveBoundAccount(auth.principal);
  if (r.kind === "mismatch") return denyOwnerMismatch("/api/telegram/messages", "GET", auth.principal);
  if (r.kind !== "ok") return guardedJson({ ...safeEmptyState("no_binding"), messages: [] }, 200);

  const chatId = request.nextUrl.searchParams.get("chatId") || "";
  const limit = Number(request.nextUrl.searchParams.get("limit")) || 50;
  if (!chatId) {
    return guardedJson({ ...safeEmptyState("no_binding"), ownerMatched: true, activeAccountId: r.accountId, messages: [], reason: "chat_id_required" }, 200);
  }

  const res = await getMessages({ userId: auth.principal.userId, workspaceId: auth.principal.workspaceId }, chatId, limit);

  return guardedJson(
    {
      authenticated: true,
      connected: true,
      ownerMatched: true,
      activeAccountId: r.accountId,
      chatId,
      messages: res.ok ? res.messages : [],
      mutationsEnabled: false,
    },
    200
  );
}

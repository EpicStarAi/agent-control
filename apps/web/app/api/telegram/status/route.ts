import { requirePrincipal, resolveBoundAccount, safeEmptyState, guardedJson, denyOwnerMismatch } from "@/lib/telegramGuard";
import { getStatus, getStagingRuntimeStatus } from "@/lib/telegramBindingService";

// INCIDENT hotfix/client-auth-guard + P-EPICGRAM-CLIENT-PLATFORM-2.
// Requires an authenticated EPICGRAM session; the account is resolved
// server-side from the caller's owner-matched binding only. No fallback/default
// account. A cross-tenant/forbidden binding is a hard 403, not a silent read.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requirePrincipal("/api/telegram/status", "GET");
  if (!auth.ok) return auth.response;

  const staging = await getStagingRuntimeStatus(auth.principal);
  if (staging) {
    return guardedJson({
      ...staging.body,
      authenticated: true,
      connected: staging.status >= 200 && staging.status < 300 && staging.body.connected !== false,
      ownerMatched: true,
    }, staging.status);
  }

  const r = await resolveBoundAccount(auth.principal);
  if (r.kind === "mismatch") return denyOwnerMismatch("/api/telegram/status", "GET", auth.principal);
  if (r.kind !== "ok") return guardedJson(safeEmptyState("no_binding"), 200);

  const res = await getStatus({ userId: auth.principal.userId, workspaceId: auth.principal.workspaceId, role: auth.principal.role });
  const binding = res.ok ? res.status.binding : null;

  return guardedJson(
    {
      authenticated: true,
      connected: true,
      runtime: "owner_bound",
      reason: "ready",
      activeAccountId: r.accountId,
      account: binding
        ? { username: binding.username, phoneMasked: binding.phoneMasked, displayName: binding.displayName }
        : null,
      accounts: [{ id: r.accountId, authState: "ready" }],
      ownerMatched: true,
      mutationsEnabled: false,
    },
    200
  );
}

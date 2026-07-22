import { NextRequest } from "next/server";
import { requirePrincipal, denyMutation, guardedJson, telegramMutationsEnabled } from "@/lib/telegramGuard";
import { mutateStagingRuntime } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/auth/reset", "POST");
  if (!auth.ok) return auth.response;
  if (!telegramMutationsEnabled() || auth.principal.role !== "owner") return denyMutation("/api/telegram/auth/reset", "POST", auth.principal, "auth_reset");
  const body = await request.json().catch(() => ({}));
  const accountId = String(body?.accountId ?? "").trim();
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(accountId)) return guardedJson({ ok: false, code: "ACCOUNT_ID_REQUIRED" }, 400);
  const result = await mutateStagingRuntime(auth.principal, "/telegram/auth/reset", { accountId, confirmAlias: accountId });
  if (!result) return denyMutation("/api/telegram/auth/reset", "POST", auth.principal, "staging_only");
  return guardedJson(result.body, result.status);
}

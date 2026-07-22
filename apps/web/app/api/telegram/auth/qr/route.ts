import { NextRequest } from "next/server";
import { requirePrincipal, denyMutation, guardedJson, telegramMutationsEnabled } from "@/lib/telegramGuard";
import { mutateStagingRuntime } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/auth/qr", "POST");
  if (!auth.ok) return auth.response;
  if (!telegramMutationsEnabled() || auth.principal.role !== "owner") return denyMutation("/api/telegram/auth/qr", "POST", auth.principal, "auth_qr");
  const body = await request.json().catch(() => ({}));
  const result = await mutateStagingRuntime(auth.principal, "/telegram/auth/qr", { accountId: body?.accountId });
  if (!result) return denyMutation("/api/telegram/auth/qr", "POST", auth.principal, "staging_only");
  return guardedJson(result.body, result.status);
}

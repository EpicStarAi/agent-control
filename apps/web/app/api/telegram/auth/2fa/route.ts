import { NextRequest } from "next/server";
import { requirePrincipal, denyMutation, guardedJson, telegramMutationsEnabled } from "@/lib/telegramGuard";
import { mutateStagingRuntime } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/auth/2fa", "POST");
  if (!auth.ok) return auth.response;
  if (!telegramMutationsEnabled() || auth.principal.role !== "owner") return denyMutation("/api/telegram/auth/2fa", "POST", auth.principal, "auth_2fa");
  const body = await request.json().catch(() => ({}));
  const password = String(body?.password ?? "");
  if (!password || password.length > 256) return guardedJson({ ok: false, message: "Введите пароль 2FA." }, 400);
  const result = await mutateStagingRuntime(auth.principal, "/telegram/auth/2fa", { accountId: body?.accountId, password });
  if (!result) return denyMutation("/api/telegram/auth/2fa", "POST", auth.principal, "staging_only");
  return guardedJson(result.body, result.status);
}

import { NextRequest } from "next/server";
import { requireLegacyOwnerSurface, denyMutation, guardedJson } from "@/lib/telegramGuard";
import { mutateStagingRuntime } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireLegacyOwnerSurface("/api/telegram/auth/2fa", "POST", "auth_2fa");
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const password = String(body?.password ?? "");
  if (!password || password.length > 256) return guardedJson({ ok: false, message: "Введите пароль 2FA." }, 400);
  const result = await mutateStagingRuntime(auth.principal, "/telegram/auth/2fa", { accountId: body?.accountId, password });
  if (!result) return denyMutation("/api/telegram/auth/2fa", "POST", auth.principal, "staging_only");
  return guardedJson(result.body, result.status);
}

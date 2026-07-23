import { NextRequest } from "next/server";
import { requireLegacyOwnerSurface, denyMutation, guardedJson } from "@/lib/telegramGuard";
import { mutateStagingRuntime } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireLegacyOwnerSurface("/api/telegram/auth/phone", "POST", "auth_phone");
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const phoneNumber = String(body?.phoneNumber ?? body?.phone ?? "").trim();
  if (!/^\+[1-9]\d{6,14}$/.test(phoneNumber)) return guardedJson({ ok: false, message: "Введите номер в международном формате." }, 400);
  const result = await mutateStagingRuntime(auth.principal, "/telegram/auth/phone", { accountId: body?.accountId, phoneNumber });
  if (!result) return denyMutation("/api/telegram/auth/phone", "POST", auth.principal, "staging_only");
  return guardedJson(result.body, result.status);
}

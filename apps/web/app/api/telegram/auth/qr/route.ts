import { NextRequest } from "next/server";
import { requireLegacyOwnerSurface, denyMutation, guardedJson } from "@/lib/telegramGuard";
import { mutateStagingRuntime } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireLegacyOwnerSurface("/api/telegram/auth/qr", "POST", "auth_qr");
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => ({}));
  const result = await mutateStagingRuntime(auth.principal, "/telegram/auth/qr", { accountId: body?.accountId });
  if (!result) return denyMutation("/api/telegram/auth/qr", "POST", auth.principal, "staging_only");
  return guardedJson(result.body, result.status);
}

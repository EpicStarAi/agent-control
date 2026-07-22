import { NextRequest } from "next/server";
import { requirePrincipal, denyMutation, guardedJson, telegramMutationsEnabled } from "@/lib/telegramGuard";
import { mutateStagingRuntime } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/auth/code", "POST");
  if (!auth.ok) return auth.response;
  if (!telegramMutationsEnabled() || auth.principal.role !== "owner") return denyMutation("/api/telegram/auth/code", "POST", auth.principal, "auth_code");
  const body = await request.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim();
  if (!/^\d{3,8}$/.test(code)) return guardedJson({ ok: false, message: "Код должен состоять из 3-8 цифр." }, 400);
  const result = await mutateStagingRuntime(auth.principal, "/telegram/auth/code", { accountId: body?.accountId, code });
  if (!result) return denyMutation("/api/telegram/auth/code", "POST", auth.principal, "staging_only");
  return guardedJson(result.body, result.status);
}

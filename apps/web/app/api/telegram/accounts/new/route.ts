import { requirePrincipal, denyMutation, guardedJson, telegramMutationsEnabled } from "@/lib/telegramGuard";
import { mutateStagingRuntime } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requirePrincipal("/api/telegram/accounts/new", "POST");
  if (!auth.ok) return auth.response;
  if (!telegramMutationsEnabled() || auth.principal.role !== "owner") {
    return denyMutation("/api/telegram/accounts/new", "POST", auth.principal, "account_create");
  }
  const result = await mutateStagingRuntime(auth.principal, "/telegram/accounts/new", { label: "EPICGRAM user slot" });
  if (!result) return denyMutation("/api/telegram/accounts/new", "POST", auth.principal, "staging_only");
  return guardedJson(result.body, result.status);
}

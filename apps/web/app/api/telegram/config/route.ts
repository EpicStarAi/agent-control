import { requirePrincipal, guardedJson } from "@/lib/telegramGuard";
import { getRuntimeFlags } from "@/lib/runtimeFlags";

// INCIDENT hotfix/client-auth-guard: authenticated session required. Reports
// only whether mutations are enabled — never config values or secrets.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePrincipal("/api/telegram/config", "GET");
  if (!auth.ok) return auth.response;
  const flags = getRuntimeFlags();
  return guardedJson({
    authenticated: true,
    connected: false,
    mutationsEnabled: flags.telegramMutation,
    flags,
  }, 200);
}

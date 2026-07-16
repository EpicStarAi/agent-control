import { requirePrincipal, guardedJson } from "@/lib/telegramGuard";

// INCIDENT hotfix/client-auth-guard: authenticated session required. Reports
// only whether mutations are enabled — never config values or secrets.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePrincipal("/api/telegram/config", "GET");
  if (!auth.ok) return auth.response;
  return guardedJson({ authenticated: true, mutationsEnabled: false, connected: false }, 200);
}

import { NextRequest } from "next/server";
import { getPrincipal, denyMutation } from "@/lib/telegramGuard";

// INCIDENT hotfix/client-auth-guard: this mutation route had no session check.
// Denied server-side by default; the request body is never forwarded and no
// client-supplied approval flag is honoured.
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const principal = await getPrincipal();
  return denyMutation("/api/telegram/auth/code", "POST", principal, "auth_code");
}

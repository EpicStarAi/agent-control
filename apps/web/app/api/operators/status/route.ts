import { NextResponse } from "next/server";
import { authorizedClients, getPrimaryAuthorizedClient } from "@/data/authorized-clients";
import { requirePrincipal } from "@/lib/telegramGuard";

// P0: this endpoint was anonymous AND returned the operator seed verbatim —
// including every authorized client's email address and display name. Anyone who
// knew the URL got a list of the people who can log in, which is exactly the
// input an attacker needs before a credential-stuffing or phishing attempt.
//
// Two changes: it now requires an authenticated principal, and personally
// identifying fields (email, displayName) are no longer returned at all. What
// remains is the operational fact the endpoint exists to report — whether the
// seed is configured and whether Telegram access is ready.
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePrincipal("/api/operators/status", "GET");
  if (!auth.ok) return auth.response;

  const primaryClient = getPrimaryAuthorizedClient();
  const passwordConfigured = Boolean(process.env.EPICGRAM_OPERATOR_PASSWORD_SCRYPT);

  return NextResponse.json(
    {
      runtime: "local_seed",
      passwordConfigured,
      primaryClient: primaryClient
        ? {
            id: primaryClient.id,
            role: primaryClient.role,
            status: primaryClient.status,
            telegramAccess: primaryClient.telegramAccess
          }
        : null,
      clients: authorizedClients.map((client) => ({
        id: client.id,
        role: client.role,
        status: client.status,
        telegramAccess: client.telegramAccess
      })),
      message: passwordConfigured
        ? "Operator seed is configured. Password verification can be enabled by the backend."
        : "Operator seed exists, but password hash is not configured in EPICGRAM_OPERATOR_PASSWORD_SCRYPT."
    },
    { headers: { "cache-control": "private, no-store, must-revalidate" } }
  );
}

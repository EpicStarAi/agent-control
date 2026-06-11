import { NextResponse } from "next/server";
import { authorizedClients, getPrimaryAuthorizedClient } from "@/data/authorized-clients";

export async function GET() {
  const primaryClient = getPrimaryAuthorizedClient();
  const passwordConfigured = Boolean(process.env.EPICGRAM_OPERATOR_PASSWORD_SCRYPT);

  return NextResponse.json({
    runtime: "local_seed",
    passwordConfigured,
    primaryClient,
    clients: authorizedClients.map((client) => ({
      id: client.id,
      email: client.email,
      displayName: client.displayName,
      role: client.role,
      status: client.status,
      telegramAccess: client.telegramAccess
    })),
    message: passwordConfigured
      ? "Operator seed is configured. Password verification can be enabled by the backend."
      : "Operator seed exists, but password hash is not configured in EPICGRAM_OPERATOR_PASSWORD_SCRYPT."
  });
}

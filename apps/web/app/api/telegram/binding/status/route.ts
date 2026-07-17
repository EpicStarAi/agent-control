// GET /api/telegram/binding/status
// Returns the binding status for the authenticated principal.
// accountId is NEVER taken from query/body — always from server-side binding.
import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { getStatus } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requirePrincipal("/api/telegram/binding/status", "GET");
  if (!auth.ok) return auth.response;

  const result = await getStatus({
    userId: auth.principal.userId,
    workspaceId: auth.principal.workspaceId,
  });

  if (!result.ok) {
    return NextResponse.json({ bound: false, reason: result.reason }, { status: 500 });
  }

  return NextResponse.json(result.status, {
    headers: {
      "cache-control": "private, no-store, must-revalidate",
      pragma: "no-cache",
    },
  });
}

// POST /api/telegram/binding/qr — start QR auth flow
// GET  /api/telegram/binding/qr — poll QR status (polling every 2s from client)
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { startQr, getStatus } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/qr", "POST");
  if (!auth.ok) return auth.response;

  const result = await startQr({
    userId: auth.principal.userId,
    workspaceId: auth.principal.workspaceId,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 409 });
  }

  return NextResponse.json({ ok: true, status: result.status }, {
    headers: {
      "cache-control": "private, no-store, must-revalidate",
      pragma: "no-cache",
    },
  });
}

export async function GET() {
  const auth = await requirePrincipal("/api/telegram/binding/qr", "GET");
  if (!auth.ok) return auth.response;

  const result = await getStatus({
    userId: auth.principal.userId,
    workspaceId: auth.principal.workspaceId,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: result.status }, {
    headers: {
      "cache-control": "private, no-store, must-revalidate",
      pragma: "no-cache",
    },
  });
}

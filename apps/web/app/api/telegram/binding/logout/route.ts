// POST /api/telegram/binding/logout — unbind and logout TDLib session
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { unbind } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/logout", "POST");
  if (!auth.ok) return auth.response;

  const result = await unbind({
    userId: auth.principal.userId,
    workspaceId: auth.principal.workspaceId,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: result.status, message: "Аккаунт отключён." }, {
    headers: {
      "cache-control": "private, no-store, must-revalidate",
      pragma: "no-cache",
    },
  });
}

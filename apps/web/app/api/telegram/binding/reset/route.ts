// POST /api/telegram/binding/reset — reset auth flow to init
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { resetFlow } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/reset", "POST");
  if (!auth.ok) return auth.response;

  const result = await resetFlow({
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

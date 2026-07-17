// POST /api/telegram/binding/code — submit verification code
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { submitCode } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/code", "POST");
  if (!auth.ok) return auth.response;

  let code = "";
  try {
    const body = await req.json();
    code = String(body?.code ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, reason: "Тело запроса невалидно." }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ ok: false, reason: "Введите код из Telegram." }, { status: 400 });
  }

  const result = await submitCode(
    { userId: auth.principal.userId, workspaceId: auth.principal.workspaceId },
    code
  );

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

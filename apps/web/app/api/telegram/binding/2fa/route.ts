// POST /api/telegram/binding/2fa — submit 2FA password
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { submit2fa } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/2fa", "POST");
  if (!auth.ok) return auth.response;

  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, reason: "Тело запроса невалидно." }, { status: 400 });
  }

  if (!password) {
    return NextResponse.json({ ok: false, reason: "Введите пароль 2FA." }, { status: 400 });
  }

  const result = await submit2fa(
    { userId: auth.principal.userId, workspaceId: auth.principal.workspaceId },
    password
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

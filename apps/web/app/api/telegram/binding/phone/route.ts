// POST /api/telegram/binding/phone — submit phone number to start auth
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { submitPhone } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/phone", "POST");
  if (!auth.ok) return auth.response;

  let phone = "";
  try {
    const body = await req.json();
    phone = String(body?.phone ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false, reason: "Тело запроса невалидно.", code: "BAD_REQUEST" }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ ok: false, reason: "Введите номер телефона.", code: "PHONE_REQUIRED" }, { status: 400 });
  }

  const result = await submitPhone(
    { userId: auth.principal.userId, workspaceId: auth.principal.workspaceId },
    phone
  );

  if (!result.ok) {
    const status = result.code === "INVALID_PHONE" ? 400 : 409;
    return NextResponse.json({ ok: false, reason: result.reason }, { status });
  }

  return NextResponse.json({ ok: true, status: result.status }, {
    headers: {
      "cache-control": "private, no-store, must-revalidate",
      pragma: "no-cache",
    },
  });
}

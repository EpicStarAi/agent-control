import { NextRequest, NextResponse } from "next/server";
import type { TelegramPhoneAuthRequest, TelegramPhoneAuthResponse } from "../../../../../../../packages/telegram/src/types";

function maskPhone(phoneNumber: string) {
  const clean = phoneNumber.replace(/[^\d+]/g, "");
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 4)}***${clean.slice(-2)}`;
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as Partial<TelegramPhoneAuthRequest>;

  if (!payload.phoneNumber) {
    return NextResponse.json({ message: "phoneNumber is required" }, { status: 400 });
  }

  const body: TelegramPhoneAuthResponse = {
    method: "phone",
    runtime: "not_configured",
    phoneMasked: maskPhone(payload.phoneNumber),
    message: "Phone authorization requires a TDLib backend. The code must be handled by the authorized login flow, not stored in the browser."
  };

  return NextResponse.json(body, { status: 501 });
}

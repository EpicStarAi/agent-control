import { NextResponse } from "next/server";
import type { TelegramQrAuthResponse } from "../../../../../../../packages/telegram/src/types";

export async function POST() {
  const body: TelegramQrAuthResponse = {
    method: "qr",
    runtime: "not_configured",
    message: "QR authorization requires a TDLib backend. The frontend will not create or store Telegram sessions."
  };

  return NextResponse.json(body, { status: 501 });
}

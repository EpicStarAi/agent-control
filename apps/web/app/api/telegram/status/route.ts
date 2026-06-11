import { NextResponse } from "next/server";
import type { TelegramAuthStatusResponse } from "../../../../../../packages/telegram/src/types";

export async function GET() {
  const body: TelegramAuthStatusResponse = {
    runtime: "not_configured",
    accounts: [],
    message: "TDLib backend is not connected yet. No Telegram sessions are stored."
  };

  return NextResponse.json(body);
}

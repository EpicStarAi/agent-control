import { NextRequest } from "next/server";
import { proxyTelegramRequest } from "../_proxy";

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chatId") ?? "";
  return proxyTelegramRequest(`/telegram/messages?chatId=${encodeURIComponent(chatId)}`);
}

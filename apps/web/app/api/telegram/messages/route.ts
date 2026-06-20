import { NextRequest } from "next/server";
import { proxyTelegramRequest } from "../_proxy";

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chatId") ?? "";
  const accountId = request.nextUrl.searchParams.get("accountId");
  const params = new URLSearchParams({ chatId });
  if (accountId) params.set("accountId", accountId);
  return proxyTelegramRequest(`/telegram/messages?${params.toString()}`);
}

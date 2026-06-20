import { NextRequest } from "next/server";
import { proxyTelegramRequest } from "../_proxy";

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
  return proxyTelegramRequest(`/telegram/chats${query}`);
}

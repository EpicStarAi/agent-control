import { NextRequest } from "next/server";
import { proxyTelegramRequest } from "../../_proxy";

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyTelegramRequest("/telegram/accounts/remove", { method: "POST", body });
}

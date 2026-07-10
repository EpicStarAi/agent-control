import { NextRequest } from "next/server";
import { proxyTelegramRequest } from "../../_proxy";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  return proxyTelegramRequest("/telegram/accounts/select", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

import { NextRequest } from "next/server";
import { proxyTelegramRequest } from "../../_proxy";

// Submit Telegram 2FA (cloud) password. The password is forwarded to the
// backend TDLib runtime only; it is never stored or logged client-side.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyTelegramRequest("/telegram/auth/2fa", { method: "POST", body });
}

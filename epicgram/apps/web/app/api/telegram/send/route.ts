import { NextRequest } from "next/server";
import { proxyTelegramRequest } from "../_proxy";

// Operator-gated outbound send. The backend rejects this unless the request
// carries an explicit operator approval flag, so the AI layer can never send
// on its own.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyTelegramRequest("/telegram/send", { method: "POST", body });
}

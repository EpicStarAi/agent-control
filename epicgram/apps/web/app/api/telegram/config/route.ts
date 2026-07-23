import { proxyTelegramRequest } from "../_proxy";

export async function GET() {
  return proxyTelegramRequest("/telegram/config");
}

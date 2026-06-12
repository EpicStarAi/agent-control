import { proxyTelegramRequest } from "../../_proxy";

export async function POST() {
  return proxyTelegramRequest("/telegram/auth/reset", { method: "POST" });
}

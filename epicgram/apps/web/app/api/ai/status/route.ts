import { proxyAiRequest } from "../_proxy";

export async function GET() {
  return proxyAiRequest("/ai/status");
}

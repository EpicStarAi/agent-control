import { NextRequest } from "next/server";
import { proxyAiRequest } from "../_proxy";

// Telegram Agent v2 — structured chat analysis + memory update.
// Proxies to backend POST /ai/analyze (analyzeChat). Draft/suggestion only,
// never sends to Telegram. AI layer only.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const started = Date.now();
  const body = await request.text();
  const res = await proxyAiRequest("/ai/analyze", { method: "POST", body });
  console.log(`[AI ANALYZE] status=${res.status} ok=${res.ok} latency_ms=${Date.now() - started}`);
  return res;
}

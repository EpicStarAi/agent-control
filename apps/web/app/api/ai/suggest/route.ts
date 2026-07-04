import { NextRequest } from "next/server";
import { proxyAiRequest } from "../_proxy";

// AI draft suggestion → REAL LLM runtime (backend POST /ai/suggest →
// generateDraftReply). Draft only; never sends to Telegram. Logs provider
// latency + outcome; the honest provider error (e.g. "AI отключён…") is passed
// straight through so the UI shows a real error, not a fake reply.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const started = Date.now();
  const body = await request.text();
  const res = await proxyAiRequest("/ai/suggest", { method: "POST", body });
  console.log(
    `[AI REQUEST] ai/suggest provider=backend status=${res.status} ok=${res.ok} latency_ms=${Date.now() - started}`
  );
  return res;
}

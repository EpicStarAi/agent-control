import { NextRequest } from "next/server";
import { proxyAiRequest } from "../_proxy";

// Telegram Agent v2 — read structured per-chat memory (read-only).
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search || "";
  return proxyAiRequest(`/ai/chat-memory${search}`);
}

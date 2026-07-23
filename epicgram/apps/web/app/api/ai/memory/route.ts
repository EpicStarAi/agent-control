import { NextRequest } from "next/server";
import { proxyAiRequest } from "../_proxy";

export async function GET(request: NextRequest) {
  const conversationId = request.nextUrl.searchParams.get("conversationId") ?? "";
  const limit = request.nextUrl.searchParams.get("limit") ?? "20";
  return proxyAiRequest(
    `/ai/memory?conversationId=${encodeURIComponent(conversationId)}&limit=${encodeURIComponent(limit)}`
  );
}

import { NextRequest } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { proxyAiRequest } from "../_proxy";

// P0: conversation memory was readable anonymously by conversationId. Gated.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requirePrincipal("/api/ai/memory", "GET");
  if (!auth.ok) return auth.response;

  const conversationId = request.nextUrl.searchParams.get("conversationId") ?? "";
  const limit = request.nextUrl.searchParams.get("limit") ?? "20";
  return proxyAiRequest(
    `/ai/memory?conversationId=${encodeURIComponent(conversationId)}&limit=${encodeURIComponent(limit)}`
  );
}

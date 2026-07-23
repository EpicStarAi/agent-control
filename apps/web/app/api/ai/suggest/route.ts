import { NextRequest } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { proxyAiRequest } from "../_proxy";

// P0: this proxied straight through to the backend LLM with no session check —
// an anonymous caller could spend the operator's provider budget and read back
// whatever the backend returned. Authenticated principals only.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requirePrincipal("/api/ai/suggest", "POST");
  if (!auth.ok) return auth.response;

  const body = await request.text();
  return proxyAiRequest("/ai/suggest", { method: "POST", body });
}

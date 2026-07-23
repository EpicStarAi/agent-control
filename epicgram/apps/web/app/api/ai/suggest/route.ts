import { NextRequest } from "next/server";
import { proxyAiRequest } from "../_proxy";

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyAiRequest("/ai/suggest", { method: "POST", body });
}

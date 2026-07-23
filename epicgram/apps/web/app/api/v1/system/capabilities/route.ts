import { NextResponse } from "next/server";

// P19.3: proxy for the Capability API. Forwards to backend /v1/system/capabilities.
export const dynamic = "force-dynamic";
const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/system/capabilities`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      { runtime: "backend_offline", message: `EPICGRAM backend is not reachable at ${API_BASE_URL}.` },
      { status: 503 }
    );
  }
}

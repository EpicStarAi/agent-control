import { NextRequest } from "next/server";

// PHASE P1: binary proxy for the read-only QR PNG endpoint (backend PHASE N.1).
// no-store because Telegram QR login tokens rotate and must not be cached.
const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export async function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("accountId");
  const params = new URLSearchParams();
  if (accountId) params.set("accountId", accountId);
  const query = params.toString();
  try {
    const response = await fetch(
      `${API_BASE_URL}/telegram/auth/qr-image${query ? `?${query}` : ""}`,
      { cache: "no-store" }
    );
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/octet-stream",
        "cache-control": "no-store"
      }
    });
  } catch {
    return new Response(
      JSON.stringify({ message: `EPICGRAM backend is not reachable at ${API_BASE_URL}. Start it with npm run api:dev.` }),
      { status: 503, headers: { "content-type": "application/json", "cache-control": "no-store" } }
    );
  }
}

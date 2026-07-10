import { NextResponse } from "next/server";

// P17.2/P17.4: versioned read-only proxy for the account API. Forwards
// /api/v1/telegram/account/<slice> to the backend /v1/telegram/account/<slice>,
// preserving the query string (accountId). GET-only; never mutates.
const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export async function GET(request: Request, { params }: { params: { path?: string[] } }) {
  const slice = (params.path ?? []).join("/");
  const search = new URL(request.url).search;
  try {
    const response = await fetch(`${API_BASE_URL}/v1/telegram/account/${slice}${search}`, {
      headers: { "content-type": "application/json" },
      cache: "no-store"
    });
    const body = await response.json().catch(() => ({ message: "Backend returned a non-JSON response." }));
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      {
        runtime: "backend_offline",
        message: `EPICGRAM backend is not reachable at ${API_BASE_URL}. Start it with npm run api:dev.`
      },
      { status: 503 }
    );
  }
}

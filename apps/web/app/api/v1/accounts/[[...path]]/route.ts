import { NextResponse } from "next/server";

// P19.3: proxy for the Identity/Accounts facade. Forwards
// /api/v1/accounts[/...] to the backend /v1/accounts[/...], preserving method,
// query and body. GET (list/current) + POST (switch/logout/lock/unlock).
export const dynamic = "force-dynamic";
const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

async function forward(request: Request, params: { path?: string[] }) {
  const sub = (params.path ?? []).join("/");
  const search = new URL(request.url).search;
  const target = `${API_BASE_URL}/v1/accounts${sub ? "/" + sub : ""}${search}`;
  const init: RequestInit = { method: request.method, cache: "no-store", headers: { "content-type": "application/json" } };
  if (request.method === "POST") {
    const body = await request.text().catch(() => "");
    if (body) init.body = body;
  }
  try {
    const response = await fetch(target, init);
    const body = await response.json().catch(() => ({ message: "Backend returned a non-JSON response." }));
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json(
      { runtime: "backend_offline", message: `EPICGRAM backend is not reachable at ${API_BASE_URL}. Start it with npm run api:dev.` },
      { status: 503 }
    );
  }
}

export async function GET(request: Request, { params }: { params: { path?: string[] } }) {
  return forward(request, params);
}
export async function POST(request: Request, { params }: { params: { path?: string[] } }) {
  return forward(request, params);
}

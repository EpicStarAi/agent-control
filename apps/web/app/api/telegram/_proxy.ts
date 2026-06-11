import { NextResponse } from "next/server";

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export async function proxyTelegramRequest(path: string, init?: RequestInit) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {})
      },
      cache: "no-store"
    });
    const body = await response.json().catch(() => ({
      message: "Backend returned a non-JSON response."
    }));
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

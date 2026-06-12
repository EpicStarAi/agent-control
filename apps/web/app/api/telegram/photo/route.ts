import { NextRequest } from "next/server";

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId") ?? "";
  const response = await fetch(`${API_BASE_URL}/telegram/photo?fileId=${encodeURIComponent(fileId)}`, {
    cache: "no-store"
  });
  const body = await response.arrayBuffer();

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": response.status === 200 ? "public, max-age=86400" : "no-store"
    }
  });
}

import { NextRequest } from "next/server";
import { backendRequestHeaders } from "@/lib/backendRequest";
import { getPrincipal, PRIVATE_NO_STORE, recordDenial, resolveBoundAccountId } from "@/lib/telegramGuard";

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const principal = await getPrincipal();
  if (!principal) {
    recordDenial({ reason: "unauthenticated", route: "/api/telegram/media", method: "GET" });
    return new Response(null, { status: 401, headers: PRIVATE_NO_STORE });
  }
  const accountId = await resolveBoundAccountId(principal);
  if (!accountId) return new Response(null, { status: 404, headers: PRIVATE_NO_STORE });

  const fileId = String(request.nextUrl.searchParams.get("fileId") || "").trim();
  if (!/^\d+$/.test(fileId)) return new Response(null, { status: 400, headers: PRIVATE_NO_STORE });

  const upstreamUrl = new URL("/telegram/photo", API_BASE_URL);
  upstreamUrl.searchParams.set("accountId", accountId);
  upstreamUrl.searchParams.set("fileId", fileId);
  try {
    const upstream = await fetch(upstreamUrl, { headers: backendRequestHeaders(), cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!upstream.ok) return new Response(null, { status: upstream.status === 404 || upstream.status === 409 ? 404 : 502, headers: PRIVATE_NO_STORE });
    const headers = new Headers(PRIVATE_NO_STORE);
    headers.set("content-type", upstream.headers.get("content-type") || "application/octet-stream");
    const length = upstream.headers.get("content-length");
    if (length) headers.set("content-length", length);
    if (request.nextUrl.searchParams.get("download") === "1") headers.set("content-disposition", `attachment; filename="telegram-${fileId}"`);
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return new Response(null, { status: 502, headers: PRIVATE_NO_STORE });
  }
}

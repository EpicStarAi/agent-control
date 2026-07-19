import { NextRequest } from "next/server";
import { getPrincipal, resolveBoundAccountId, PRIVATE_NO_STORE, recordDenial } from "@/lib/telegramGuard";

// Account-aware avatar/media proxy. Requires an authenticated session and serves
// files ONLY from the caller's owner-matched slot. The browser-supplied accountId
// is ignored — the slot is resolved server-side. The backend routes a registered
// slot to its own TDLib client, so there is NO fallback to the legacy/NOVIKOVA
// runtime. Responses are private and never publicly cacheable.
const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const principal = await getPrincipal();
  if (!principal) {
    recordDenial({ reason: "unauthenticated", route: "/api/telegram/photo", method: "GET" });
    return new Response(null, { status: 401, headers: PRIVATE_NO_STORE });
  }

  const accountId = await resolveBoundAccountId(principal);
  if (!accountId) {
    recordDenial({ reason: "no_binding", route: "/api/telegram/photo", method: "GET", principal });
    return new Response(null, { status: 404, headers: PRIVATE_NO_STORE });
  }

  const fileId = (request.nextUrl.searchParams.get("fileId") || "").trim();
  const thumb = request.nextUrl.searchParams.get("thumb") === "1";
  if (!/^\d+$/.test(fileId)) {
    return new Response(null, { status: 400, headers: PRIVATE_NO_STORE });
  }

  const path = `/telegram/file/${encodeURIComponent(accountId)}/${encodeURIComponent(fileId)}${thumb ? "/thumb" : ""}`;
  try {
    const upstream = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!upstream.ok) {
      return new Response(null, { status: upstream.status === 404 || upstream.status === 409 ? 404 : 502, headers: PRIVATE_NO_STORE });
    }
    const buf = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    return new Response(buf, { status: 200, headers: { ...PRIVATE_NO_STORE, "content-type": contentType } });
  } catch {
    return new Response(null, { status: 502, headers: PRIVATE_NO_STORE });
  }
}

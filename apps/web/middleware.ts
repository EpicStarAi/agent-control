import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// INCIDENT hotfix/client-auth-guard.
//
// The repository previously had NO middleware at all, so nothing gated /client.
// This middleware is a defence-in-depth layer with two jobs:
//
//   1. Redirect obviously-unauthenticated visitors away from /client before the
//      page renders (cheap, avoids shipping the shell).
//   2. Guarantee that no /client or /api/telegram/* response is ever stored by
//      a browser, shared proxy or CDN.
//
// It deliberately does NOT authenticate: it only checks for cookie PRESENCE,
// because validating a session token here would duplicate auth logic at the
// edge. A forged/expired cookie passes this layer and is then rejected by the
// route handler, which is the authoritative gate. Never move enforcement here
// and remove it from the handlers — middleware does not run for every runtime
// path, and an API left open behind a page redirect only looks fixed.

const SESSION_COOKIE = "epic_session";
const PUBLIC_REDIRECT_HOSTS = new Set(["epic-gram.com", "www.epic-gram.com"]);

function normalizePublicHost(value: string | null): string | null {
  const first = value?.split(",")[0]?.trim().toLowerCase();
  if (!first) return null;

  const host = first.startsWith("[") ? first : first.split(":")[0];
  return PUBLIC_REDIRECT_HOSTS.has(host) ? host : null;
}

function clonePublicRedirectUrl(request: NextRequest) {
  const url = request.nextUrl.clone();
  const publicHost =
    normalizePublicHost(request.headers.get("x-forwarded-host")) ??
    normalizePublicHost(request.headers.get("host"));

  if (publicHost) {
    url.protocol = "https:";
    url.host = publicHost;
    url.port = "";
  }

  return url;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const protectedPage =
    pathname === "/client" ||
    pathname.startsWith("/client/") ||
    pathname === "/telegram-code" ||
    pathname === "/settings" ||
    pathname === "/epic-crm" ||
    pathname === "/operator-office";

  if (protectedPage) {
    if (!hasSession) {
      const url = clonePublicRedirectUrl(request);
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      const redirect = NextResponse.redirect(url);
      redirect.headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
      return redirect;
    }
  }

  const response = NextResponse.next();
  response.headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("pragma", "no-cache");
  return response;
}

export const config = {
  matcher: [
    "/client/:path*",
    "/telegram-code",
    "/settings",
    "/epic-crm",
    "/operator-office",
    "/api/telegram/:path*",
    "/api/v1/telegram/:path*",
    "/api/operator-events",
    "/api/operator-events/:path*",
    // The entire operator bridge — the verbatim catch-all proxy plus every
    // dedicated route (command/confirm/schedule/qclaw) — must sit behind the
    // gate. Enforcement is still duplicated inside each handler (defence in
    // depth); this only guarantees the surface is covered at the edge too.
    "/api/operator/:path*",
    // P0: /api/ai/* proxied to the backend LLM anonymously and
    // /api/operators/status published the operator roster. Both are gated in
    // their handlers now; covering them here too keeps the edge and the
    // handlers in agreement about what the protected surface is.
    "/api/ai/:path*",
    "/api/operators/:path*"
  ]
};

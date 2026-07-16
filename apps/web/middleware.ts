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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/client" || pathname.startsWith("/client/")) {
    if (!hasSession) {
      const url = request.nextUrl.clone();
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
  matcher: ["/client/:path*", "/api/telegram/:path*", "/api/v1/telegram/:path*"]
};

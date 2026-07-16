import { NextRequest } from "next/server";
import { getPrincipal, resolveBoundAccountId, PRIVATE_NO_STORE, recordDenial } from "@/lib/telegramGuard";

// INCIDENT hotfix/client-auth-guard: this route proxied Telegram media to any
// anonymous caller keyed by a browser-supplied fileId/accountId, and marked
// successful responses `public, max-age=86400` — i.e. private avatars were
// cacheable by shared proxies for a day. Now: authenticated session required,
// no media served without an owner-matched binding, never publicly cacheable.
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
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

  return new Response(null, { status: 404, headers: PRIVATE_NO_STORE });
}

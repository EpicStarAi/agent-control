import { NextRequest } from "next/server";
import { getPrincipal, PRIVATE_NO_STORE, recordDenial } from "@/lib/telegramGuard";

// INCIDENT hotfix/client-auth-guard: a QR login image is a live credential —
// scanning it binds a Telegram account. It was served to anonymous callers.
// Denied while TDLib auth flows are disabled during containment.
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const principal = await getPrincipal();
  recordDenial({ reason: "auth_qr_image_disabled", route: "/api/telegram/auth/qr-image", method: "GET", principal });
  return new Response(null, { status: 403, headers: PRIVATE_NO_STORE });
}

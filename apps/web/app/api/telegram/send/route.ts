import { NextRequest } from "next/server";
import { getPrincipal, denyMutation, telegramMutationsEnabled, guardedJson } from "@/lib/telegramGuard";

// INCIDENT hotfix/client-auth-guard.
//
// This route used to forward the request body verbatim to the backend, and the
// backend's "approval gate" read `operatorApproved` FROM THAT BODY. The flag is
// caller-supplied, so the gate authorised anyone who set it — an anonymous
// visitor could send real Telegram messages from the live account.
//
// The request body is now never inspected for approval, and is never forwarded.
// Sending is denied server-side, unconditionally, while TELEGRAM_MUTATION is
// false (the default). Approval will be re-introduced as a server-issued,
// payload-hash-bound record — never as a boolean from the browser.
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const principal = await getPrincipal();

  // Unauthenticated callers are denied before anything else is considered.
  if (!principal) {
    return denyMutation("/api/telegram/send", "POST", null, "send_unauthenticated");
  }

  // Authenticated callers are still denied: no approval can originate from the
  // client, and mutations are globally disabled.
  if (!telegramMutationsEnabled()) {
    return denyMutation("/api/telegram/send", "POST", principal, "send_disabled");
  }

  // Reachable only if an operator explicitly sets TELEGRAM_MUTATION=true. Even
  // then there is no owner-matched binding yet, so nothing may be sent.
  return guardedJson(
    {
      sent: false,
      executed: false,
      message: "Отправка недоступна: нет owner-matched привязки аккаунта."
    },
    403
  );
}

import { redirect } from "next/navigation";
import { TgClient } from "@/components/tg/TgClient";
import { getPrincipal } from "@/lib/telegramGuard";

// EPICGRAM Web Client — Telegram-like messenger surface.
//
// The post-login landing renders the familiar two-pane Telegram interface
// (TgClient) instead of the operator "cabinet". Data is real-only, served
// through the /api/telegram/* routes: the server resolves the owner-bound slot,
// enforces the owner match and the send approval gate. The browser never talks
// to Telegram directly and cannot bypass the gate.
//
// INCIDENT hotfix/client-auth-guard: this page is a server-side gate — the
// session is checked before any client markup is rendered, so unauthenticated
// visitors never receive the application. This is defence in depth; the
// authoritative enforcement lives in each /api/telegram/* route handler.
export const dynamic = "force-dynamic";

export default async function ClientPage() {
  const principal = await getPrincipal();
  if (!principal) redirect("/login?next=/client");

  return <TgClient />;
}

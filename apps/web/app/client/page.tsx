import { redirect } from "next/navigation";
import { EpicGramShell } from "@/components/EpicGramShell";
import { getPrincipal } from "@/lib/telegramGuard";

// EPIC GRAM Web Client (перенесён с корня в /client).
//
// INCIDENT hotfix/client-auth-guard: this page rendered the full client to any
// anonymous visitor. It is now a server-side gate — the session is checked
// before the shell is rendered, so unauthenticated visitors never receive the
// application markup.
//
// This page gate is defence in depth only. The authoritative enforcement lives
// in each /api/telegram/* route handler, because a page-level gate alone would
// leave `curl /api/telegram/chats` fully open.
export const dynamic = "force-dynamic";

export default async function ClientPage() {
  const principal = await getPrincipal();
  if (!principal) redirect("/login?next=/client");

  return <EpicGramShell section="dashboard" />;
}

import { redirect } from "next/navigation";
import { EpicGramShell } from "@/components/EpicGramShell";
import { getPrincipal } from "@/lib/telegramGuard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const principal = await getPrincipal();
  if (!principal) redirect("/login?next=/settings");

  return <EpicGramShell section="settings" />;
}

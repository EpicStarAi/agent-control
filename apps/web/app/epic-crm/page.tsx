import { redirect } from "next/navigation";
import { EpicCrmLedger } from "@/components/EpicCrmLedger";
import { getPrincipal } from "@/lib/telegramGuard";

export const dynamic = "force-dynamic";

export default async function EpicCrmPage() {
  const principal = await getPrincipal();
  if (!principal) redirect("/login?next=/epic-crm");
  return <EpicCrmLedger />;
}

import { redirect } from "next/navigation";
import OperatorOffice from "@/components/OperatorOffice";
import { getPrincipal } from "@/lib/telegramGuard";

export const dynamic = "force-dynamic";

export default async function OperatorOfficePage() {
  const principal = await getPrincipal();
  if (!principal) redirect("/login?next=/operator-office");

  return <OperatorOffice />;
}

import { redirect } from "next/navigation";
import { TelegramCodeEntry } from "@/components/TelegramCodeEntry";
import { getPrincipal } from "@/lib/telegramGuard";

export const dynamic = "force-dynamic";

export default async function TelegramCodePage() {
  const principal = await getPrincipal();
  if (!principal) redirect("/login?next=/telegram-code");
  return <TelegramCodeEntry />;
}

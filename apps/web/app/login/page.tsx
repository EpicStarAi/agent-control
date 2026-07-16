import SimpleTelegramLogin from "../../components/SimpleTelegramLogin";
import { TelegramBrowserSessionBinder } from "../../components/TelegramBrowserSessionBinder";

export const metadata = { title: "EPIC GRAM — Telegram Login" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <>
      <TelegramBrowserSessionBinder />
      <SimpleTelegramLogin />
    </>
  );
}

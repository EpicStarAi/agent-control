import { useEffect } from "react";
import PlatformStub from "./PlatformStub";
import { initTelegram, isInTelegram } from "@/lib/telegram";

// Telegram Mini App entrypoint. Outside Telegram it's a harmless no-op —
// the same read-only Web Client just renders normally.
export default function Tma() {
  useEffect(() => {
    initTelegram();
  }, []);

  return (
    <PlatformStub
      title="EPIC GRAM — Telegram Mini App"
      body={
        isInTelegram()
          ? "Запущено внутри Telegram. Открывается read-only Web Client с тем же Approval Gate."
          : "Эта страница открывается как Telegram Mini App изнутри Telegram. Сейчас вы просматриваете её в обычном браузере — функциональность идентична Web Client."
      }
      note="Отправка сообщений — только вручную, через Approval Gate. Автоотправка запрещена."
    />
  );
}

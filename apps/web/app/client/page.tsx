import { EpicGramShell } from "@/components/EpicGramShell";
import { FloatingOperatorWindow } from "@/components/FloatingOperatorWindow";

// EPIC GRAM Web Client: реальный Telegram/TDLib остаётся рабочим пространством,
// а AI Operator работает как независимое плавающее окно поверх клиента.
export default function ClientPage() {
  return (
    <>
      <EpicGramShell section="dashboard" />
      <FloatingOperatorWindow />
    </>
  );
}

import { EpicGramShell } from "@/components/EpicGramShell";
import { FloatingOperatorClient } from "@/components/FloatingOperatorClient";
import { OperatorOnboardingGuard } from "@/components/OperatorOnboardingGuard";

// EPIC GRAM Web Client: реальный Telegram/TDLib остаётся рабочим пространством,
// а AI Operator работает как независимое плавающее окно поверх клиента.
export default function ClientPage() {
  return (
    <>
      <OperatorOnboardingGuard />
      <EpicGramShell section="dashboard" />
      <FloatingOperatorClient />
    </>
  );
}

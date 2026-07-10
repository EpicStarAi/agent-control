import { useEffect, useState } from "react";
import { TelegramWorkspace } from "@/components/TelegramWorkspace";
import { GlobalAIOperatorSidebar } from "@/components/GlobalAIOperatorSidebar";

// /client — EPIC GRAM Web Client. Hosts the real, read-only TelegramWorkspace
// component (ported verbatim from epicgram/apps/web/components/TelegramWorkspace.tsx)
// plus the Global AI Operator sidebar for advisory-only assistance. No TDLib/auth/send
// logic lives here — it only renders data proxied from the existing backend.
const EMPTY_CTX = { agents: [], missions: [], exec: [], devices: [], slots: [], bind: {}, counts: {}, activeId: "" };

export default function ClientPage() {
  const [command, setCommand] = useState<any>(null);

  // GlobalAIOperatorSidebar dispatches "deepinside:operator-command" CustomEvents
  // to forward UI-navigation intents; TelegramWorkspace consumes them via the
  // `command` prop and reports back with "deepinside:operator-result".
  useEffect(() => {
    const onCommand = (e: Event) => setCommand((e as CustomEvent).detail ?? null);
    window.addEventListener("deepinside:operator-command", onCommand);
    return () => window.removeEventListener("deepinside:operator-command", onCommand);
  }, []);

  return (
    <div className="tg-root min-h-screen bg-tg-bg text-tg-text">
      <TelegramWorkspace ctx={EMPTY_CTX} command={command} onClose={() => {}} />
      <GlobalAIOperatorSidebar />
    </div>
  );
}

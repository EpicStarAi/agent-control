import { AgentRegistry } from "@/components/AgentRegistry";
import { ConsoleAuthGate } from "@/components/ConsoleAuthGate";

export default function AgentsPage() {
  return (
    <ConsoleAuthGate>
      <AgentRegistry />
    </ConsoleAuthGate>
  );
}

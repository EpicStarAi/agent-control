import { AgentSetupWizard } from "@/components/AgentSetupWizard";

export default function SetupPage({ params }: { params: { id: string } }) {
  return <AgentSetupWizard agentId={params.id} />;
}

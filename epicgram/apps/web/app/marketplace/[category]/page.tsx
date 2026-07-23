import { AgentMarketplace } from "@/components/AgentMarketplace";

export default function CategoryPage({ params }: { params: { category: string } }) {
  return <AgentMarketplace category={params.category} />;
}

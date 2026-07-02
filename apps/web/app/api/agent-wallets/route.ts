import { NextResponse } from "next/server";
import { listAgents, upsertAgent } from "@/lib/walletData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import type { AgentWallet } from "@/lib/wallet";

// P28 — agent wallets with daily limits. Autonomous AI spend is bounded by dailyLimit and
// still audited; no real execution here. Updating a limit is logged.
export const dynamic = "force-dynamic";

export async function GET() {
  const { agents, source } = await listAgents();
  return NextResponse.json({ agents, source });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<AgentWallet>;
  const result = await upsertAgent(body ?? {});
  if (result.ok && result.item) {
    const it = result.item;
    broadcast("audit.logged", { event: "agent.wallet.limit.updated", id: it.id, dailyLimit: it.dailyLimit });
    await appendOperatorEvent({ missionId: null, sourceOperator: "Operator", eventType: "logged",
      message: `Agent wallet «${it.id}»: лимит ${it.dailyLimit} ${it.currency}/сутки · ${it.enabled ? "включён" : "выключен"}`,
      riskLevel: "none", approvalState: "not_required" }).catch(() => {});
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

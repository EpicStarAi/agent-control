import { NextResponse } from "next/server";
import { approveApproval } from "@/lib/approvalsData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";

// P26.1 — MANUAL approve. Marks the proposed action approved. Does NOT execute
// anything external (execution stub is P26.5). Writes an audit event + broadcasts.
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const by = typeof body?.by === "string" ? body.by : "operator";
  const result = await approveApproval(params.id, by);
  if (result.ok && result.item) {
    const it = result.item;
    const rl = it.riskLevel === "critical" ? "high" : it.riskLevel;
    broadcast("approval.approved", it);
    await appendOperatorEvent({
      missionId: null, sourceOperator: "Operator", eventType: "status_changed",
      message: `Заявка одобрена: «${it.title}» (одобрил: ${it.approvedBy}). Внешнее действие НЕ выполнено — симуляция.`,
      riskLevel: rl, approvalState: "approved",
    }).catch(() => {});
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

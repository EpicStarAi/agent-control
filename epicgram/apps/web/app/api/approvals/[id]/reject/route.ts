import { NextResponse } from "next/server";
import { rejectApproval } from "@/lib/approvalsData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";

// P26.1 — MANUAL reject. Marks the proposed action rejected. No execution.
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const by = typeof body?.by === "string" ? body.by : "operator";
  const result = await rejectApproval(params.id, by);
  if (result.ok && result.item) {
    const it = result.item;
    const rl = it.riskLevel === "critical" ? "high" : it.riskLevel;
    broadcast("approval.rejected", it);
    await appendOperatorEvent({
      missionId: null, sourceOperator: "Operator", eventType: "status_changed",
      message: `Заявка отклонена: «${it.title}». Действие не будет выполнено.`,
      riskLevel: rl, approvalState: "rejected",
    }).catch(() => {});
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

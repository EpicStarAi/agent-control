import { NextResponse } from "next/server";
import { cancelApproval } from "@/lib/approvalsData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";

// P26.1 — MANUAL cancel. Withdraws a waiting/approved proposal. No execution.
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const by = typeof body?.by === "string" ? body.by : "operator";
  const result = await cancelApproval(params.id, by);
  if (result.ok && result.item) {
    const it = result.item;
    const rl = it.riskLevel === "critical" ? "high" : it.riskLevel;
    broadcast("approval.cancelled", it);
    await appendOperatorEvent({
      missionId: null, sourceOperator: "Operator", eventType: "status_changed",
      message: `Заявка отменена: «${it.title}».`,
      riskLevel: rl, approvalState: "not_required",
    }).catch(() => {});
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

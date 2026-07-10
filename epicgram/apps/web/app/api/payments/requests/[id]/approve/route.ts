import { NextResponse } from "next/server";
import { approvePayment } from "@/lib/walletData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";

// P28 — MANUAL approve of a payment request. Marks approved. Does NOT execute the payment
// (executionResult stays null — simulation only). No real funds move in this phase.
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const by = typeof body?.by === "string" ? body.by : "operator";
  const result = await approvePayment(params.id, by);
  if (result.ok && result.item) {
    const it = result.item;
    broadcast("approval.approved", it);
    await appendOperatorEvent({ missionId: null, sourceOperator: "Operator", eventType: "status_changed",
      message: `Payment approved: «${it.title}» ${it.amount} ${it.currency} (одобрил ${it.approvedBy}). Платёж НЕ исполнен — симуляция.`,
      riskLevel: "medium", approvalState: "approved" }).catch(() => {});
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

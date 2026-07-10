import { NextResponse } from "next/server";
import { cancelPayment } from "@/lib/walletData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";

// P28 — MANUAL cancel of a payment request. No execution.
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const by = typeof body?.by === "string" ? body.by : "operator";
  const result = await cancelPayment(params.id, by);
  if (result.ok && result.item) {
    const it = result.item;
    broadcast("approval.cancelled", it);
    await appendOperatorEvent({ missionId: null, sourceOperator: "Operator", eventType: "status_changed",
      message: `Payment cancelled: «${it.title}» ${it.amount} ${it.currency}.`,
      riskLevel: "none", approvalState: "not_required" }).catch(() => {});
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

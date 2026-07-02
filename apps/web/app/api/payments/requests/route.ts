import { NextResponse } from "next/server";
import { listPayments, createPayment } from "@/lib/walletData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import type { PaymentRequest, PaymentStatus } from "@/lib/wallet";

// P28 — payment requests. AI PROPOSES a payment; it must pass the Approval Gate.
// Creating a request does NOT move money. No real TON/x402/Telegram execution.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") as PaymentStatus | null;
  const { payments, source } = await listPayments(status);
  return NextResponse.json({ payments, source });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<PaymentRequest>;
  const result = await createPayment(body ?? {});
  if (result.ok && result.item) {
    const it = result.item;
    broadcast("approval.requested", it);
    await appendOperatorEvent({ missionId: null, sourceOperator: it.sourceAgent, eventType: "approval_required",
      message: `Payment request: «${it.title}» ${it.amount} ${it.currency} → ${it.target} — ждёт approve (деньги не двигаются)`,
      riskLevel: "medium", approvalState: "pending" }).catch(() => {});
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

import { NextResponse } from "next/server";
import { listApprovals, createApproval } from "@/lib/approvalsData";
import { appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import type { ApprovalStatus } from "@/lib/approvals";

// P26.1 Approval Gate — queue endpoint.
// GET  /api/approvals[?status=waiting_approval] -> list proposed actions.
// POST /api/approvals -> AI operator PROPOSES an action (status=waiting_approval).
// Proposing is NOT executing: nothing external happens. MANUAL_APPROVAL_ONLY.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") as ApprovalStatus | null;
  const { approvals, source } = await listApprovals(status);
  return NextResponse.json({ approvals, source });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const result = await createApproval(body ?? {});
  if (result.ok && result.item) {
    const it = result.item;
    const rl = it.riskLevel === "critical" ? "high" : it.riskLevel; // OperatorEvent has no "critical"
    broadcast("approval.requested", it);
    await appendOperatorEvent({
      missionId: null,
      sourceOperator: it.sourceAgent,
      eventType: "approval_required",
      message: `Заявка на подтверждение: «${it.title}» (${it.targetModule}, риск ${it.riskLevel}) — ожидает оператора`,
      riskLevel: rl,
      approvalState: "pending",
    }).catch(() => {});
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

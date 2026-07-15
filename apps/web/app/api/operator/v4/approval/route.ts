import { NextRequest, NextResponse } from "next/server";

import { sha256 } from "../../../../../lib/operator-v4/execution-request";
import {
  getRuntimeRecord,
  updateRuntimeRecord,
} from "../../../../../lib/operator-v4/runtime-store";
import type { ApprovalSnapshot } from "../../../../../lib/operator-v4/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    decision?: unknown;
    executionRequestId?: unknown;
  };

  if (body.decision !== "allow" && body.decision !== "deny") {
    return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
  }

  if (typeof body.executionRequestId !== "string") {
    return NextResponse.json({ error: "execution_request_id_required" }, { status: 400 });
  }

  const record = getRuntimeRecord(body.executionRequestId);
  if (!record || !record.approval) {
    return NextResponse.json({ error: "approval_not_found" }, { status: 404 });
  }

  const currentHash = await sha256(record.request.arguments);
  const valid =
    record.approval.executionRequestId === record.request.id &&
    record.approval.toolName === record.request.toolName &&
    record.approval.argumentsHash === record.request.argumentsHash &&
    currentHash === record.request.argumentsHash &&
    Date.parse(record.approval.expiresAt) > Date.now();

  if (!valid) {
    return NextResponse.json({ error: "approval_snapshot_invalid" }, { status: 409 });
  }

  const approval: ApprovalSnapshot = {
    ...record.approval,
    decision: body.decision,
  };
  const executionRequest = {
    ...record.request,
    state: body.decision === "allow" ? "approved" : "denied",
  } as const;

  updateRuntimeRecord(record.request.id, { approval, request: executionRequest });

  return NextResponse.json({
    approval,
    executionRequestId: executionRequest.id,
    state: executionRequest.state,
    nextAction: body.decision === "allow" ? "risk_recheck" : "stop",
  });
}

import { NextRequest, NextResponse } from "next/server";

import { sha256 } from "../../../../../lib/operator-v4/execution-request";
import type {
  ApprovalSnapshot,
  ToolExecutionRequest,
} from "../../../../../lib/operator-v4/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    decision?: unknown;
    executionRequest?: ToolExecutionRequest;
    approval?: ApprovalSnapshot;
  };

  if (body.decision !== "allow" && body.decision !== "deny") {
    return NextResponse.json({ error: "invalid_decision" }, { status: 400 });
  }

  if (!body.executionRequest || !body.approval) {
    return NextResponse.json({ error: "approval_payload_required" }, { status: 400 });
  }

  const currentHash = await sha256(body.executionRequest.arguments);
  const valid =
    body.approval.executionRequestId === body.executionRequest.id &&
    body.approval.toolName === body.executionRequest.toolName &&
    body.approval.argumentsHash === body.executionRequest.argumentsHash &&
    currentHash === body.executionRequest.argumentsHash &&
    Date.parse(body.approval.expiresAt) > Date.now();

  if (!valid) {
    return NextResponse.json(
      { error: "approval_snapshot_invalid" },
      { status: 409 },
    );
  }

  const approval: ApprovalSnapshot = {
    ...body.approval,
    decision: body.decision,
  };

  return NextResponse.json({
    approval,
    executionRequest: {
      ...body.executionRequest,
      state: body.decision === "allow" ? "approved" : "denied",
    },
    nextAction: body.decision === "allow" ? "risk_recheck" : "stop",
  });
}

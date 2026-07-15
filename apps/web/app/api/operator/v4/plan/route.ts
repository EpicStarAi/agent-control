import { NextRequest, NextResponse } from "next/server";

import { buildDirectorPlan } from "../../../../../lib/operator-v4/director-planner";
import { saveRuntimeRecord } from "../../../../../lib/operator-v4/runtime-store";
import type { AutonomyMode } from "../../../../../lib/operator-v4/types";

export const dynamic = "force-dynamic";

const AUTONOMY_MODES = new Set<AutonomyMode>([
  "copilot",
  "supervised",
  "autonomous",
]);

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    message?: unknown;
    agentId?: unknown;
    requestedBy?: unknown;
    autonomyMode?: unknown;
    accountId?: unknown;
  };

  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    return NextResponse.json({ error: "message_required" }, { status: 400 });
  }

  const autonomyMode = body.autonomyMode ?? "copilot";
  if (
    typeof autonomyMode !== "string" ||
    !AUTONOMY_MODES.has(autonomyMode as AutonomyMode)
  ) {
    return NextResponse.json({ error: "invalid_autonomy_mode" }, { status: 400 });
  }

  const result = await buildDirectorPlan({
    message: body.message,
    agentId: typeof body.agentId === "string" ? body.agentId : "director",
    requestedBy:
      typeof body.requestedBy === "string" ? body.requestedBy : "operator",
    autonomyMode: autonomyMode as AutonomyMode,
    accountId: typeof body.accountId === "string" ? body.accountId : undefined,
  });

  saveRuntimeRecord(result.executionRequest, result.approval);

  return NextResponse.json({
    plan: result.plan,
    executionRequestId: result.executionRequest.id,
    executionRequest: result.executionRequest,
    approval: result.approval,
    approvalPolicy: result.approvalPolicy,
    executionEnabled: result.executionRequest.toolName === "telegram.list_chats",
    nextAction: result.approval ? "render_inline_approval" : "risk_recheck",
  });
}

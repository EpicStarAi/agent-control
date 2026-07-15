import { NextRequest, NextResponse } from "next/server";

import { executeOperatorV4Tool } from "../../../../../lib/operator-v4/tool-executor";
import type {
  ApprovalSnapshot,
  ToolExecutionRequest,
} from "../../../../../lib/operator-v4/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    executionRequest?: ToolExecutionRequest;
    approval?: ApprovalSnapshot | null;
  };

  if (!body.executionRequest || typeof body.executionRequest !== "object") {
    return NextResponse.json(
      { ok: false, state: "failed", reason: "execution_request_required" },
      { status: 400 },
    );
  }

  const result = await executeOperatorV4Tool({
    request: body.executionRequest,
    approval: body.approval ?? null,
    riskContext: {
      accountWarm: true,
      accountDailyActions: 0,
      accountDailyLimit: 100,
      targetAllowlisted: true,
      proxyHealthy: true,
      minimumIntervalMs: 0,
    },
  });

  return NextResponse.json(result, { status: result.status ?? (result.ok ? 200 : 400) });
}

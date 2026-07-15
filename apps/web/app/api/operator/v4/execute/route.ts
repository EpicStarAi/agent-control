import { NextRequest, NextResponse } from "next/server";

import { auditTransition } from "../../../../../lib/operator-v4/audit";
import {
  getRuntimeRecord,
  updateRuntimeRecord,
} from "../../../../../lib/operator-v4/runtime-store";
import { executeOperatorV4Tool } from "../../../../../lib/operator-v4/tool-executor";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    executionRequestId?: unknown;
  };

  if (typeof body.executionRequestId !== "string") {
    return NextResponse.json(
      { ok: false, state: "failed", reason: "execution_request_id_required" },
      { status: 400 },
    );
  }

  const record = getRuntimeRecord(body.executionRequestId);
  if (!record) {
    return NextResponse.json(
      { ok: false, state: "failed", reason: "execution_request_not_found" },
      { status: 404 },
    );
  }

  auditTransition(record.request, "risk_checking", {
    reason: "pre_execution_risk_recheck",
  });

  const result = await executeOperatorV4Tool({
    request: record.request,
    approval: record.approval,
    riskContext: {
      accountWarm: true,
      accountDailyActions: 0,
      accountDailyLimit: 100,
      targetAllowlisted: true,
      proxyHealthy: true,
      minimumIntervalMs: 0,
    },
  });

  const nextRequest = {
    ...record.request,
    state: result.state,
  };
  updateRuntimeRecord(record.request.id, { request: nextRequest });

  auditTransition(nextRequest, result.state, {
    reason: result.reason,
    risk: result.risk,
    metadata: {
      ok: result.ok,
      status: result.status,
    },
  });

  return NextResponse.json(result, {
    status: result.status ?? (result.ok ? 200 : 400),
  });
}

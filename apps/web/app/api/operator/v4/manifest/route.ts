import { NextResponse } from "next/server";

import { OPERATOR_V4_TOOLS } from "../../../../../lib/operator-v4/tool-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    system: "EPIC AI OS v4",
    phase: "P-A",
    status: "implementation_started",
    autonomyModes: ["copilot", "supervised", "autonomous"],
    executionFlow: [
      "dialogue",
      "plan",
      "approval_policy",
      "risk_recheck",
      "execute",
      "verify",
      "audit",
    ],
    productionWriteEnabled: false,
    tools: OPERATOR_V4_TOOLS,
  });
}

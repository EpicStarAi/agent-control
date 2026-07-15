import { checkRisk, type RiskContext } from "./risk-gate";
import { getOperatorV4Tool } from "./tool-registry";
import type { ApprovalSnapshot, ToolExecutionRequest } from "./types";
import { validateApprovalSnapshot } from "./execution-request";

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export interface ExecuteToolInput {
  request: ToolExecutionRequest;
  approval: ApprovalSnapshot | null;
  riskContext: RiskContext;
}

export interface ExecuteToolResult {
  ok: boolean;
  state: "completed" | "denied" | "delayed" | "failed";
  reason: string;
  risk?: ReturnType<typeof checkRisk>;
  result?: unknown;
  status?: number;
}

async function executeTelegramListChats(
  request: ToolExecutionRequest,
): Promise<ExecuteToolResult> {
  const accountId = request.arguments.accountId;
  const limit = request.arguments.limit;

  if (typeof accountId !== "string" || accountId.length === 0) {
    return { ok: false, state: "failed", reason: "invalid_account_id", status: 400 };
  }

  const query = new URLSearchParams({ accountId });
  if (typeof limit === "number" && Number.isInteger(limit)) {
    query.set("limit", String(limit));
  }

  try {
    const response = await fetch(`${API_BASE_URL}/telegram/chats?${query.toString()}`, {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });

    const body = await response.json().catch(() => ({
      message: "Backend returned a non-JSON response.",
    }));

    if (!response.ok) {
      return {
        ok: false,
        state: "failed",
        reason: "tdlib_backend_error",
        result: body,
        status: response.status,
      };
    }

    return {
      ok: true,
      state: "completed",
      reason: "tool_execution_completed",
      result: body,
      status: response.status,
    };
  } catch {
    return {
      ok: false,
      state: "failed",
      reason: "tdlib_backend_offline",
      status: 503,
    };
  }
}

export async function executeOperatorV4Tool(
  input: ExecuteToolInput,
): Promise<ExecuteToolResult> {
  const tool = getOperatorV4Tool(input.request.toolName);
  if (!tool) {
    return { ok: false, state: "denied", reason: "tool_not_registered", status: 400 };
  }

  if (input.approval) {
    const validation = await validateApprovalSnapshot(input.request, input.approval);
    if (!validation.valid) {
      return { ok: false, state: "denied", reason: validation.reason, status: 403 };
    }
  } else if (input.request.state === "awaiting_approval") {
    return { ok: false, state: "denied", reason: "approval_required", status: 403 };
  }

  const risk = checkRisk(input.request, tool, input.riskContext);
  if (risk.decision === "deny") {
    return { ok: false, state: "denied", reason: risk.reason, risk, status: 403 };
  }
  if (risk.decision === "delay") {
    return { ok: false, state: "delayed", reason: risk.reason, risk, status: 429 };
  }

  if (input.request.toolName === "telegram.list_chats") {
    const result = await executeTelegramListChats(input.request);
    return { ...result, risk };
  }

  return {
    ok: false,
    state: "denied",
    reason: "tool_execution_not_enabled_in_pa",
    risk,
    status: 403,
  };
}

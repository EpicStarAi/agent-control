import { decideApproval } from "./approval-policy";
import { createApprovalSnapshot, createExecutionRequest } from "./execution-request";
import { getOperatorV4Tool } from "./tool-registry";
import type { AutonomyMode } from "./types";

export interface DirectorPlanInput {
  message: string;
  agentId: string;
  requestedBy: string;
  autonomyMode: AutonomyMode;
  accountId?: string;
}

export interface DirectorPlanResult {
  plan: {
    id: string;
    goal: string;
    summary: string;
    steps: Array<{
      id: string;
      title: string;
      toolName: string;
      state: "proposed";
    }>;
  };
  executionRequest: Awaited<ReturnType<typeof createExecutionRequest>>;
  approval: Awaited<ReturnType<typeof createApprovalSnapshot>> | null;
  approvalPolicy: ReturnType<typeof decideApproval>;
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function selectTool(message: string): {
  toolName: "telegram.list_chats";
  arguments: Record<string, unknown>;
  summary: string;
} {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes("чат") ||
    normalized.includes("telegram") ||
    normalized.includes("телеграм")
  ) {
    return {
      toolName: "telegram.list_chats",
      arguments: { accountId: "novikova", limit: 20 },
      summary: "Получить последние Telegram-чаты авторизованного аккаунта NOVIKOVA.",
    };
  }

  return {
    toolName: "telegram.list_chats",
    arguments: { accountId: "novikova", limit: 20 },
    summary: "P-A пока поддерживает только безопасный read-only сценарий Telegram list chats.",
  };
}

export async function buildDirectorPlan(input: DirectorPlanInput): Promise<DirectorPlanResult> {
  const selected = selectTool(input.message);
  const tool = getOperatorV4Tool(selected.toolName);

  if (!tool) {
    throw new Error(`Tool is not registered: ${selected.toolName}`);
  }

  const planId = createId("plan");
  const executionRequest = await createExecutionRequest({
    id: createId("exec"),
    planId,
    toolName: selected.toolName,
    arguments: {
      ...selected.arguments,
      accountId: input.accountId ?? selected.arguments.accountId,
    },
    agentId: input.agentId,
    requestedBy: input.requestedBy,
    autonomyMode: input.autonomyMode,
  });

  const approvalPolicy = decideApproval({
    mode: input.autonomyMode,
    actionClass: tool.actionClass,
    riskLevel: tool.riskLevel,
    allowlisted: true,
  });

  const approval = approvalPolicy.requiresApproval
    ? await createApprovalSnapshot({
        id: createId("approval"),
        request: executionRequest,
      })
    : null;

  return {
    plan: {
      id: planId,
      goal: input.message,
      summary: selected.summary,
      steps: [
        {
          id: "step_1",
          title: selected.summary,
          toolName: selected.toolName,
          state: "proposed",
        },
      ],
    },
    executionRequest: {
      ...executionRequest,
      state: approvalPolicy.requiresApproval ? "awaiting_approval" : "approved",
    },
    approval,
    approvalPolicy,
  };
}

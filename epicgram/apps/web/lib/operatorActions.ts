// P18 head-start — Claude Desktop-style operator approval/action flow.
// SAFE actions: prepare/attach only (никаких Telegram write). HIGH-RISK: blocked (никогда не исполняются).
// Нет auto-send, нет bulk, approval не байпасится, реальных Telegram-записей нет.

export type RiskLevel = "low" | "medium" | "high";
export type QueueState = "pending" | "approved" | "executing" | "done" | "failed" | "blocked" | "rejected";

export const SAFE_ACTIONS = [
  "telegram.prepare_channel_plan",
  "telegram.prepare_group_plan",
  "telegram.prepare_bot_plan",
  "telegram.prepare_post",
  "telegram.prepare_profile_update",
  "project.attach_chat",
  "project.attach_channel",
  "project.attach_bot",
] as const;

export const BLOCKED_ACTIONS = [
  "telegram.create_channel",
  "telegram.create_group",
  "telegram.publish_post",
  "telegram.pin_message",
  "telegram.invite_user",
  "telegram.change_admin_rights",
  "telegram.delete_message",
  "telegram.bulk_action",
] as const;

export type ActionType = (typeof SAFE_ACTIONS)[number] | (typeof BLOCKED_ACTIONS)[number] | string;

export const AUDIT_EVENTS = {
  planCreated: "action_plan_created",
  approvalRequested: "approval_requested",
  approvalAccepted: "approval_accepted",
  approvalRejected: "approval_rejected",
  executionStarted: "execution_started",
  executionDone: "execution_done",
  executionBlocked: "execution_blocked",
  executionFailed: "execution_failed",
} as const;

export interface ActionTarget {
  kind: "channel" | "group" | "bot" | "chat" | "profile" | "none";
  id?: string;
  title?: string;
}

export interface ActionEnvelope {
  approval_id: string;
  actor: string;
  account_id: string;
  project: string;
  action_type: ActionType;
  title: string;
  target: ActionTarget;
  steps: string[];
  risk_level: RiskLevel;
  approval_status: QueueState;
  created_at: string;
  executed_at: string | null;
  result: string | null;
}

const rid = (): string => "appr_" + Math.random().toString(36).slice(2, 10);
const now = (): string => new Date().toISOString();

export function isSafe(a: ActionType): boolean {
  return (SAFE_ACTIONS as readonly string[]).includes(a);
}
export function isBlocked(a: ActionType): boolean {
  return (BLOCKED_ACTIONS as readonly string[]).includes(a);
}
export function riskFor(a: ActionType): RiskLevel {
  return isBlocked(a) ? "high" : isSafe(a) ? "low" : "medium";
}

export function createEnvelope(input: {
  action_type: ActionType;
  title?: string;
  account_id?: string;
  project?: string;
  target?: ActionTarget;
  steps?: string[];
  actor?: string;
}): ActionEnvelope {
  return {
    approval_id: rid(),
    actor: input.actor || "human",
    account_id: input.account_id || "",
    project: input.project || "",
    action_type: input.action_type,
    title: input.title || input.action_type,
    target: input.target || { kind: "none" },
    steps: input.steps || [],
    risk_level: riskFor(input.action_type),
    approval_status: "pending",
    created_at: now(),
    executed_at: null,
    result: null,
  };
}

// SAFE → подготовка плана/черновика/привязки (stub) → done. HIGH-RISK → blocked (реальной записи нет НИКОГДА).
export function approveAndExecute(env: ActionEnvelope): ActionEnvelope {
  if (isBlocked(env.action_type)) {
    return {
      ...env,
      approval_status: "blocked",
      executed_at: now(),
      result: "HIGH_RISK_BLOCKED: реальные Telegram write-действия отключены. Нужен явный approval-путь + MANUAL_LIVE в production-gate.",
    };
  }
  return {
    ...env,
    approval_status: "done",
    executed_at: now(),
    result: "PREPARED (stub): план/черновик/привязка готовы локально. Реальных Telegram-действий не выполнялось.",
  };
}

export function rejectEnvelope(env: ActionEnvelope): ActionEnvelope {
  return { ...env, approval_status: "rejected", executed_at: now(), result: "rejected by operator" };
}

export const QUEUE_COLOR: Record<QueueState, string> = {
  pending: "#a78bfa",
  approved: "#34d399",
  executing: "#818cf8",
  done: "#4ade80",
  failed: "#f87171",
  blocked: "#f59e0b",
  rejected: "#f87171",
};

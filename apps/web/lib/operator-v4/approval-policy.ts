import type { ActionClass, AutonomyMode, RiskLevel } from "./types";

const ALWAYS_MANUAL: ReadonlySet<ActionClass> = new Set([
  "deploy",
  "money",
  "account_management",
]);

export interface ApprovalPolicyInput {
  mode: AutonomyMode;
  actionClass: ActionClass;
  riskLevel: RiskLevel;
  allowlisted: boolean;
}

export interface ApprovalPolicyDecision {
  requiresApproval: boolean;
  reason: string;
}

export function decideApproval(input: ApprovalPolicyInput): ApprovalPolicyDecision {
  if (ALWAYS_MANUAL.has(input.actionClass)) {
    return { requiresApproval: true, reason: "critical_action_class" };
  }

  if (!input.allowlisted && input.actionClass !== "read" && input.actionClass !== "analysis") {
    return { requiresApproval: true, reason: "target_not_allowlisted" };
  }

  if (input.riskLevel === "critical") {
    return { requiresApproval: true, reason: "critical_risk" };
  }

  if (input.mode === "copilot") {
    return { requiresApproval: true, reason: "copilot_requires_inline_approval" };
  }

  if (input.mode === "supervised") {
    const requiresApproval = !["read", "analysis", "draft"].includes(input.actionClass);
    return {
      requiresApproval,
      reason: requiresApproval ? "supervised_write_action" : "supervised_safe_action",
    };
  }

  const requiresApproval = input.riskLevel === "high" && input.actionClass !== "publish";
  return {
    requiresApproval,
    reason: requiresApproval ? "autonomous_high_risk_exception" : "autonomous_policy_allow",
  };
}

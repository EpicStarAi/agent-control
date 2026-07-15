import type { EpicToolDefinition, RiskDecision, ToolExecutionRequest } from "./types";

export interface RiskContext {
  accountWarm: boolean;
  accountDailyActions: number;
  accountDailyLimit: number;
  targetAllowlisted: boolean;
  proxyHealthy: boolean;
  lastActionAt?: string;
  minimumIntervalMs?: number;
}

export function checkRisk(
  request: ToolExecutionRequest,
  tool: EpicToolDefinition,
  context: RiskContext,
  now: Date = new Date(),
): RiskDecision {
  if (!context.proxyHealthy) {
    return {
      decision: "deny",
      reason: "proxy_unhealthy",
      policyVersion: "pa-risk-v1",
    };
  }

  if (!context.targetAllowlisted && tool.actionClass !== "read" && tool.actionClass !== "analysis") {
    return {
      decision: "deny",
      reason: "target_not_allowlisted",
      policyVersion: "pa-risk-v1",
    };
  }

  if (!context.accountWarm && tool.actionClass !== "read" && tool.actionClass !== "analysis") {
    return {
      decision: "deny",
      reason: "account_not_warmed",
      policyVersion: "pa-risk-v1",
    };
  }

  if (context.accountDailyActions >= context.accountDailyLimit) {
    return {
      decision: "deny",
      reason: "account_daily_limit_reached",
      policyVersion: "pa-risk-v1",
    };
  }

  if (context.lastActionAt && context.minimumIntervalMs) {
    const elapsed = now.getTime() - Date.parse(context.lastActionAt);
    if (elapsed < context.minimumIntervalMs) {
      return {
        decision: "delay",
        reason: "pacing_interval_not_reached",
        retryAfterMs: context.minimumIntervalMs - elapsed,
        policyVersion: "pa-risk-v1",
      };
    }
  }

  if (request.expiresAt && Date.parse(request.expiresAt) <= now.getTime()) {
    return {
      decision: "deny",
      reason: "execution_request_expired",
      policyVersion: "pa-risk-v1",
    };
  }

  return {
    decision: "allow",
    reason: "risk_policy_allow",
    policyVersion: "pa-risk-v1",
  };
}

export type AutonomyMode = "copilot" | "supervised" | "autonomous";

export type ActionClass =
  | "read"
  | "analysis"
  | "draft"
  | "publish"
  | "account_management"
  | "traffic"
  | "deploy"
  | "money";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ExecutionState =
  | "draft"
  | "planning"
  | "awaiting_approval"
  | "approved"
  | "risk_checking"
  | "executing"
  | "verifying"
  | "completed"
  | "denied"
  | "delayed"
  | "failed"
  | "rolled_back"
  | "partially_completed";

export interface EpicToolDefinition {
  name: string;
  version: string;
  description: string;
  actionClass: ActionClass;
  riskLevel: RiskLevel;
  supportsDryRun: boolean;
  supportsRollback: boolean;
  timeoutMs: number;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface ToolExecutionRequest {
  id: string;
  planId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  argumentsHash: string;
  agentId: string;
  requestedBy: string;
  autonomyMode: AutonomyMode;
  state: ExecutionState;
  createdAt: string;
  expiresAt: string;
}

export interface ApprovalSnapshot {
  id: string;
  executionRequestId: string;
  toolName: string;
  agentId: string;
  argumentsHash: string;
  contentHash?: string;
  decision: "pending" | "allow" | "deny" | "expired";
  createdAt: string;
  expiresAt: string;
}

export interface RiskDecision {
  decision: "allow" | "delay" | "deny";
  reason: string;
  retryAfterMs?: number;
  policyVersion: string;
}

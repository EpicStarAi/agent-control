import type { ExecutionState, RiskDecision, ToolExecutionRequest } from "./types";

export interface OperatorAuditEvent {
  id: string;
  executionRequestId: string;
  planId: string;
  toolName: string;
  agentId: string;
  requestedBy: string;
  state: ExecutionState;
  timestamp: string;
  reason?: string;
  risk?: RiskDecision;
  metadata?: Record<string, unknown>;
}

const auditBuffer: OperatorAuditEvent[] = [];
const MAX_BUFFER_SIZE = 500;

export function appendAuditEvent(event: OperatorAuditEvent): OperatorAuditEvent {
  auditBuffer.push(structuredClone(event));
  if (auditBuffer.length > MAX_BUFFER_SIZE) {
    auditBuffer.splice(0, auditBuffer.length - MAX_BUFFER_SIZE);
  }
  return event;
}

export function auditTransition(
  request: ToolExecutionRequest,
  state: ExecutionState,
  options: {
    reason?: string;
    risk?: RiskDecision;
    metadata?: Record<string, unknown>;
    now?: Date;
  } = {},
): OperatorAuditEvent {
  return appendAuditEvent({
    id: `audit_${crypto.randomUUID()}`,
    executionRequestId: request.id,
    planId: request.planId,
    toolName: request.toolName,
    agentId: request.agentId,
    requestedBy: request.requestedBy,
    state,
    timestamp: (options.now ?? new Date()).toISOString(),
    reason: options.reason,
    risk: options.risk,
    metadata: options.metadata,
  });
}

export function listAuditEvents(limit = 100): OperatorAuditEvent[] {
  const safeLimit = Math.max(1, Math.min(limit, MAX_BUFFER_SIZE));
  return auditBuffer.slice(-safeLimit).reverse().map((event) => structuredClone(event));
}

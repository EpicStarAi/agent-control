import type {
  ApprovalSnapshot,
  AutonomyMode,
  ToolExecutionRequest,
} from "./types";

const encoder = new TextEncoder();

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableSerialize(item)}`);
    return `{${entries.join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

export async function sha256(value: unknown): Promise<string> {
  const bytes = encoder.encode(stableSerialize(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export interface CreateExecutionRequestInput {
  id: string;
  planId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  agentId: string;
  requestedBy: string;
  autonomyMode: AutonomyMode;
  ttlMs?: number;
  now?: Date;
}

export async function createExecutionRequest(
  input: CreateExecutionRequestInput,
): Promise<ToolExecutionRequest> {
  const now = input.now ?? new Date();
  const ttlMs = input.ttlMs ?? 10 * 60 * 1000;
  const frozenArguments = structuredClone(input.arguments);

  return {
    id: input.id,
    planId: input.planId,
    toolName: input.toolName,
    arguments: frozenArguments,
    argumentsHash: await sha256(frozenArguments),
    agentId: input.agentId,
    requestedBy: input.requestedBy,
    autonomyMode: input.autonomyMode,
    state: "draft",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };
}

export interface CreateApprovalSnapshotInput {
  id: string;
  request: ToolExecutionRequest;
  content?: unknown;
}

export async function createApprovalSnapshot(
  input: CreateApprovalSnapshotInput,
): Promise<ApprovalSnapshot> {
  return {
    id: input.id,
    executionRequestId: input.request.id,
    toolName: input.request.toolName,
    agentId: input.request.agentId,
    argumentsHash: input.request.argumentsHash,
    contentHash: input.content === undefined ? undefined : await sha256(input.content),
    decision: "pending",
    createdAt: input.request.createdAt,
    expiresAt: input.request.expiresAt,
  };
}

export async function validateApprovalSnapshot(
  request: ToolExecutionRequest,
  snapshot: ApprovalSnapshot,
): Promise<{ valid: boolean; reason: string }> {
  if (snapshot.decision !== "allow") {
    return { valid: false, reason: `approval_${snapshot.decision}` };
  }

  if (Date.parse(snapshot.expiresAt) <= Date.now()) {
    return { valid: false, reason: "approval_expired" };
  }

  if (snapshot.executionRequestId !== request.id || snapshot.toolName !== request.toolName) {
    return { valid: false, reason: "approval_request_mismatch" };
  }

  const currentHash = await sha256(request.arguments);
  if (currentHash !== request.argumentsHash || currentHash !== snapshot.argumentsHash) {
    return { valid: false, reason: "approval_arguments_changed" };
  }

  return { valid: true, reason: "approval_valid" };
}

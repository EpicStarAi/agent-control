// agentRuns.ts — construction helpers + id generation for agent runs.
// Types live in lib/agent/types.ts (shared with the pure engine).

import crypto from "node:crypto";
import {
  MAX_STEPS_DEFAULT,
  RUN_TIMEOUT_MS_DEFAULT,
  type AgentRun
} from "./agent/types";

export function newRunId(): string {
  return `run_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

export function createRunObject(input: {
  userId: string;
  workspaceId: string;
  accountId: string | null;
  goal: string;
  context?: Record<string, unknown>;
  maxSteps?: number;
  timeoutMs?: number;
}): AgentRun {
  const now = new Date().toISOString();
  const maxSteps = clampInt(input.maxSteps, 1, MAX_STEPS_DEFAULT, MAX_STEPS_DEFAULT);
  const timeoutMs = clampInt(input.timeoutMs, 1000, 10 * 60_000, RUN_TIMEOUT_MS_DEFAULT);
  return {
    id: newRunId(),
    userId: input.userId,
    workspaceId: input.workspaceId,
    accountId: input.accountId,
    goal: input.goal,
    context: input.context ?? {},
    plan: [],
    steps: [],
    status: "planning",
    maxSteps,
    timeoutMs,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    cancelRequested: false,
    reason: null
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? Math.floor(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function maskAccountId(id: string | null): string | null {
  if (!id) return null;
  if (id.length <= 6) return "***";
  return `${id.slice(0, 4)}***${id.slice(-2)}`;
}

// API view of a run: the raw bound account id is masked even for its owner, and
// step args are dropped (they can echo context). Statuses and intents are the
// product surface and are returned verbatim.
export function serializeRun(run: AgentRun) {
  return {
    id: run.id,
    goal: run.goal,
    status: run.status,
    reason: run.reason,
    accountIdMasked: maskAccountId(run.accountId),
    accountBound: run.accountId !== null,
    maxSteps: run.maxSteps,
    timeoutMs: run.timeoutMs,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    cancelRequested: run.cancelRequested,
    plan: run.plan.map((p) => ({ index: p.index, tool: p.tool, intent: p.intent, risk: p.risk })),
    steps: run.steps.map((s) => ({
      index: s.index,
      tool: s.tool,
      intent: s.intent,
      risk: s.risk,
      attempt: s.attempt,
      status: s.status,
      claimed: s.claimed,
      verified: s.verified,
      error: s.error,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt
    }))
  };
}

export function isTerminalStatus(status: AgentRun["status"]): boolean {
  return status === "succeeded" || status === "failed" || status === "cancelled";
}

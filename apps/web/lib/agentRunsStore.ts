// agentRunsStore.ts — filesystem fallback for agent_runs (no PostgreSQL).
// Mirrors telegramBindingsStore.ts. Used only when DATABASE_URL is unset (local
// dev, tests-of-record on a candidate without a DB). Runs are stored with their
// steps embedded; this is a single-process JSON store, sufficient for the
// candidate demo and unit tests.

import type { AgentRun, AgentRunStatus, AgentStepResult, RunStore } from "./agent/types";

type Store = { runs: AgentRun[] };

const FILE = ".agent-runs.json";

function pathTo(): string {
  return `${process.cwd()}/${FILE}`;
}

function load(): Store {
  try {
    const { readFileSync } = require("node:fs");
    const data = readFileSync(pathTo(), "utf8");
    const parsed = JSON.parse(data) as Store;
    if (parsed && Array.isArray(parsed.runs)) return parsed;
  } catch {
    /* no file yet */
  }
  return { runs: [] };
}

function save(s: Store): void {
  try {
    const { writeFileSync } = require("node:fs");
    writeFileSync(pathTo(), JSON.stringify(s, null, 2));
  } catch {
    /* ignore — best effort */
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export async function createRun(run: AgentRun): Promise<void> {
  const s = load();
  if (s.runs.some((r) => r.id === run.id)) return;
  s.runs.push(clone(run));
  save(s);
}

export async function saveRun(run: AgentRun): Promise<void> {
  const s = load();
  const idx = s.runs.findIndex((r) => r.id === run.id);
  // Preserve a cancel request that may have been written by a concurrent cancel
  // call after this in-memory run object was last read.
  const cancelRequested = idx >= 0 ? s.runs[idx].cancelRequested || run.cancelRequested : run.cancelRequested;
  const next = clone(run);
  next.cancelRequested = cancelRequested;
  if (idx >= 0) s.runs[idx] = next;
  else s.runs.push(next);
  save(s);
}

export async function getRun(id: string): Promise<AgentRun | null> {
  const s = load();
  const r = s.runs.find((x) => x.id === id);
  return r ? clone(r) : null;
}

export async function upsertStep(result: AgentStepResult): Promise<void> {
  const s = load();
  const run = s.runs.find((r) => r.id === result.runId);
  if (!run) return;
  const idx = run.steps.findIndex((st) => st.id === result.id);
  if (idx >= 0) run.steps[idx] = clone(result);
  else run.steps.push(clone(result));
  save(s);
}

export async function isCancelRequested(id: string): Promise<boolean> {
  const s = load();
  const r = s.runs.find((x) => x.id === id);
  return Boolean(r?.cancelRequested);
}

export async function requestCancel(id: string): Promise<void> {
  const s = load();
  const r = s.runs.find((x) => x.id === id);
  if (!r) return;
  r.cancelRequested = true;
  save(s);
}

export async function listByWorkspace(workspaceId: string, limit = 20): Promise<AgentRun[]> {
  const s = load();
  return s.runs
    .filter((r) => r.workspaceId === workspaceId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .map(clone);
}

export async function healthCheck(): Promise<boolean> {
  return true;
}

// Convenience object implementing the RunStore port used by the loop.
export const store: RunStore = {
  createRun,
  saveRun,
  getRun,
  upsertStep,
  isCancelRequested,
  requestCancel
};

export type { AgentRunStatus };

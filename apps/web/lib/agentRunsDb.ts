// agentRunsDb.ts — PostgreSQL adapter for agent_runs / agent_run_steps.
// CREATE TABLE IF NOT EXISTS (idempotent, additive). No DROP, no destructive
// migration. Falls back to the filesystem store when DATABASE_URL is unset or pg
// is unavailable — so the engine, routes and tests work with or without a DB.
//
// Mirrors telegramBindingsDb.ts.

import type {
  AgentRun,
  AgentRunStatus,
  AgentStep,
  AgentStepResult,
  RunStore,
  Verification
} from "./agent/types";
import * as store from "./agentRunsStore";

type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };

const g = globalThis as unknown as {
  __epicAgentRunPool?: PgPool | null;
  __epicAgentRunInit?: Promise<void>;
};

export function enabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function loadPg(): Promise<unknown | null> {
  try {
    const n = "pg";
    return await import(/* webpackIgnore: true */ n);
  } catch {
    return null;
  }
}

async function pool(): Promise<PgPool | null> {
  if (!enabled()) return null;
  if (g.__epicAgentRunPool !== undefined) return g.__epicAgentRunPool;
  const pg = (await loadPg()) as
    | { Pool?: new (c: unknown) => PgPool; default?: { Pool: new (c: unknown) => PgPool } }
    | null;
  const Pool = pg?.Pool ?? pg?.default?.Pool;
  if (!Pool) {
    g.__epicAgentRunPool = null;
    return null;
  }
  g.__epicAgentRunPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    connectionTimeoutMillis: 4000
  });
  return g.__epicAgentRunPool;
}

async function ensureInit(p: PgPool): Promise<void> {
  if (g.__epicAgentRunInit) return g.__epicAgentRunInit;
  g.__epicAgentRunInit = (async () => {
    await p.query(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id            text        NOT NULL PRIMARY KEY,
        user_id       text        NOT NULL,
        workspace_id  text        NOT NULL,
        account_id    text,
        goal          text        NOT NULL,
        context       jsonb       NOT NULL DEFAULT '{}'::jsonb,
        plan          jsonb       NOT NULL DEFAULT '[]'::jsonb,
        status        text        NOT NULL DEFAULT 'planning',
        max_steps     integer     NOT NULL DEFAULT 12,
        timeout_ms    integer     NOT NULL DEFAULT 90000,
        cancel_requested boolean  NOT NULL DEFAULT false,
        reason        text,
        created_at    timestamptz NOT NULL DEFAULT now(),
        started_at    timestamptz,
        finished_at   timestamptz
      )
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS agent_runs_ws_idx ON agent_runs (workspace_id)`);
    await p.query(`CREATE INDEX IF NOT EXISTS agent_runs_user_idx ON agent_runs (user_id)`);
    await p.query(`
      CREATE TABLE IF NOT EXISTS agent_run_steps (
        id          text        NOT NULL PRIMARY KEY,
        run_id      text        NOT NULL,
        step_id     text        NOT NULL,
        idx         integer     NOT NULL,
        tool        text        NOT NULL,
        intent      text        NOT NULL DEFAULT '',
        risk        text        NOT NULL,
        args        jsonb       NOT NULL DEFAULT '{}'::jsonb,
        attempt     integer     NOT NULL DEFAULT 1,
        started_at  timestamptz,
        finished_at timestamptz,
        claimed     text        NOT NULL DEFAULT '',
        verified    jsonb,
        status      text        NOT NULL,
        error       text
      )
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS agent_run_steps_run_idx ON agent_run_steps (run_id)`);
  })();
  return g.__epicAgentRunInit;
}

async function db(): Promise<PgPool> {
  const p = await pool();
  if (!p) throw new Error("pg unavailable");
  await ensureInit(p);
  return p;
}

function rowToRun(r: Row, steps: AgentStepResult[]): AgentRun {
  return {
    id: String(r.id ?? ""),
    userId: String(r.user_id ?? ""),
    workspaceId: String(r.workspace_id ?? ""),
    accountId: r.account_id ? String(r.account_id) : null,
    goal: String(r.goal ?? ""),
    context: asObject(r.context),
    plan: asPlan(r.plan),
    steps,
    status: (r.status ?? "planning") as AgentRunStatus,
    maxSteps: Number(r.max_steps ?? 12),
    timeoutMs: Number(r.timeout_ms ?? 90000),
    createdAt: new Date(r.created_at as string).toISOString(),
    startedAt: r.started_at ? new Date(r.started_at as string).toISOString() : null,
    finishedAt: r.finished_at ? new Date(r.finished_at as string).toISOString() : null,
    cancelRequested: Boolean(r.cancel_requested),
    reason: r.reason ? String(r.reason) : null
  };
}

function rowToStep(r: Row): AgentStepResult {
  return {
    id: String(r.id ?? ""),
    runId: String(r.run_id ?? ""),
    stepId: String(r.step_id ?? ""),
    index: Number(r.idx ?? 0),
    tool: String(r.tool ?? ""),
    intent: String(r.intent ?? ""),
    risk: (r.risk ?? "read") as AgentStepResult["risk"],
    args: asObject(r.args),
    attempt: Number(r.attempt ?? 1),
    startedAt: r.started_at ? new Date(r.started_at as string).toISOString() : "",
    finishedAt: r.finished_at ? new Date(r.finished_at as string).toISOString() : null,
    claimed: String(r.claimed ?? ""),
    verified: (r.verified as Verification | null) ?? null,
    status: (r.status ?? "running") as AgentStepResult["status"],
    error: r.error ? String(r.error) : null
  };
}

function asObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      if (p && typeof p === "object" && !Array.isArray(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return {};
}

function asPlan(v: unknown): AgentStep[] {
  if (Array.isArray(v)) return v as AgentStep[];
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      if (Array.isArray(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return [];
}

export async function createRun(run: AgentRun): Promise<void> {
  if (enabled()) {
    try {
      const p = await db();
      await p.query(
        `INSERT INTO agent_runs
           (id,user_id,workspace_id,account_id,goal,context,plan,status,max_steps,timeout_ms,cancel_requested,reason,created_at,started_at,finished_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO NOTHING`,
        [
          run.id, run.userId, run.workspaceId, run.accountId, run.goal,
          JSON.stringify(run.context ?? {}), JSON.stringify(run.plan ?? []),
          run.status, run.maxSteps, run.timeoutMs, run.cancelRequested, run.reason,
          run.createdAt, run.startedAt, run.finishedAt
        ]
      );
      return;
    } catch {
      /* fall through */
    }
  }
  return store.createRun(run);
}

// Header-only upsert. Steps are persisted via upsertStep so the "before/after"
// per-step write is authoritative.
export async function saveRun(run: AgentRun): Promise<void> {
  if (enabled()) {
    try {
      const p = await db();
      await p.query(
        `UPDATE agent_runs SET
           account_id=$2, goal=$3, context=$4, plan=$5, status=$6, max_steps=$7,
           timeout_ms=$8, cancel_requested = (cancel_requested OR $9), reason=$10,
           started_at=$11, finished_at=$12
         WHERE id=$1`,
        [
          run.id, run.accountId, run.goal, JSON.stringify(run.context ?? {}),
          JSON.stringify(run.plan ?? []), run.status, run.maxSteps, run.timeoutMs,
          run.cancelRequested, run.reason, run.startedAt, run.finishedAt
        ]
      );
      return;
    } catch {
      /* fall through */
    }
  }
  return store.saveRun(run);
}

export async function getRun(id: string): Promise<AgentRun | null> {
  if (enabled()) {
    try {
      const p = await db();
      const rr = await p.query(`SELECT * FROM agent_runs WHERE id=$1 LIMIT 1`, [id]);
      if (!rr.rows[0]) return null;
      const sr = await p.query(`SELECT * FROM agent_run_steps WHERE run_id=$1 ORDER BY idx ASC, attempt ASC`, [id]);
      const steps = sr.rows.map(rowToStep);
      return rowToRun(rr.rows[0], steps);
    } catch {
      /* fall through */
    }
  }
  return store.getRun(id);
}

export async function upsertStep(result: AgentStepResult): Promise<void> {
  if (enabled()) {
    try {
      const p = await db();
      await p.query(
        `INSERT INTO agent_run_steps
           (id,run_id,step_id,idx,tool,intent,risk,args,attempt,started_at,finished_at,claimed,verified,status,error)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO UPDATE SET
           finished_at=EXCLUDED.finished_at, claimed=EXCLUDED.claimed,
           verified=EXCLUDED.verified, status=EXCLUDED.status, error=EXCLUDED.error`,
        [
          result.id, result.runId, result.stepId, result.index, result.tool,
          result.intent, result.risk, JSON.stringify(result.args ?? {}), result.attempt,
          result.startedAt || null, result.finishedAt,
          result.claimed, result.verified ? JSON.stringify(result.verified) : null,
          result.status, result.error
        ]
      );
      return;
    } catch {
      /* fall through */
    }
  }
  return store.upsertStep(result);
}

export async function isCancelRequested(id: string): Promise<boolean> {
  if (enabled()) {
    try {
      const p = await db();
      const r = await p.query(`SELECT cancel_requested FROM agent_runs WHERE id=$1 LIMIT 1`, [id]);
      return Boolean(r.rows[0]?.cancel_requested);
    } catch {
      /* fall through */
    }
  }
  return store.isCancelRequested(id);
}

export async function requestCancel(id: string): Promise<void> {
  if (enabled()) {
    try {
      const p = await db();
      await p.query(`UPDATE agent_runs SET cancel_requested=true WHERE id=$1`, [id]);
      return;
    } catch {
      /* fall through */
    }
  }
  return store.requestCancel(id);
}

export async function listByWorkspace(workspaceId: string, limit = 20): Promise<AgentRun[]> {
  if (enabled()) {
    try {
      const p = await db();
      const rr = await p.query(
        `SELECT * FROM agent_runs WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT $2`,
        [workspaceId, limit]
      );
      const out: AgentRun[] = [];
      for (const row of rr.rows) {
        const sr = await p.query(`SELECT * FROM agent_run_steps WHERE run_id=$1 ORDER BY idx ASC, attempt ASC`, [row.id]);
        out.push(rowToRun(row, sr.rows.map(rowToStep)));
      }
      return out;
    } catch {
      /* fall through */
    }
  }
  return store.listByWorkspace(workspaceId, limit);
}

// The RunStore port the loop consumes.
export const runStore: RunStore = {
  createRun,
  saveRun,
  getRun,
  upsertStep,
  isCancelRequested,
  requestCancel
};

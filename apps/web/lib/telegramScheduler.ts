import crypto from "node:crypto";
import { getRuntimeFlags } from "@/lib/runtimeFlags";
import type { Principal } from "@/lib/telegramGuard";
import { resolveBoundAccount, telegramMutationsEnabled } from "@/lib/telegramGuard";
import { assertChatBelongsToBoundAccount, sendTextThroughSlot } from "@/lib/telegramBindingService";
import * as ap from "@/lib/telegramSendApprovals";

type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicSchedulerPool?: PgPool | null; __epicSchedulerInit?: Promise<void> };

export const JOB_STATUSES = new Set([
  "DRAFT", "PENDING_APPROVAL", "APPROVED", "SCHEDULED", "RUNNING", "SENT", "FAILED", "CANCELLED", "EXPIRED",
]);

export type ScheduledJob = {
  id: string;
  principalId: string;
  workspaceId: string;
  telegramAccountId: string;
  accountSlot: string;
  chatId: string;
  actionType: string;
  payloadJson: Record<string, unknown>;
  payloadHash: string;
  approvalId: string;
  scheduledAt: string;
  timezone: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lockedAt: string | null;
  lockedBy: string | null;
  lastError: string | null;
  telegramMessageId: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
};

function nowIso() { return new Date().toISOString(); }
function uuid() { return crypto.randomUUID(); }
function sha256(s: string) { return crypto.createHash("sha256").update(String(s)).digest("hex"); }

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
  if (g.__epicSchedulerPool !== undefined) return g.__epicSchedulerPool;
  const pg = await loadPg() as { Pool?: new (c: unknown) => PgPool; default?: { Pool: new (c: unknown) => PgPool } } | null;
  const Pool = pg?.Pool ?? pg?.default?.Pool;
  if (!Pool) {
    g.__epicSchedulerPool = null;
    return null;
  }
  g.__epicSchedulerPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 4000 });
  return g.__epicSchedulerPool;
}

async function ensureInit(p: PgPool): Promise<void> {
  if (g.__epicSchedulerInit) return g.__epicSchedulerInit;
  g.__epicSchedulerInit = (async () => {
    await p.query(`
      CREATE TABLE IF NOT EXISTS epicgram_scheduled_jobs (
        id uuid PRIMARY KEY,
        principal_id text NOT NULL,
        workspace_id text NOT NULL,
        telegram_account_id text NOT NULL,
        account_slot text NOT NULL,
        chat_id text NOT NULL,
        action_type text NOT NULL,
        payload_json jsonb NOT NULL,
        payload_hash text NOT NULL,
        approval_id text NOT NULL,
        scheduled_at timestamptz NOT NULL,
        timezone text NOT NULL DEFAULT 'UTC',
        status text NOT NULL,
        attempts int NOT NULL DEFAULT 0,
        max_attempts int NOT NULL DEFAULT 3,
        locked_at timestamptz,
        locked_by text,
        last_error text,
        telegram_message_id text,
        idempotency_key text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        cancelled_at timestamptz,
        completed_at timestamptz
      )
    `);
    await p.query(`CREATE INDEX IF NOT EXISTS esj_workspace_idx ON epicgram_scheduled_jobs(workspace_id, principal_id)`);
    await p.query(`CREATE INDEX IF NOT EXISTS esj_due_idx ON epicgram_scheduled_jobs(status, scheduled_at)`);
    await p.query(`CREATE INDEX IF NOT EXISTS esj_approval_idx ON epicgram_scheduled_jobs(approval_id)`);
  })();
  return g.__epicSchedulerInit;
}

async function db(): Promise<PgPool> {
  const p = await pool();
  if (!p) throw new Error("scheduler_db_unavailable");
  await ensureInit(p);
  return p;
}

function rowToJob(r: Row): ScheduledJob {
  return {
    id: String(r.id),
    principalId: String(r.principal_id),
    workspaceId: String(r.workspace_id),
    telegramAccountId: String(r.telegram_account_id),
    accountSlot: String(r.account_slot),
    chatId: String(r.chat_id),
    actionType: String(r.action_type),
    payloadJson: (typeof r.payload_json === "object" && r.payload_json ? r.payload_json : {}) as Record<string, unknown>,
    payloadHash: String(r.payload_hash),
    approvalId: String(r.approval_id),
    scheduledAt: new Date(r.scheduled_at as string).toISOString(),
    timezone: String(r.timezone ?? "UTC"),
    status: String(r.status),
    attempts: Number(r.attempts ?? 0),
    maxAttempts: Number(r.max_attempts ?? 3),
    lockedAt: r.locked_at ? new Date(r.locked_at as string).toISOString() : null,
    lockedBy: r.locked_by ? String(r.locked_by) : null,
    lastError: r.last_error ? String(r.last_error) : null,
    telegramMessageId: r.telegram_message_id ? String(r.telegram_message_id) : null,
    idempotencyKey: String(r.idempotency_key),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
    cancelledAt: r.cancelled_at ? new Date(r.cancelled_at as string).toISOString() : null,
    completedAt: r.completed_at ? new Date(r.completed_at as string).toISOString() : null,
  };
}

function payloadFromInput(input: { actionType: string; text?: string | null; mediaRef?: string | null; caption?: string | null }) {
  return {
    text: input.text ?? null,
    mediaRef: input.mediaRef ?? null,
    caption: input.caption ?? null,
  };
}

function idempotencyFor(input: {
  workspaceId: string; userId: string; accountId: string; chatId: string; actionType: string; payloadHash: string; scheduledAt: string; approvalId: string;
}) {
  return sha256(JSON.stringify(input));
}

export async function createScheduledJob(principal: Principal, input: {
  chatId: string;
  actionType: string;
  text?: string | null;
  mediaRef?: string | null;
  caption?: string | null;
  scheduledAt: string;
  timezone?: string;
  approvalId: string;
  approvalToken: string;
  maxAttempts?: number;
}): Promise<{ ok: true; job: ScheduledJob } | { ok: false; status: number; reason: string }> {
  if (!enabled()) return { ok: false, status: 503, reason: "scheduler_db_unavailable" };
  const flags = getRuntimeFlags();
  if (!flags.schedulerEnabled) return { ok: false, status: 503, reason: "scheduler_disabled" };
  if (!telegramMutationsEnabled() || !flags.telegramSendEnabled) return { ok: false, status: 403, reason: "telegram_mutation_disabled" };

  const scheduled = new Date(input.scheduledAt);
  if (!Number.isFinite(scheduled.getTime())) return { ok: false, status: 400, reason: "invalid_scheduled_at" };

  const bound = await resolveBoundAccount(principal);
  if (bound.kind !== "ok") return { ok: false, status: 403, reason: bound.kind === "mismatch" ? "owner_mismatch" : "no_binding" };
  const accountId = bound.accountId;

  const ownedChat = await assertChatBelongsToBoundAccount(principal, input.chatId);
  if (!ownedChat.ok) return { ok: false, status: 403, reason: ownedChat.reason };
  if (ownedChat.accountId !== accountId) return { ok: false, status: 403, reason: "account_mismatch" };

  const actionType = input.actionType || "send_text";
  if (!ap.ALL_ACTIONS.has(actionType)) return { ok: false, status: 400, reason: "unknown_action" };
  if (ap.MEDIA_ACTIONS.has(actionType)) return { ok: false, status: 501, reason: "scheduler_media_unsupported" };
  const text = typeof input.text === "string" ? input.text : "";
  if (!text.trim()) return { ok: false, status: 400, reason: "text_required" };
  if (!(await ap.isAllowed({ userId: principal.userId, accountId, chatId: input.chatId, actionType }))) {
    return { ok: false, status: 403, reason: "not_allowlisted" };
  }

  const approval = await ap.getApproval(input.approvalId);
  if (!approval) return { ok: false, status: 404, reason: "approval_not_found" };
  if (approval.userId !== principal.userId || approval.workspaceId !== principal.workspaceId) return { ok: false, status: 403, reason: "not_your_approval" };
  if (approval.accountId !== accountId) return { ok: false, status: 403, reason: "approval_account_mismatch" };
  if (approval.chatId !== String(input.chatId) || approval.actionType !== actionType) return { ok: false, status: 409, reason: "approval_payload_mismatch" };
  if (approval.tokenHash !== ap.sha256(input.approvalToken)) return { ok: false, status: 403, reason: "bad_approval_token" };
  if (ap.isExpired(approval)) { await ap.markExpired(approval.id); return { ok: false, status: 409, reason: "approval_expired" }; }
  if (approval.status !== "confirmed") return { ok: false, status: 409, reason: "approval_not_confirmed" };

  const payload = payloadFromInput(input);
  const payloadHash = ap.payloadHash({ accountId, chatId: input.chatId, actionType, text, mediaRef: input.mediaRef ?? null, caption: input.caption ?? null });
  if (payloadHash !== approval.payloadHash) return { ok: false, status: 409, reason: "payload_hash_mismatch" };

  const p = await db();
  const id = uuid();
  const idem = idempotencyFor({ workspaceId: principal.workspaceId, userId: principal.userId, accountId, chatId: input.chatId, actionType, payloadHash, scheduledAt: scheduled.toISOString(), approvalId: approval.id });
  const r = await p.query(
    `INSERT INTO epicgram_scheduled_jobs
       (id, principal_id, workspace_id, telegram_account_id, account_slot, chat_id, action_type, payload_json, payload_hash, approval_id, scheduled_at, timezone, status, max_attempts, idempotency_key)
     VALUES ($1,$2,$3,$4,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,'SCHEDULED',$12,$13)
     ON CONFLICT (idempotency_key) DO UPDATE SET updated_at=now()
     RETURNING *`,
    [
      id, principal.userId, principal.workspaceId, accountId, input.chatId, actionType,
      JSON.stringify(payload), payloadHash, approval.id, scheduled.toISOString(), input.timezone || "UTC",
      Math.max(1, Math.min(10, Number(input.maxAttempts ?? 3))), idem,
    ],
  );
  const job = rowToJob(r.rows[0]);
  await ap.audit({ approvalId: approval.id, workspaceId: principal.workspaceId, userId: principal.userId, accountId, chatId: input.chatId, actionType, payloadHash, stage: "schedule_create", outcome: "ok" });
  return { ok: true, job };
}

export async function listJobs(principal: Principal): Promise<{ ok: true; jobs: ScheduledJob[] } | { ok: false; status: number; reason: string }> {
  if (!enabled()) return { ok: false, status: 503, reason: "scheduler_db_unavailable" };
  const p = await db();
  const r = await p.query(
    `SELECT * FROM epicgram_scheduled_jobs WHERE workspace_id=$1 AND principal_id=$2 ORDER BY scheduled_at DESC LIMIT 100`,
    [principal.workspaceId, principal.userId],
  );
  return { ok: true, jobs: r.rows.map(rowToJob) };
}

export async function cancelJob(principal: Principal, jobId: string): Promise<{ ok: true; job: ScheduledJob } | { ok: false; status: number; reason: string }> {
  if (!enabled()) return { ok: false, status: 503, reason: "scheduler_db_unavailable" };
  const p = await db();
  const r = await p.query(
    `UPDATE epicgram_scheduled_jobs
       SET status='CANCELLED', cancelled_at=now(), updated_at=now()
     WHERE id=$1 AND workspace_id=$2 AND principal_id=$3 AND status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SCHEDULED')
     RETURNING *`,
    [jobId, principal.workspaceId, principal.userId],
  );
  if (!r.rows[0]) return { ok: false, status: 404, reason: "job_not_found_or_not_cancellable" };
  const job = rowToJob(r.rows[0]);
  await ap.audit({ approvalId: job.approvalId, workspaceId: principal.workspaceId, userId: principal.userId, accountId: job.telegramAccountId, chatId: job.chatId, actionType: job.actionType, payloadHash: job.payloadHash, stage: "schedule_cancel", outcome: "ok" });
  return { ok: true, job };
}

export async function claimDueJobs(workerId: string, limit = 5): Promise<ScheduledJob[]> {
  if (!enabled()) return [];
  const p = await db();
  const r = await p.query(
    `WITH due AS (
       SELECT id FROM epicgram_scheduled_jobs
       WHERE status='SCHEDULED' AND scheduled_at <= now() AND attempts < max_attempts
       ORDER BY scheduled_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE epicgram_scheduled_jobs j
       SET status='RUNNING', locked_at=now(), locked_by=$2, attempts=attempts+1, updated_at=now()
     FROM due
     WHERE j.id=due.id
     RETURNING j.*`,
    [Math.max(1, Math.min(25, limit)), workerId],
  );
  return r.rows.map(rowToJob);
}

async function markJob(id: string, status: string, patch: { lastError?: string | null; telegramMessageId?: string | null } = {}) {
  const p = await db();
  const r = await p.query(
    `UPDATE epicgram_scheduled_jobs
       SET status=$2, last_error=$3, telegram_message_id=COALESCE($4, telegram_message_id),
           completed_at=CASE WHEN $2 IN ('SENT','FAILED','EXPIRED') THEN now() ELSE completed_at END,
           locked_at=NULL, locked_by=NULL, updated_at=now()
     WHERE id=$1
     RETURNING *`,
    [id, status, patch.lastError ?? null, patch.telegramMessageId ?? null],
  );
  return r.rows[0] ? rowToJob(r.rows[0]) : null;
}

export async function executeJob(job: ScheduledJob): Promise<ScheduledJob> {
  const principal = { userId: job.principalId, workspaceId: job.workspaceId, role: "owner" };
  try {
    const flags = getRuntimeFlags();
    if (!flags.schedulerEnabled) throw new Error("scheduler_disabled");
    if (!flags.telegramSendEnabled || !telegramMutationsEnabled()) throw new Error("telegram_mutation_disabled");

    const bound = await resolveBoundAccount(principal);
    if (bound.kind !== "ok") throw new Error(bound.kind === "mismatch" ? "owner_mismatch" : "no_binding");
    if (bound.accountId !== job.telegramAccountId) throw new Error("account_mismatch");

    const ownedChat = await assertChatBelongsToBoundAccount(principal, job.chatId);
    if (!ownedChat.ok) throw new Error(ownedChat.reason);
    if (ownedChat.accountId !== job.telegramAccountId) throw new Error("account_mismatch");
    if (!(await ap.isAllowed({ userId: job.principalId, accountId: job.telegramAccountId, chatId: job.chatId, actionType: job.actionType }))) {
      throw new Error("not_allowlisted");
    }

    const approval = await ap.getApproval(job.approvalId);
    if (!approval) throw new Error("approval_not_found");
    if (ap.isExpired(approval)) {
      await ap.markExpired(approval.id);
      const expired = await markJob(job.id, "EXPIRED", { lastError: "approval_expired" });
      return expired ?? job;
    }
    if (approval.status !== "confirmed") throw new Error(`approval_${approval.status}`);

    const text = typeof job.payloadJson.text === "string" ? job.payloadJson.text : "";
    const payloadHash = ap.payloadHash({ accountId: job.telegramAccountId, chatId: job.chatId, actionType: job.actionType, text, mediaRef: null, caption: null });
    if (payloadHash !== job.payloadHash || payloadHash !== approval.payloadHash) throw new Error("payload_hash_mismatch");

    const consumed = await ap.consumeApproval(approval.id);
    if (!consumed) throw new Error("approval_replay_or_consumed");

    const sent = await sendTextThroughSlot(job.telegramAccountId, job.chatId, text, job.actionType);
    if (!sent.ok) {
      const failedAfterConsume = await markJob(job.id, "FAILED", { lastError: sent.message || sent.code || "send_failed" });
      await ap.audit({ approvalId: job.approvalId, workspaceId: job.workspaceId, userId: job.principalId, accountId: job.telegramAccountId, chatId: job.chatId, actionType: job.actionType, payloadHash: job.payloadHash, stage: "schedule_execute", outcome: "failed", errorCode: sent.message || sent.code || "send_failed" });
      return failedAfterConsume ?? job;
    }

    await ap.audit({ approvalId: job.approvalId, workspaceId: job.workspaceId, userId: job.principalId, accountId: job.telegramAccountId, chatId: job.chatId, actionType: job.actionType, payloadHash: job.payloadHash, stage: "schedule_execute", outcome: "ok", telegramMessageId: sent.telegramMessageId });
    return (await markJob(job.id, "SENT", { telegramMessageId: sent.telegramMessageId })) ?? job;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const nextStatus = job.attempts >= job.maxAttempts ? "FAILED" : "SCHEDULED";
    await ap.audit({ approvalId: job.approvalId, workspaceId: job.workspaceId, userId: job.principalId, accountId: job.telegramAccountId, chatId: job.chatId, actionType: job.actionType, payloadHash: job.payloadHash, stage: "schedule_execute", outcome: "failed", errorCode: message });
    return (await markJob(job.id, nextStatus, { lastError: message })) ?? job;
  }
}

export async function runSchedulerTick(input: { workerId?: string; limit?: number } = {}): Promise<{ ok: true; workerId: string; claimed: number; jobs: ScheduledJob[] } | { ok: false; reason: string }> {
  if (!enabled()) return { ok: false, reason: "scheduler_db_unavailable" };
  if (!getRuntimeFlags().schedulerEnabled) return { ok: false, reason: "scheduler_disabled" };
  const workerId = input.workerId || `worker_${process.pid}_${Date.now().toString(36)}`;
  const due = await claimDueJobs(workerId, input.limit ?? 5);
  const jobs = [];
  for (const job of due) jobs.push(await executeJob(job));
  return { ok: true, workerId, claimed: due.length, jobs };
}

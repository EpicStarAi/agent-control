// telegramSendApprovals.ts — Etap 2 per-account send approval gate.
// Single-use, TTL-bound approvals cryptographically tied to
// user + account slot + chat + action + immutable payload hash. Postgres-backed
// (DATABASE_URL). No message body / secrets / raw token ever stored.

import crypto from "node:crypto";
import { approvalStorageUnavailableReason, isLocalApprovalFallbackAllowed } from "./localApprovalFallback.js";
import * as store from "./telegramSendApprovalsStore.js";

type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicSendPool?: PgPool | null };

export function enabled(): boolean { return Boolean(process.env.DATABASE_URL); }
export function fallbackAllowed(): boolean { return !enabled() && isLocalApprovalFallbackAllowed(); }
export class ApprovalStorageUnavailableError extends Error {
  status = 503;
  constructor() { super(approvalStorageUnavailableReason()); }
}
function assertStorageAvailable(): void {
  if (!enabled() && !fallbackAllowed()) throw new ApprovalStorageUnavailableError();
}
export function isApprovalStorageUnavailable(error: unknown): boolean {
  return error instanceof ApprovalStorageUnavailableError || (error instanceof Error && /approval_.*unavailable|approval_db_required/.test(error.message));
}
async function loadPg(): Promise<unknown | null> { try { const n = "pg"; return await import(/* webpackIgnore: true */ n); } catch { return null; } }
async function pool(): Promise<PgPool | null> {
  if (!enabled()) return null;
  if (g.__epicSendPool !== undefined) return g.__epicSendPool;
  const pg = await loadPg() as { Pool?: new (c: unknown) => PgPool; default?: { Pool: new (c: unknown) => PgPool } } | null;
  const Pool = pg?.Pool ?? pg?.default?.Pool;
  if (!Pool) { g.__epicSendPool = null; return null; }
  g.__epicSendPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 4000 });
  return g.__epicSendPool;
}
async function db(): Promise<PgPool> { const p = await pool(); if (!p) throw new Error("pg unavailable"); return p; }
async function ensureInit(p: PgPool): Promise<void> {
  await p.query(`
    CREATE TABLE IF NOT EXISTS epicgram_chat_allowlist (
      id uuid PRIMARY KEY,
      principal_id text NOT NULL,
      workspace_id text NOT NULL,
      telegram_account_id text NOT NULL,
      account_slot text NOT NULL,
      chat_id text NOT NULL,
      action_type text NOT NULL DEFAULT 'send_text',
      chat_title text,
      added_at timestamptz NOT NULL DEFAULT now(),
      added_by text NOT NULL,
      revoked_at timestamptz
    )
  `);
  await p.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS eg_chat_allowlist_active_idx
      ON epicgram_chat_allowlist(principal_id, workspace_id, telegram_account_id, account_slot, chat_id, action_type)
      WHERE revoked_at IS NULL
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS epicgram_action_approvals (
      id uuid PRIMARY KEY,
      token_hash text NOT NULL,
      principal_id text NOT NULL,
      workspace_id text NOT NULL,
      telegram_account_id text NOT NULL,
      account_slot text NOT NULL,
      chat_id text NOT NULL,
      action_type text NOT NULL,
      payload_hash text NOT NULL,
      payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
      preview text,
      requires_second_confirm boolean NOT NULL DEFAULT false,
      confirm_stage text NOT NULL DEFAULT 'pending',
      status text NOT NULL DEFAULT 'PENDING',
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      confirmed_at timestamptz,
      used_at timestamptz,
      telegram_message_id text,
      audit_id text
    )
  `);
  await p.query(`CREATE INDEX IF NOT EXISTS eg_action_approvals_owner_idx ON epicgram_action_approvals(workspace_id, principal_id, telegram_account_id)`);
  await p.query(`CREATE INDEX IF NOT EXISTS eg_action_approvals_status_idx ON epicgram_action_approvals(status, expires_at)`);
  await p.query(`
    CREATE TABLE IF NOT EXISTS epicgram_action_audit (
      id text PRIMARY KEY,
      at timestamptz NOT NULL DEFAULT now(),
      approval_id uuid,
      workspace_id text,
      principal_id text,
      telegram_account_id text,
      telegram_user_id text,
      chat_id text,
      action_type text,
      payload_hash text,
      confirm_stage text,
      stage text NOT NULL,
      outcome text NOT NULL,
      error_code text,
      telegram_message_id text
    )
  `);
  await p.query(`CREATE INDEX IF NOT EXISTS eg_action_audit_approval_idx ON epicgram_action_audit(approval_id)`);
  await p.query(`CREATE INDEX IF NOT EXISTS eg_action_audit_owner_idx ON epicgram_action_audit(workspace_id, principal_id)`);
}
async function pdb(): Promise<PgPool> { const p = await db(); await ensureInit(p); return p; }

export function sha256(s: string): string { return crypto.createHash("sha256").update(String(s)).digest("hex"); }
export function newId(p: string): string { return `${p}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`; }
function uuid(): string { return crypto.randomUUID(); }
export function newToken(): string { return crypto.randomBytes(24).toString("hex"); }
function nowIso(): string { return new Date().toISOString(); }
function dbStatus(status: string): string {
  if (status === "pending") return "PENDING";
  if (status === "confirmed") return "CONFIRMED";
  if (status === "consumed") return "USED";
  if (status === "expired") return "EXPIRED";
  if (status === "rejected") return "DENIED";
  if (status === "failed") return "FAILED";
  if (status === "executing") return "EXECUTING";
  return status.toUpperCase();
}
function apiStatus(status: unknown): string {
  const s = String(status || "").toUpperCase();
  if (s === "PENDING") return "pending";
  if (s === "CONFIRMED") return "confirmed";
  if (s === "USED") return "consumed";
  if (s === "DENIED") return "rejected";
  if (s === "EXPIRED") return "expired";
  if (s === "FAILED") return "failed";
  if (s === "EXECUTING") return "executing";
  return String(status || "");
}

export const TTL_MS = 5 * 60 * 1000;
export const MEDIA_ACTIONS = new Set(["send_photo", "send_video", "send_document"]);
export const DOUBLE_CONFIRM_ACTIONS = new Set(["publish_channel", "forward", "bulk_send", "edit_published", "delete_published"]);
export const ALL_ACTIONS = new Set<string>(["send_text", "publish_channel", "forward", "bulk_send", "edit_published", "delete_published", "send_photo", "send_video", "send_document"]);

export type SendPayload = {
  accountId: string; chatId: string; actionType: string;
  text?: string | null; mediaRef?: string | null; caption?: string | null;
};
export function canonicalPayload(p: SendPayload): string {
  return JSON.stringify({
    v: 1,
    accountId: p.accountId,
    chatId: String(p.chatId),
    actionType: p.actionType,
    text: p.text ?? null,
    mediaRef: p.mediaRef ?? null,
    caption: p.caption ?? null,
  });
}
export function payloadHash(p: SendPayload): string { return sha256(canonicalPayload(p)); }

export async function isAllowed(a: { userId: string; accountId: string; chatId: string; actionType: string }): Promise<boolean> {
  assertStorageAvailable();
  if (!enabled()) return store.isAllowed(a);
  const p = await pdb();
  const r = await p.query(
    `SELECT 1 FROM epicgram_chat_allowlist
     WHERE principal_id=$1 AND telegram_account_id=$2 AND account_slot=$2 AND chat_id=$3 AND action_type=$4 AND revoked_at IS NULL
     LIMIT 1`,
    [a.userId, a.accountId, String(a.chatId), a.actionType],
  );
  return r.rows.length > 0;
}
export async function addAllowlist(a: { workspaceId: string; userId: string; accountId: string; chatId: string; actionType: string; label?: string }): Promise<void> {
  assertStorageAvailable();
  if (!enabled()) {
    await store.addAllowlist({ id: newId("al"), ...a, at: nowIso() });
    return;
  }
  const p = await pdb();
  const id = uuid();
  await p.query(
    `INSERT INTO epicgram_chat_allowlist
       (id, principal_id, workspace_id, telegram_account_id, account_slot, chat_id, action_type, chat_title, added_by, revoked_at)
     VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$2,NULL)
     ON CONFLICT (principal_id, workspace_id, telegram_account_id, account_slot, chat_id, action_type)
     WHERE revoked_at IS NULL
     DO UPDATE SET chat_title=EXCLUDED.chat_title, added_at=now(), added_by=EXCLUDED.added_by, revoked_at=NULL`,
    [id, a.userId, a.workspaceId, a.accountId, String(a.chatId), a.actionType, a.label ?? null],
  );
}

export type ApprovalRow = {
  id: string; workspaceId: string; userId: string; accountId: string; chatId: string;
  actionType: string; payloadHash: string; preview: string | null;
  requiresSecondConfirm: boolean; confirmStage: string; status: string;
  createdAt: string; expiresAt: string; tokenHash: string;
};
function toApproval(r: Row): ApprovalRow {
  return {
    id: r.id as string, workspaceId: r.workspace_id as string, userId: (r.user_id ?? r.principal_id) as string,
    accountId: (r.tdlib_account_id ?? r.telegram_account_id) as string, chatId: r.chat_id as string, actionType: r.action_type as string,
    payloadHash: r.payload_hash as string, preview: (r.preview as string) ?? null,
    requiresSecondConfirm: Boolean(r.requires_second_confirm), confirmStage: r.confirm_stage as string,
    status: apiStatus(r.status), createdAt: new Date(r.created_at as string).toISOString(),
    expiresAt: new Date(r.expires_at as string).toISOString(), tokenHash: r.token_hash as string,
  };
}
export async function createApproval(input: {
  workspaceId: string; userId: string; accountId: string; chatId: string; actionType: string;
  payloadHash: string; preview: string; requiresSecondConfirm: boolean;
}): Promise<{ id: string; token: string; expiresAt: string }> {
  assertStorageAvailable();
  const id = enabled() ? uuid() : newId("ap"); const token = newToken();
  const created = new Date(); const expires = new Date(created.getTime() + TTL_MS);
  if (!enabled()) {
    await store.createApproval({
      id,
      token_hash: sha256(token),
      workspace_id: input.workspaceId,
      user_id: input.userId,
      tdlib_account_id: input.accountId,
      chat_id: String(input.chatId),
      action_type: input.actionType,
      payload_hash: input.payloadHash,
      preview: input.preview,
      requires_second_confirm: input.requiresSecondConfirm,
      confirm_stage: "pending",
      status: "pending",
      created_at: created.toISOString(),
      expires_at: expires.toISOString(),
      consumed_at: null,
    });
    return { id, token, expiresAt: expires.toISOString() };
  }
  const p = await pdb();
  await p.query(
    `INSERT INTO epicgram_action_approvals
       (id, token_hash, principal_id, workspace_id, telegram_account_id, account_slot, chat_id, action_type,
        payload_hash, payload_json, preview, requires_second_confirm, confirm_stage, status, created_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8,$9::jsonb,$10,$11,'pending','PENDING',$12,$13)`,
    [
      id, sha256(token), input.userId, input.workspaceId, input.accountId, String(input.chatId),
      input.actionType, input.payloadHash, JSON.stringify({ payloadHash: input.payloadHash }),
      input.preview, input.requiresSecondConfirm, created.toISOString(), expires.toISOString(),
    ],
  );
  return { id, token, expiresAt: expires.toISOString() };
}
export async function getApproval(id: string): Promise<ApprovalRow | null> {
  assertStorageAvailable();
  if (!enabled()) {
    const r = await store.getApproval(id);
    return r ? toApproval(r) : null;
  }
  const p = await pdb();
  const r = await p.query("SELECT * FROM epicgram_action_approvals WHERE id=$1", [id]);
  return r.rows[0] ? toApproval(r.rows[0]) : null;
}
export async function setStage(id: string, confirmStage: string, status: string): Promise<void> {
  assertStorageAvailable();
  if (!enabled()) return store.setStage(id, confirmStage, status);
  const p = await pdb();
  await p.query(
    `UPDATE epicgram_action_approvals
       SET confirm_stage=$2, status=$3, confirmed_at=CASE WHEN $3='CONFIRMED' THEN now() ELSE confirmed_at END
     WHERE id=$1`,
    [id, confirmStage, dbStatus(status)],
  );
}
export async function consumeApproval(id: string): Promise<boolean> {
  assertStorageAvailable();
  if (!enabled()) return store.consumeApproval(id, nowIso());
  const p = await pdb();
  await p.query("BEGIN");
  try {
    const locked = await p.query(
      "SELECT id,status,expires_at FROM epicgram_action_approvals WHERE id=$1 FOR UPDATE",
      [id],
    );
    const row = locked.rows[0];
    if (!row || apiStatus(row.status) !== "confirmed" || new Date(row.expires_at as string).getTime() < Date.now()) {
      await p.query("ROLLBACK");
      return false;
    }
    const r = await p.query(
      "UPDATE epicgram_action_approvals SET status='USED', used_at=now() WHERE id=$1 AND status='CONFIRMED' RETURNING id",
      [id],
    );
    await p.query("COMMIT");
    return r.rows.length > 0;
  } catch (error) {
    await p.query("ROLLBACK").catch(() => {});
    throw error;
  }
}
export async function markExpired(id: string): Promise<void> {
  assertStorageAvailable();
  if (!enabled()) return store.markExpired(id);
  const p = await pdb();
  await p.query("UPDATE epicgram_action_approvals SET status='EXPIRED' WHERE id=$1 AND status NOT IN ('USED','EXPIRED')", [id]);
}
export function isExpired(a: ApprovalRow): boolean { return new Date(a.expiresAt).getTime() < Date.now(); }

export async function audit(input: {
  approvalId?: string | null; workspaceId?: string | null; userId?: string | null; accountId?: string | null;
  telegramUserId?: string | null; chatId?: string | null; actionType?: string | null; payloadHash?: string | null;
  confirmStage?: string | null; stage: string; outcome: string; errorCode?: string | null; telegramMessageId?: string | null;
}): Promise<string | null> {
  try {
    assertStorageAvailable();
    const auditId = newId("aud");
    if (!enabled()) {
      await store.audit({
        id: auditId,
        at: nowIso(),
        approval_id: input.approvalId ?? null,
        workspace_id: input.workspaceId ?? null,
        user_id: input.userId ?? null,
        tdlib_account_id: input.accountId ?? null,
        telegram_user_id: input.telegramUserId ?? null,
        chat_id: input.chatId ?? null,
        action_type: input.actionType ?? null,
        payload_hash: input.payloadHash ?? null,
        confirm_stage: input.confirmStage ?? null,
        stage: input.stage,
        outcome: input.outcome,
        error_code: input.errorCode ?? null,
        telegram_message_id: input.telegramMessageId ?? null,
      });
      return auditId;
    }
    const p = await pdb();
    await p.query(
      `INSERT INTO epicgram_action_audit
        (id,at,approval_id,workspace_id,principal_id,telegram_account_id,telegram_user_id,chat_id,action_type,payload_hash,confirm_stage,stage,outcome,error_code,telegram_message_id)
       VALUES($1,$2,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [auditId, nowIso(), input.approvalId ?? null, input.workspaceId ?? null, input.userId ?? null, input.accountId ?? null, input.telegramUserId ?? null, input.chatId ?? null, input.actionType ?? null, input.payloadHash ?? null, input.confirmStage ?? null, input.stage, input.outcome, input.errorCode ?? null, input.telegramMessageId ?? null],
    );
    if (input.approvalId) {
      await p.query(
        `UPDATE epicgram_action_approvals
           SET audit_id=$2, telegram_message_id=COALESCE($3, telegram_message_id)
         WHERE id=$1`,
        [input.approvalId, auditId, input.telegramMessageId ?? null],
      );
    }
    return auditId;
  } catch {
    return null;
  }
}

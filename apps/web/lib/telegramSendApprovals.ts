// telegramSendApprovals.ts — Etap 2 per-account send approval gate.
// Single-use, TTL-bound approvals cryptographically tied to
// user + account slot + chat + action + immutable payload hash. Postgres-backed
// (DATABASE_URL). No message body / secrets / raw token ever stored.

import crypto from "node:crypto";

type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicSendPool?: PgPool | null };

export function enabled(): boolean { return Boolean(process.env.DATABASE_URL); }
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

export function sha256(s: string): string { return crypto.createHash("sha256").update(String(s)).digest("hex"); }
export function newId(p: string): string { return `${p}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`; }
export function newToken(): string { return crypto.randomBytes(24).toString("hex"); }
function nowIso(): string { return new Date().toISOString(); }

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
  if (!enabled()) return false;
  const p = await db();
  const r = await p.query(
    "SELECT 1 FROM telegram_send_allowlist WHERE user_id=$1 AND tdlib_account_id=$2 AND chat_id=$3 AND action_type=$4 AND enabled=true LIMIT 1",
    [a.userId, a.accountId, String(a.chatId), a.actionType],
  );
  return r.rows.length > 0;
}
export async function addAllowlist(a: { workspaceId: string; userId: string; accountId: string; chatId: string; actionType: string; label?: string }): Promise<void> {
  const p = await db();
  await p.query(
    "INSERT INTO telegram_send_allowlist(id,workspace_id,user_id,tdlib_account_id,chat_id,action_type,label,enabled) VALUES($1,$2,$3,$4,$5,$6,$7,true) ON CONFLICT (user_id,tdlib_account_id,chat_id,action_type) DO UPDATE SET enabled=true, label=EXCLUDED.label",
    [newId("al"), a.workspaceId, a.userId, a.accountId, String(a.chatId), a.actionType, a.label ?? null],
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
    id: r.id as string, workspaceId: r.workspace_id as string, userId: r.user_id as string,
    accountId: r.tdlib_account_id as string, chatId: r.chat_id as string, actionType: r.action_type as string,
    payloadHash: r.payload_hash as string, preview: (r.preview as string) ?? null,
    requiresSecondConfirm: Boolean(r.requires_second_confirm), confirmStage: r.confirm_stage as string,
    status: r.status as string, createdAt: new Date(r.created_at as string).toISOString(),
    expiresAt: new Date(r.expires_at as string).toISOString(), tokenHash: r.token_hash as string,
  };
}
export async function createApproval(input: {
  workspaceId: string; userId: string; accountId: string; chatId: string; actionType: string;
  payloadHash: string; preview: string; requiresSecondConfirm: boolean;
}): Promise<{ id: string; token: string; expiresAt: string }> {
  const p = await db();
  const id = newId("ap"); const token = newToken();
  const created = new Date(); const expires = new Date(created.getTime() + TTL_MS);
  await p.query(
    "INSERT INTO telegram_send_approvals(id,token_hash,workspace_id,user_id,tdlib_account_id,chat_id,action_type,payload_hash,preview,requires_second_confirm,confirm_stage,status,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending','pending',$11,$12)",
    [id, sha256(token), input.workspaceId, input.userId, input.accountId, String(input.chatId), input.actionType, input.payloadHash, input.preview, input.requiresSecondConfirm, created.toISOString(), expires.toISOString()],
  );
  return { id, token, expiresAt: expires.toISOString() };
}
export async function getApproval(id: string): Promise<ApprovalRow | null> {
  const p = await db();
  const r = await p.query("SELECT * FROM telegram_send_approvals WHERE id=$1", [id]);
  return r.rows[0] ? toApproval(r.rows[0]) : null;
}
export async function setStage(id: string, confirmStage: string, status: string): Promise<void> {
  const p = await db();
  await p.query("UPDATE telegram_send_approvals SET confirm_stage=$2, status=$3 WHERE id=$1", [id, confirmStage, status]);
}
export async function consumeApproval(id: string): Promise<boolean> {
  const p = await db();
  const r = await p.query(
    "UPDATE telegram_send_approvals SET status='consumed', consumed_at=$2 WHERE id=$1 AND status='confirmed' RETURNING id",
    [id, nowIso()],
  );
  return r.rows.length > 0;
}
export async function markExpired(id: string): Promise<void> {
  const p = await db();
  await p.query("UPDATE telegram_send_approvals SET status='expired' WHERE id=$1 AND status NOT IN ('consumed','expired')", [id]);
}
export function isExpired(a: ApprovalRow): boolean { return new Date(a.expiresAt).getTime() < Date.now(); }

export async function audit(input: {
  approvalId?: string | null; workspaceId?: string | null; userId?: string | null; accountId?: string | null;
  telegramUserId?: string | null; chatId?: string | null; actionType?: string | null; payloadHash?: string | null;
  confirmStage?: string | null; stage: string; outcome: string; errorCode?: string | null; telegramMessageId?: string | null;
}): Promise<void> {
  try {
    const p = await db();
    await p.query(
      "INSERT INTO telegram_send_audit(id,at,approval_id,workspace_id,user_id,tdlib_account_id,telegram_user_id,chat_id,action_type,payload_hash,confirm_stage,stage,outcome,error_code,telegram_message_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)",
      [newId("aud"), nowIso(), input.approvalId ?? null, input.workspaceId ?? null, input.userId ?? null, input.accountId ?? null, input.telegramUserId ?? null, input.chatId ?? null, input.actionType ?? null, input.payloadHash ?? null, input.confirmStage ?? null, input.stage, input.outcome, input.errorCode ?? null, input.telegramMessageId ?? null],
    );
  } catch { /* audit is best-effort; never blocks a security decision */ }
}

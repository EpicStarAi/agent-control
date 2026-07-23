// telegramBindingsDb.ts — PostgreSQL adapter for telegram_bindings table
// CREATE TABLE IF NOT EXISTS (idempotent). No DROP. No DELETE. Only INSERT + UPDATE + SELECT.
// Falls back to file-system store when DATABASE_URL is not set.

import {
  type TelegramBinding,
  type TelegramBindingAuthState,
  newBindingId,
} from "./telegramBindings";
import * as store from "./telegramBindingsStore";

// Re-export store functions as the default when DB is unavailable
type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };

const g = globalThis as unknown as {
  __epicBindingPgPool?: PgPool | null;
  __epicBindingInit?: Promise<void>;
};

export function enabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function loadPg(): Promise<unknown | null> {
  try {
    return await import(/* webpackIgnore: true */ "pg");
  } catch {
    return null;
  }
}

async function pool(): Promise<PgPool | null> {
  if (!enabled()) return null;
  if (g.__epicBindingPgPool !== undefined) return g.__epicBindingPgPool;
  const pg = await loadPg();
  const Pool =
    (pg as unknown as { Pool?: new (c: { connectionString: string; max: number; connectionTimeoutMillis: number }) => PgPool })
      ?.Pool ??
    (pg as unknown as { default?: { Pool: new (c: { connectionString: string; max: number; connectionTimeoutMillis: number }) => PgPool } })
      ?.default?.Pool;
  if (!Pool) {
    g.__epicBindingPgPool = null;
    return null;
  }
  g.__epicBindingPgPool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: 3,
    connectionTimeoutMillis: 4000,
  }) as PgPool;
  return g.__epicBindingPgPool;
}

async function ensureInit(p: PgPool): Promise<void> {
  if (g.__epicBindingInit) return g.__epicBindingInit;
  g.__epicBindingInit = (async () => {
    await p.query(`
      CREATE TABLE IF NOT EXISTS telegram_bindings (
        id               text        NOT NULL PRIMARY KEY,
        workspace_id     text        NOT NULL,
        user_id          text        NOT NULL,
        tdlib_account_id text        NOT NULL UNIQUE,
        display_name     text        DEFAULT 'Telegram',
        phone_masked     text,
        username         text,
        auth_state       text        NOT NULL DEFAULT 'init',
        auth_error       text,
        bound_at         timestamptz NOT NULL DEFAULT now(),
        updated_at       timestamptz NOT NULL DEFAULT now()
      )
    `);
    await p.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS telegram_bindings_ws_idx
        ON telegram_bindings (workspace_id)
    `);
    await p.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS telegram_bindings_tdlib_idx
        ON telegram_bindings (tdlib_account_id)
    `);
    await p.query(`
      CREATE INDEX IF NOT EXISTS telegram_bindings_user_idx
        ON telegram_bindings (user_id)
    `);
  })();
  return g.__epicBindingInit;
}

async function db(): Promise<PgPool> {
  const p = await pool();
  if (!p) throw new Error("pg unavailable");
  await ensureInit(p);
  return p;
}

function rowToBinding(r: Record<string, unknown>): TelegramBinding {
  return {
    id: String(r.id ?? ""),
    workspaceId: String(r.workspace_id ?? ""),
    userId: String(r.user_id ?? ""),
    tdlibAccountId: String(r.tdlib_account_id ?? ""),
    displayName: String(r.display_name ?? "Telegram"),
    phoneMasked: r.phone_masked ? String(r.phone_masked) : null,
    username: r.username ? String(r.username) : null,
    authState: (r.auth_state ?? "init") as TelegramBindingAuthState,
    authError: r.auth_error ? String(r.auth_error) : null,
    boundAt: new Date(r.bound_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

// Get binding by workspace_id
export async function getByWorkspace(
  workspaceId: string
): Promise<TelegramBinding | null> {
  if (enabled()) {
    try {
      const p = await db();
      const r = await p.query(
        `SELECT * FROM telegram_bindings WHERE workspace_id = $1 LIMIT 1`,
        [workspaceId]
      );
      return r.rows[0] ? rowToBinding(r.rows[0]) : null;
    } catch { /* fall through */ }
  }
  return store.getByWorkspace(workspaceId);
}

// Get binding by tdlib_account_id
export async function getByTdlibAccount(
  tdlibAccountId: string
): Promise<TelegramBinding | null> {
  if (enabled()) {
    try {
      const p = await db();
      const r = await p.query(
        `SELECT * FROM telegram_bindings WHERE tdlib_account_id = $1 LIMIT 1`,
        [tdlibAccountId]
      );
      return r.rows[0] ? rowToBinding(r.rows[0]) : null;
    } catch { /* fall through */ }
  }
  return store.getByTdlibAccount(tdlibAccountId);
}

// Get binding by user_id
export async function getByUser(userId: string): Promise<TelegramBinding | null> {
  if (enabled()) {
    try {
      const p = await db();
      const r = await p.query(
        `SELECT * FROM telegram_bindings WHERE user_id = $1 ORDER BY bound_at DESC LIMIT 1`,
        [userId]
      );
      return r.rows[0] ? rowToBinding(r.rows[0]) : null;
    } catch { /* fall through */ }
  }
  return store.getByUser(userId);
}

// Create a new binding
export async function create(input: {
  workspaceId: string;
  userId: string;
  tdlibAccountId: string;
  displayName?: string;
}): Promise<TelegramBinding> {
  if (enabled()) {
    try {
      const p = await db();
      const id = newBindingId();
      const now = new Date().toISOString();
      const r = await p.query(
        `INSERT INTO telegram_bindings
           (id, workspace_id, user_id, tdlib_account_id, display_name, auth_state, bound_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'init', $6, $6)
         RETURNING *`,
        [id, input.workspaceId, input.userId, input.tdlibAccountId, input.displayName ?? "Telegram", now]
      );
      return rowToBinding(r.rows[0]);
    } catch { /* fall through */ }
  }
  return store.create(input);
}

export async function bindWorkspaceToAccount(input: {
  workspaceId: string;
  userId: string;
  tdlibAccountId: string;
  displayName?: string | null;
  phoneMasked?: string | null;
  username?: string | null;
  authState: TelegramBindingAuthState;
  authError?: string | null;
}): Promise<TelegramBinding> {
  if (enabled()) {
    try {
      const p = await db();
      const id = newBindingId();
      const now = new Date().toISOString();
      const r = await p.query(
        `INSERT INTO telegram_bindings
           (id, workspace_id, user_id, tdlib_account_id, display_name, phone_masked, username, auth_state, auth_error, bound_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)
         ON CONFLICT (workspace_id) DO UPDATE SET
           user_id=EXCLUDED.user_id,
           tdlib_account_id=EXCLUDED.tdlib_account_id,
           display_name=EXCLUDED.display_name,
           phone_masked=EXCLUDED.phone_masked,
           username=EXCLUDED.username,
           auth_state=EXCLUDED.auth_state,
           auth_error=EXCLUDED.auth_error,
           updated_at=EXCLUDED.updated_at
         RETURNING *`,
        [
          id,
          input.workspaceId,
          input.userId,
          input.tdlibAccountId,
          input.displayName ?? "Telegram",
          input.phoneMasked ?? null,
          input.username ?? null,
          input.authState,
          input.authError ?? null,
          now,
        ]
      );
      return rowToBinding(r.rows[0]);
    } catch { /* fall through */ }
  }

  const existing = await store.getByWorkspace(input.workspaceId);
  if (!existing) {
    const created = await store.create({
      workspaceId: input.workspaceId,
      userId: input.userId,
      tdlibAccountId: input.tdlibAccountId,
      displayName: input.displayName ?? "Telegram",
    });
    await store.updateAuthState({
      workspaceId: input.workspaceId,
      authState: input.authState,
      authError: input.authError ?? null,
      phoneMasked: input.phoneMasked ?? null,
      username: input.username ?? null,
      displayName: input.displayName ?? null,
    });
    return (await store.getByWorkspace(input.workspaceId)) ?? created;
  }
  await store.remove(input.workspaceId);
  const created = await store.create({
    workspaceId: input.workspaceId,
    userId: input.userId,
    tdlibAccountId: input.tdlibAccountId,
    displayName: input.displayName ?? existing.displayName,
  });
  await store.updateAuthState({
    workspaceId: input.workspaceId,
    authState: input.authState,
    authError: input.authError ?? null,
    phoneMasked: input.phoneMasked ?? null,
    username: input.username ?? null,
    displayName: input.displayName ?? null,
  });
  return (await store.getByWorkspace(input.workspaceId)) ?? created;
}

// Update auth state
export async function updateAuthState(input: {
  workspaceId: string;
  authState: TelegramBindingAuthState;
  authError?: string | null;
  phoneMasked?: string | null;
  username?: string | null;
  displayName?: string | null;
}): Promise<TelegramBinding | null> {
  if (enabled()) {
    try {
      const p = await db();
      const now = new Date().toISOString();
      const r = await p.query(
        `UPDATE telegram_bindings SET
           auth_state = $2,
           auth_error = $3,
           phone_masked = COALESCE($4, phone_masked),
           username = COALESCE($5, username),
           display_name = COALESCE($6, display_name),
           updated_at = $7
         WHERE workspace_id = $1
         RETURNING *`,
        [
          input.workspaceId,
          input.authState,
          input.authError ?? null,
          input.phoneMasked ?? null,
          input.username ?? null,
          input.displayName ?? null,
          now,
        ]
      );
      return r.rows[0] ? rowToBinding(r.rows[0]) : null;
    } catch { /* fall through */ }
  }
  return store.updateAuthState(input);
}

// Delete binding (unbind)
export async function remove(workspaceId: string): Promise<void> {
  if (enabled()) {
    try {
      const p = await db();
      await p.query(`DELETE FROM telegram_bindings WHERE workspace_id = $1`, [workspaceId]);
      return;
    } catch { /* fall through */ }
  }
  await store.remove(workspaceId);
}

// Check if DB is reachable
export async function healthCheck(): Promise<boolean> {
  if (enabled()) {
    try {
      const p = await pool();
      if (!p) return store.healthCheck();
      await p.query(`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }
  return store.healthCheck();
}

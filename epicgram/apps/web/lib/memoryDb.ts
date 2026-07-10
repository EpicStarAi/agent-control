import { normalizeEntry, type MemoryEntry, type MemoryScope } from "@/lib/memory";

// P34 Postgres adapter for memory_entries. CREATE TABLE/INDEX IF NOT EXISTS only.
// No DROP, no DELETE. Shares the global pg pool with the other layers.
type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicPgPool?: PgPool | null; __epicMemoryInit?: Promise<void> };

export function enabled(): boolean { return Boolean(process.env.DATABASE_URL); }
async function loadPg(): Promise<any | null> { try { const n = "pg"; return await import(/* webpackIgnore: true */ n); } catch { return null; } }
async function pool(): Promise<PgPool | null> {
  if (!enabled()) return null;
  if (g.__epicPgPool) return g.__epicPgPool;
  const pg = await loadPg(); const Pool = pg?.Pool ?? pg?.default?.Pool; if (!Pool) { g.__epicPgPool = null; return null; }
  g.__epicPgPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 4000 }) as PgPool;
  return g.__epicPgPool;
}
async function ensureInit(p: PgPool): Promise<void> {
  if (!g.__epicMemoryInit) g.__epicMemoryInit = (async () => {
    await p.query(`CREATE TABLE IF NOT EXISTS memory_entries (
      id text PRIMARY KEY, workspace_id text NOT NULL, scope text NOT NULL,
      key text NOT NULL, value text, updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS memory_entries_uq ON memory_entries(workspace_id, scope, key)`);
    await p.query(`CREATE INDEX IF NOT EXISTS memory_entries_ws ON memory_entries(workspace_id)`);
  })();
  return g.__epicMemoryInit;
}
async function db(): Promise<PgPool> { const p = await pool(); if (!p) throw new Error("pg unavailable"); await ensureInit(p); return p; }
function row(r: any): MemoryEntry { return { id: r.id, workspaceId: r.workspace_id, scope: (r.scope as MemoryScope) || "owner",
  key: r.key ?? "", value: r.value ?? "", updatedAt: new Date(r.updated_at).toISOString() }; }

export async function listMemory(workspaceId: string, scope?: MemoryScope): Promise<MemoryEntry[]> {
  const p = await db();
  const q = scope
    ? await p.query(`SELECT * FROM memory_entries WHERE workspace_id=$1 AND scope=$2 ORDER BY updated_at DESC`, [workspaceId, scope])
    : await p.query(`SELECT * FROM memory_entries WHERE workspace_id=$1 ORDER BY updated_at DESC`, [workspaceId]);
  return q.rows.map(row);
}
export async function addMemory(workspaceId: string, input: Partial<MemoryEntry>): Promise<{ ok: boolean; entry: MemoryEntry }> {
  const p = await db(); const n = normalizeEntry(workspaceId, input);
  const r = await p.query(
    `INSERT INTO memory_entries(id,workspace_id,scope,key,value,updated_at)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT (workspace_id,scope,key) DO UPDATE SET value=$5,updated_at=$6 RETURNING *`,
    [n.id, workspaceId, n.scope, n.key, n.value, n.updatedAt]
  );
  return { ok: true, entry: row(r.rows[0]) };
}

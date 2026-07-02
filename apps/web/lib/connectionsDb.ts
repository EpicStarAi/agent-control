import { normalizeConnection, type Connection } from "@/lib/connections";

// P36 Postgres adapter for connections. CREATE TABLE/INDEX IF NOT EXISTS only.
// No DROP, no DELETE. Shares the global pg pool. Stores only an opaque session_ref.
type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicPgPool?: PgPool | null; __epicConnInit?: Promise<void> };

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
  if (!g.__epicConnInit) g.__epicConnInit = (async () => {
    await p.query(`CREATE TABLE IF NOT EXISTS connections (
      id text PRIMARY KEY, workspace_id text NOT NULL, provider text NOT NULL,
      status text NOT NULL, session_ref text, updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS connections_uq ON connections(workspace_id, provider)`);
    await p.query(`CREATE INDEX IF NOT EXISTS connections_ws ON connections(workspace_id)`);
  })();
  return g.__epicConnInit;
}
async function db(): Promise<PgPool> { const p = await pool(); if (!p) throw new Error("pg unavailable"); await ensureInit(p); return p; }
function row(r: any): Connection { return { id: r.id, workspaceId: r.workspace_id, provider: r.provider,
  status: r.status, sessionRef: r.session_ref ?? "", updatedAt: new Date(r.updated_at).toISOString() }; }

export async function listConnections(workspaceId: string): Promise<Connection[]> {
  const p = await db();
  const q = await p.query(`SELECT * FROM connections WHERE workspace_id=$1 ORDER BY updated_at DESC`, [workspaceId]);
  return q.rows.map(row);
}
export async function setConnection(workspaceId: string, input: Partial<Connection>): Promise<{ ok: boolean; connection: Connection }> {
  const p = await db(); const n = normalizeConnection(workspaceId, input);
  const r = await p.query(
    `INSERT INTO connections(id,workspace_id,provider,status,session_ref,updated_at)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT (workspace_id,provider) DO UPDATE SET status=$4,session_ref=$5,updated_at=$6 RETURNING *`,
    [n.id, workspaceId, n.provider, n.status, n.sessionRef, n.updatedAt]
  );
  return { ok: true, connection: row(r.rows[0]) };
}

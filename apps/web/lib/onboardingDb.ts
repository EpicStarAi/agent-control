import { normalizeOnboarding, emptyOnboarding, type OnboardingState } from "@/lib/onboarding";

// Postgres adapter for workspace_onboarding. CREATE TABLE IF NOT EXISTS. No DROP/DELETE.
// Mirrors lib/profileDb.ts (same pool, same idempotent-init pattern).
type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicPgPool?: PgPool | null; __epicOnboardingInit?: Promise<void> };

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
  if (!g.__epicOnboardingInit) g.__epicOnboardingInit = (async () => {
    await p.query(`CREATE TABLE IF NOT EXISTS workspace_onboarding (
      workspace_id text PRIMARY KEY, step integer DEFAULT 0,
      completed boolean DEFAULT false, skipped boolean DEFAULT false,
      updated_at timestamptz DEFAULT now())`);
  })();
  return g.__epicOnboardingInit;
}
async function db(): Promise<PgPool> { const p = await pool(); if (!p) throw new Error("pg unavailable"); await ensureInit(p); return p; }
function row(r: any): OnboardingState { return {
  workspaceId: r.workspace_id, step: Number(r.step ?? 0), completed: Boolean(r.completed),
  skipped: Boolean(r.skipped), updatedAt: new Date(r.updated_at).toISOString() }; }

export async function getOnboarding(workspaceId: string): Promise<OnboardingState> {
  const p = await db();
  const r = (await p.query(`SELECT * FROM workspace_onboarding WHERE workspace_id=$1`, [workspaceId])).rows[0];
  return r ? row(r) : emptyOnboarding(workspaceId);
}
export async function saveOnboarding(workspaceId: string, input: Partial<OnboardingState>): Promise<{ ok: boolean; state: OnboardingState }> {
  const p = await db(); const n = normalizeOnboarding(workspaceId, input);
  const r = await p.query(
    `INSERT INTO workspace_onboarding(workspace_id,step,completed,skipped,updated_at)
     VALUES($1,$2,$3,$4,$5)
     ON CONFLICT (workspace_id) DO UPDATE SET step=$2,completed=$3,skipped=$4,updated_at=$5 RETURNING *`,
    [workspaceId, n.step, n.completed, n.skipped, n.updatedAt]
  );
  return { ok: true, state: row(r.rows[0]) };
}

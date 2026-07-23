import { normalizeProfile, emptyProfile, type WorkspaceProfile } from "@/lib/profile";

// P31 Postgres adapter for workspace_profiles. CREATE TABLE IF NOT EXISTS. No DROP/DELETE.
type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicPgPool?: PgPool | null; __epicProfileInit?: Promise<void> };

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
  if (!g.__epicProfileInit) g.__epicProfileInit = (async () => {
    await p.query(`CREATE TABLE IF NOT EXISTS workspace_profiles (
      workspace_id text PRIMARY KEY, display_name text, language text, country text,
      goals jsonb DEFAULT '[]'::jsonb, ai_needs jsonb DEFAULT '[]'::jsonb, socials jsonb DEFAULT '[]'::jsonb,
      models jsonb DEFAULT '[]'::jsonb, budget text, roles jsonb DEFAULT '[]'::jsonb,
      completed boolean DEFAULT false, updated_at timestamptz DEFAULT now())`);
  })();
  return g.__epicProfileInit;
}
async function db(): Promise<PgPool> { const p = await pool(); if (!p) throw new Error("pg unavailable"); await ensureInit(p); return p; }
function jarr(v: unknown): string[] { return Array.isArray(v) ? v as string[] : []; }
function row(r: any): WorkspaceProfile { return { workspaceId:r.workspace_id, displayName:r.display_name??"", language:r.language??"ru",
  country:r.country??"", goals:jarr(r.goals), aiNeeds:jarr(r.ai_needs), socials:jarr(r.socials), models:jarr(r.models),
  budget:r.budget??"", roles:jarr(r.roles).length?jarr(r.roles):["owner"], completed:Boolean(r.completed), updatedAt:new Date(r.updated_at).toISOString() }; }

export async function getProfile(workspaceId: string): Promise<WorkspaceProfile> {
  const p = await db();
  const r = (await p.query(`SELECT * FROM workspace_profiles WHERE workspace_id=$1`, [workspaceId])).rows[0];
  return r ? row(r) : emptyProfile(workspaceId);
}
export async function saveProfile(workspaceId: string, input: Partial<WorkspaceProfile>): Promise<{ ok: boolean; profile: WorkspaceProfile }> {
  const p = await db(); const n = normalizeProfile(workspaceId, { ...input, completed: true });
  const r = await p.query(
    `INSERT INTO workspace_profiles(workspace_id,display_name,language,country,goals,ai_needs,socials,models,budget,roles,completed,updated_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11)
     ON CONFLICT (workspace_id) DO UPDATE SET display_name=$2,language=$3,country=$4,goals=$5,ai_needs=$6,socials=$7,models=$8,budget=$9,roles=$10,completed=true,updated_at=$11 RETURNING *`,
    [workspaceId, n.displayName, n.language, n.country, JSON.stringify(n.goals), JSON.stringify(n.aiNeeds), JSON.stringify(n.socials), JSON.stringify(n.models), n.budget, JSON.stringify(n.roles), n.updatedAt]
  );
  return { ok: true, profile: row(r.rows[0]) };
}

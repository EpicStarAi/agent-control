import { normalizeAvatar, normalizePassport, normalizeJob, normalizeAsset,
  type Avatar, type AvatarPassport, type RenderJob, type AvatarAsset } from "@/lib/avatarStudio";

// P27.1 Postgres adapter. CREATE TABLE/INDEX IF NOT EXISTS only. No DROP/DELETE.
// Shares the global pg pool. Stores no secrets.
type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicPgPool?: PgPool | null; __epicAvatarInit?: Promise<void> };

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
  if (!g.__epicAvatarInit) g.__epicAvatarInit = (async () => {
    await p.query(`CREATE TABLE IF NOT EXISTS avatars (
      id text PRIMARY KEY, workspace_id text NOT NULL, name text, status text,
      source_image_url text, consent_confirmed boolean DEFAULT false,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS avatars_ws ON avatars(workspace_id)`);
    await p.query(`CREATE TABLE IF NOT EXISTS avatar_passports (
      id text PRIMARY KEY, avatar_id text NOT NULL, workspace_id text NOT NULL,
      profile_json jsonb DEFAULT '{}'::jsonb, identity_notes text, style_notes text,
      forbidden_rules jsonb DEFAULT '[]'::jsonb,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS avatar_passports_uq ON avatar_passports(workspace_id, avatar_id)`);
    await p.query(`CREATE TABLE IF NOT EXISTS avatar_render_jobs (
      id text PRIMARY KEY, workspace_id text NOT NULL, avatar_id text, pack_id text, engine text,
      status text, scene_key text, prompt text, result_url text, error text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS avatar_jobs_ws ON avatar_render_jobs(workspace_id)`);
    await p.query(`CREATE TABLE IF NOT EXISTS avatar_assets (
      id text PRIMARY KEY, workspace_id text NOT NULL, avatar_id text, job_id text, asset_type text,
      image_url text, prompt text, status text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS avatar_assets_ws ON avatar_assets(workspace_id)`);
  })();
  return g.__epicAvatarInit;
}
async function db(): Promise<PgPool> { const p = await pool(); if (!p) throw new Error("pg unavailable"); await ensureInit(p); return p; }
function jarr(v: unknown): string[] { return Array.isArray(v) ? v as string[] : []; }

function avatarRow(r: any): Avatar { return { id: r.id, workspaceId: r.workspace_id, name: r.name ?? "", status: r.status ?? "draft",
  sourceImageUrl: r.source_image_url ?? "", consentConfirmed: Boolean(r.consent_confirmed),
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
function passRow(r: any): AvatarPassport { return { id: r.id, avatarId: r.avatar_id, workspaceId: r.workspace_id,
  profileJson: (r.profile_json && typeof r.profile_json === "object" ? r.profile_json : {}),
  identityNotes: r.identity_notes ?? "", styleNotes: r.style_notes ?? "", forbiddenRules: jarr(r.forbidden_rules),
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
function jobRow(r: any): RenderJob { return { id: r.id, workspaceId: r.workspace_id, avatarId: r.avatar_id ?? "", packId: r.pack_id ?? "",
  engine: r.engine ?? "grok_imagine_ui", status: r.status ?? "pending", sceneKey: r.scene_key ?? "", prompt: r.prompt ?? "",
  resultUrl: r.result_url ?? "", error: r.error ?? "", createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
function assetRow(r: any): AvatarAsset { return { id: r.id, workspaceId: r.workspace_id, avatarId: r.avatar_id ?? "", jobId: r.job_id ?? "",
  assetType: r.asset_type ?? "image", imageUrl: r.image_url ?? "", prompt: r.prompt ?? "", status: r.status ?? "draft",
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }

export async function listAvatars(ws: string): Promise<Avatar[]> {
  const p = await db(); return (await p.query(`SELECT * FROM avatars WHERE workspace_id=$1 ORDER BY updated_at DESC`, [ws])).rows.map(avatarRow); }
export async function getAvatar(ws: string, id: string): Promise<Avatar | null> {
  const p = await db(); const r = (await p.query(`SELECT * FROM avatars WHERE workspace_id=$1 AND id=$2`, [ws, id])).rows[0]; return r ? avatarRow(r) : null; }
export async function createAvatar(ws: string, input: Partial<Avatar>): Promise<Avatar> {
  const p = await db(); const n = normalizeAvatar(ws, input);
  const r = await p.query(`INSERT INTO avatars(id,workspace_id,name,status,source_image_url,consent_confirmed,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [n.id, ws, n.name, n.status, n.sourceImageUrl, n.consentConfirmed, n.createdAt, n.updatedAt]);
  return avatarRow(r.rows[0]); }
export async function getPassport(ws: string, avatarId: string): Promise<AvatarPassport | null> {
  const p = await db(); const r = (await p.query(`SELECT * FROM avatar_passports WHERE workspace_id=$1 AND avatar_id=$2`, [ws, avatarId])).rows[0]; return r ? passRow(r) : null; }
export async function upsertPassport(ws: string, avatarId: string, input: Partial<AvatarPassport>): Promise<AvatarPassport> {
  const p = await db(); const n = normalizePassport(ws, avatarId, input);
  const r = await p.query(`INSERT INTO avatar_passports(id,avatar_id,workspace_id,profile_json,identity_notes,style_notes,forbidden_rules,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
    ON CONFLICT (workspace_id,avatar_id) DO UPDATE SET profile_json=$4,identity_notes=$5,style_notes=$6,forbidden_rules=$7,updated_at=$9 RETURNING *`,
    [n.id, avatarId, ws, JSON.stringify(n.profileJson), n.identityNotes, n.styleNotes, JSON.stringify(n.forbiddenRules), n.createdAt, n.updatedAt]);
  return passRow(r.rows[0]); }
export async function listJobs(ws: string): Promise<RenderJob[]> {
  const p = await db(); return (await p.query(`SELECT * FROM avatar_render_jobs WHERE workspace_id=$1 ORDER BY updated_at DESC`, [ws])).rows.map(jobRow); }
export async function getJob(ws: string, id: string): Promise<RenderJob | null> {
  const p = await db(); const r = (await p.query(`SELECT * FROM avatar_render_jobs WHERE workspace_id=$1 AND id=$2`, [ws, id])).rows[0]; return r ? jobRow(r) : null; }
export async function createJob(ws: string, input: Partial<RenderJob>): Promise<RenderJob> {
  const p = await db(); const n = normalizeJob(ws, input);
  const r = await p.query(`INSERT INTO avatar_render_jobs(id,workspace_id,avatar_id,pack_id,engine,status,scene_key,prompt,result_url,error,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [n.id, ws, n.avatarId, n.packId, n.engine, n.status, n.sceneKey, n.prompt, n.resultUrl, n.error, n.createdAt, n.updatedAt]);
  return jobRow(r.rows[0]); }
export async function setJob(ws: string, id: string, patch: Partial<RenderJob>): Promise<RenderJob | null> {
  const p = await db(); const now = new Date().toISOString();
  const r = await p.query(`UPDATE avatar_render_jobs SET status=COALESCE($3,status),result_url=COALESCE($4,result_url),error=COALESCE($5,error),updated_at=$6
    WHERE workspace_id=$1 AND id=$2 RETURNING *`, [ws, id, patch.status ?? null, patch.resultUrl ?? null, patch.error ?? null, now]);
  return r.rows[0] ? jobRow(r.rows[0]) : null; }
export async function listAssets(ws: string, avatarId?: string): Promise<AvatarAsset[]> {
  const p = await db();
  const q = avatarId ? await p.query(`SELECT * FROM avatar_assets WHERE workspace_id=$1 AND avatar_id=$2 ORDER BY updated_at DESC`, [ws, avatarId])
    : await p.query(`SELECT * FROM avatar_assets WHERE workspace_id=$1 ORDER BY updated_at DESC`, [ws]);
  return q.rows.map(assetRow); }
export async function createAsset(ws: string, input: Partial<AvatarAsset>): Promise<AvatarAsset> {
  const p = await db(); const n = normalizeAsset(ws, input);
  const r = await p.query(`INSERT INTO avatar_assets(id,workspace_id,avatar_id,job_id,asset_type,image_url,prompt,status,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [n.id, ws, n.avatarId, n.jobId, n.assetType, n.imageUrl, n.prompt, n.status, n.createdAt, n.updatedAt]);
  return assetRow(r.rows[0]); }
export async function setAssetStatusByJob(ws: string, jobId: string, status: string): Promise<void> {
  const p = await db(); await p.query(`UPDATE avatar_assets SET status=$3,updated_at=$4 WHERE workspace_id=$1 AND job_id=$2`, [ws, jobId, status, new Date().toISOString()]); }

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
    // P27.2 additive columns (safe on a pre-existing table).
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 3`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS started_at text`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS completed_at text`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS last_error text`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS batch_id text`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0`);
    // P27.3 provider-router columns.
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS provider_id text`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS provider_job_id text`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS provider_status text`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS provider_error text`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS selected_by text`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS capabilities_snapshot text`);
    await p.query(`ALTER TABLE avatar_render_jobs ADD COLUMN IF NOT EXISTS candidate_index integer DEFAULT 0`);
    await p.query(`CREATE INDEX IF NOT EXISTS avatar_jobs_status ON avatar_render_jobs(workspace_id, status)`);
    await p.query(`CREATE TABLE IF NOT EXISTS avatar_assets (
      id text PRIMARY KEY, workspace_id text NOT NULL, avatar_id text, job_id text, asset_type text,
      image_url text, prompt text, status text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS avatar_assets_ws ON avatar_assets(workspace_id)`);
    // P27.4 quality gate + candidate columns.
    await p.query(`ALTER TABLE avatar_assets ADD COLUMN IF NOT EXISTS quality_status text DEFAULT 'unchecked'`);
    await p.query(`ALTER TABLE avatar_assets ADD COLUMN IF NOT EXISTS quality_score numeric`);
    await p.query(`ALTER TABLE avatar_assets ADD COLUMN IF NOT EXISTS identity_score numeric`);
    await p.query(`ALTER TABLE avatar_assets ADD COLUMN IF NOT EXISTS style_score numeric`);
    await p.query(`ALTER TABLE avatar_assets ADD COLUMN IF NOT EXISTS artifact_score numeric`);
    await p.query(`ALTER TABLE avatar_assets ADD COLUMN IF NOT EXISTS quality_notes text`);
    await p.query(`ALTER TABLE avatar_assets ADD COLUMN IF NOT EXISTS scene_key text`);
    await p.query(`ALTER TABLE avatar_assets ADD COLUMN IF NOT EXISTS candidate_index integer DEFAULT 0`);
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
  engine: r.engine ?? "grok_imagine_ui", status: r.status ?? "queued", sceneKey: r.scene_key ?? "", prompt: r.prompt ?? "",
  resultUrl: r.result_url ?? "", error: r.error ?? "",
  attempts: Number(r.attempts ?? 0), maxAttempts: Number(r.max_attempts ?? 3), startedAt: r.started_at ?? "", completedAt: r.completed_at ?? "",
  lastError: r.last_error ?? "", batchId: r.batch_id ?? "", priority: Number(r.priority ?? 0),
  providerId: r.provider_id ?? "mock_grok_imagine", providerJobId: r.provider_job_id ?? "", providerStatus: r.provider_status ?? "",
  providerError: r.provider_error ?? "", selectedBy: r.selected_by ?? "", capabilitiesSnapshot: r.capabilities_snapshot ?? "", candidateIndex: Number(r.candidate_index ?? 0),
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
function nn(v: unknown): number | null { if (v === null || v === undefined) return null; const n = Number(v); return Number.isFinite(n) ? n : null; }
function assetRow(r: any): AvatarAsset { return { id: r.id, workspaceId: r.workspace_id, avatarId: r.avatar_id ?? "", jobId: r.job_id ?? "",
  assetType: r.asset_type ?? "image", imageUrl: r.image_url ?? "", prompt: r.prompt ?? "", status: r.status ?? "pending_review",
  qualityStatus: r.quality_status ?? "unchecked", qualityScore: nn(r.quality_score), identityScore: nn(r.identity_score),
  styleScore: nn(r.style_score), artifactScore: nn(r.artifact_score), qualityNotes: r.quality_notes ?? "",
  sceneKey: r.scene_key ?? "", candidateIndex: Number(r.candidate_index ?? 0),
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
  const r = await p.query(`INSERT INTO avatar_render_jobs(id,workspace_id,avatar_id,pack_id,engine,status,scene_key,prompt,result_url,error,attempts,max_attempts,started_at,completed_at,last_error,batch_id,priority,provider_id,provider_job_id,provider_status,provider_error,selected_by,capabilities_snapshot,candidate_index,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26) RETURNING *`,
    [n.id, ws, n.avatarId, n.packId, n.engine, n.status, n.sceneKey, n.prompt, n.resultUrl, n.error, n.attempts, n.maxAttempts, n.startedAt, n.completedAt, n.lastError, n.batchId, n.priority, n.providerId, n.providerJobId, n.providerStatus, n.providerError, n.selectedBy, n.capabilitiesSnapshot, n.candidateIndex, n.createdAt, n.updatedAt]);
  return jobRow(r.rows[0]); }
export async function listJobsByStatus(ws: string, status: string, limit = 20): Promise<RenderJob[]> {
  const p = await db();
  return (await p.query(`SELECT * FROM avatar_render_jobs WHERE workspace_id=$1 AND status=$2 ORDER BY priority DESC, created_at ASC LIMIT $3`, [ws, status, limit])).rows.map(jobRow); }
export async function setJob(ws: string, id: string, patch: Partial<RenderJob>): Promise<RenderJob | null> {
  const p = await db(); const now = new Date().toISOString();
  const r = await p.query(`UPDATE avatar_render_jobs SET
      status=COALESCE($3,status), result_url=COALESCE($4,result_url), error=COALESCE($5,error),
      attempts=COALESCE($6,attempts), started_at=COALESCE($7,started_at), completed_at=COALESCE($8,completed_at),
      last_error=COALESCE($9,last_error), provider_job_id=COALESCE($11,provider_job_id),
      provider_status=COALESCE($12,provider_status), provider_error=COALESCE($13,provider_error), updated_at=$10
    WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [ws, id, patch.status ?? null, patch.resultUrl ?? null, patch.error ?? null,
     patch.attempts ?? null, patch.startedAt ?? null, patch.completedAt ?? null, patch.lastError ?? null, now,
     patch.providerJobId ?? null, patch.providerStatus ?? null, patch.providerError ?? null]);
  return r.rows[0] ? jobRow(r.rows[0]) : null; }
export async function listAssets(ws: string, avatarId?: string): Promise<AvatarAsset[]> {
  const p = await db();
  const q = avatarId ? await p.query(`SELECT * FROM avatar_assets WHERE workspace_id=$1 AND avatar_id=$2 ORDER BY updated_at DESC`, [ws, avatarId])
    : await p.query(`SELECT * FROM avatar_assets WHERE workspace_id=$1 ORDER BY updated_at DESC`, [ws]);
  return q.rows.map(assetRow); }
export async function createAsset(ws: string, input: Partial<AvatarAsset>): Promise<AvatarAsset> {
  const p = await db(); const n = normalizeAsset(ws, input);
  const r = await p.query(`INSERT INTO avatar_assets(id,workspace_id,avatar_id,job_id,asset_type,image_url,prompt,status,quality_status,quality_score,identity_score,style_score,artifact_score,quality_notes,scene_key,candidate_index,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
    [n.id, ws, n.avatarId, n.jobId, n.assetType, n.imageUrl, n.prompt, n.status, n.qualityStatus, n.qualityScore, n.identityScore, n.styleScore, n.artifactScore, n.qualityNotes, n.sceneKey, n.candidateIndex, n.createdAt, n.updatedAt]);
  return assetRow(r.rows[0]); }
export async function getAsset(ws: string, id: string): Promise<AvatarAsset | null> {
  const p = await db(); const r = (await p.query(`SELECT * FROM avatar_assets WHERE workspace_id=$1 AND id=$2`, [ws, id])).rows[0]; return r ? assetRow(r) : null; }
export async function listAssetsByJob(ws: string, jobId: string): Promise<AvatarAsset[]> {
  const p = await db(); return (await p.query(`SELECT * FROM avatar_assets WHERE workspace_id=$1 AND job_id=$2`, [ws, jobId])).rows.map(assetRow); }
export async function setAssetQuality(ws: string, id: string, patch: Partial<AvatarAsset>): Promise<AvatarAsset | null> {
  const p = await db(); const now = new Date().toISOString();
  const r = await p.query(`UPDATE avatar_assets SET
      quality_status=COALESCE($3,quality_status), quality_score=COALESCE($4,quality_score), identity_score=COALESCE($5,identity_score),
      style_score=COALESCE($6,style_score), artifact_score=COALESCE($7,artifact_score), quality_notes=COALESCE($8,quality_notes),
      status=COALESCE($9,status), updated_at=$10
    WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [ws, id, patch.qualityStatus ?? null, patch.qualityScore ?? null, patch.identityScore ?? null, patch.styleScore ?? null, patch.artifactScore ?? null, patch.qualityNotes ?? null, patch.status ?? null, now]);
  return r.rows[0] ? assetRow(r.rows[0]) : null; }
export async function setAssetStatusByJob(ws: string, jobId: string, status: string): Promise<void> {
  const p = await db(); await p.query(`UPDATE avatar_assets SET status=$3,updated_at=$4 WHERE workspace_id=$1 AND job_id=$2`, [ws, jobId, status, new Date().toISOString()]); }

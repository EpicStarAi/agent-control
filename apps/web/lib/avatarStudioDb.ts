import { normalizeAvatar, normalizePassport, normalizeJob, normalizeAsset, normalizeIdentitySource,
  normalizeProject, normalizeCharacter, normalizeRelationship, normalizeCharacterProfile,
  normalizeSeason, normalizeEpisode, normalizeScene,
  type Avatar, type AvatarPassport, type RenderJob, type AvatarAsset, type AvatarIdentitySource,
  type Project, type Character, type CharacterRelationship, type CharacterProfile,
  type Season, type Episode, type Scene } from "@/lib/avatarStudio";

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
    // P29.1 Cast Layer — Project(Universe) + Character(wraps avatar) + Relationship graph.
    // Avatars table is left UNCHANGED (Character is a higher entity over avatar).
    await p.query(`CREATE TABLE IF NOT EXISTS avatar_projects (
      id text PRIMARY KEY, workspace_id text NOT NULL, name text, type text DEFAULT 'universe',
      status text DEFAULT 'active', description text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS avatar_projects_ws ON avatar_projects(workspace_id)`);
    await p.query(`CREATE TABLE IF NOT EXISTS characters (
      id text PRIMARY KEY, workspace_id text NOT NULL, project_id text, avatar_id text, name text,
      role text DEFAULT 'main', archetype text, status text DEFAULT 'active',
      economy_profile text, story_seed text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS characters_ws ON characters(workspace_id)`);
    await p.query(`CREATE INDEX IF NOT EXISTS characters_project ON characters(workspace_id, project_id)`);
    await p.query(`CREATE TABLE IF NOT EXISTS character_relationships (
      id text PRIMARY KEY, workspace_id text NOT NULL, project_id text,
      source_character_id text NOT NULL, target_character_id text NOT NULL,
      relation_type text, description text, strength integer DEFAULT 50,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS character_relationships_ws ON character_relationships(workspace_id)`);
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
    // P27.8 identity intake sources (operator-registered reference metadata).
    await p.query(`CREATE TABLE IF NOT EXISTS avatar_identity_sources (
      id text PRIMARY KEY, avatar_id text NOT NULL, workspace_id text NOT NULL,
      type text, label text, file_url text, status text DEFAULT 'pending_review',
      consent_status text DEFAULT 'unknown',
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS avatar_identity_sources_ws ON avatar_identity_sources(workspace_id, avatar_id)`);
    // P29.2 Character Profile (passport of a character; 1:1 with a character).
    await p.query(`CREATE TABLE IF NOT EXISTS character_profiles (
      id text PRIMARY KEY, character_id text NOT NULL, workspace_id text NOT NULL,
      goals text, profession text, interests text, speech_style text,
      memory text, skills text, constraints text, tone_of_voice text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE UNIQUE INDEX IF NOT EXISTS character_profiles_uq ON character_profiles(workspace_id, character_id)`);
    // P29.3 Story / Scene Planner — Project → Season → Episode → Scene (minimal).
    await p.query(`CREATE TABLE IF NOT EXISTS avatar_seasons (
      id text PRIMARY KEY, workspace_id text NOT NULL, project_id text, name text, order_index integer DEFAULT 0,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS avatar_seasons_ws ON avatar_seasons(workspace_id, project_id)`);
    await p.query(`CREATE TABLE IF NOT EXISTS avatar_episodes (
      id text PRIMARY KEY, workspace_id text NOT NULL, project_id text, season_id text, name text,
      order_index integer DEFAULT 0, synopsis text,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS avatar_episodes_ws ON avatar_episodes(workspace_id, season_id)`);
    await p.query(`CREATE TABLE IF NOT EXISTS avatar_scenes (
      id text PRIMARY KEY, workspace_id text NOT NULL, project_id text, episode_id text, name text,
      order_index integer DEFAULT 0, character_ids jsonb DEFAULT '[]'::jsonb, summary text, goal text,
      output text, status text DEFAULT 'draft',
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    await p.query(`CREATE INDEX IF NOT EXISTS avatar_scenes_ws ON avatar_scenes(workspace_id, episode_id)`);
  })();
  return g.__epicAvatarInit;
}
async function db(): Promise<PgPool> { const p = await pool(); if (!p) throw new Error("pg unavailable"); await ensureInit(p); return p; }
function jarr(v: unknown): string[] { return Array.isArray(v) ? v as string[] : []; }

function avatarRow(r: any): Avatar { return { id: r.id, workspaceId: r.workspace_id, name: r.name ?? "", status: r.status ?? "draft",
  sourceImageUrl: r.source_image_url ?? "", consentConfirmed: Boolean(r.consent_confirmed),
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
function projectRow(r: any): Project { return { id: r.id, workspaceId: r.workspace_id, name: r.name ?? "", type: r.type ?? "universe",
  status: r.status ?? "active", description: r.description ?? "", createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
function charRow(r: any): Character { return { id: r.id, workspaceId: r.workspace_id, projectId: r.project_id ?? "", avatarId: r.avatar_id ?? "",
  name: r.name ?? "", role: r.role ?? "main", archetype: r.archetype ?? "", status: r.status ?? "active",
  economyProfile: r.economy_profile ?? "", storySeed: r.story_seed ?? "",
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
function relRow(r: any): CharacterRelationship { return { id: r.id, workspaceId: r.workspace_id, projectId: r.project_id ?? "",
  sourceCharacterId: r.source_character_id, targetCharacterId: r.target_character_id, relationType: r.relation_type ?? "unknown",
  description: r.description ?? "", strength: Number(r.strength ?? 50),
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
// P29.1 projects.
export async function listProjects(ws: string): Promise<Project[]> {
  const p = await db(); return (await p.query(`SELECT * FROM avatar_projects WHERE workspace_id=$1 ORDER BY created_at ASC`, [ws])).rows.map(projectRow); }
export async function getProject(ws: string, id: string): Promise<Project | null> {
  const p = await db(); const r = (await p.query(`SELECT * FROM avatar_projects WHERE workspace_id=$1 AND id=$2`, [ws, id])).rows[0]; return r ? projectRow(r) : null; }
export async function createProject(ws: string, input: Partial<Project>): Promise<Project> {
  const p = await db(); const n = normalizeProject(ws, input);
  const r = await p.query(`INSERT INTO avatar_projects(id,workspace_id,name,type,status,description,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [n.id, ws, n.name, n.type, n.status, n.description, n.createdAt, n.updatedAt]);
  return projectRow(r.rows[0]); }
// P29.1 characters (wrap an avatar; higher entity over the visual shell).
export async function listCharacters(ws: string, projectId?: string): Promise<Character[]> {
  const p = await db();
  const q = projectId
    ? await p.query(`SELECT * FROM characters WHERE workspace_id=$1 AND project_id=$2 ORDER BY created_at ASC`, [ws, projectId])
    : await p.query(`SELECT * FROM characters WHERE workspace_id=$1 ORDER BY created_at ASC`, [ws]);
  return q.rows.map(charRow); }
export async function getCharacter(ws: string, id: string): Promise<Character | null> {
  const p = await db(); const r = (await p.query(`SELECT * FROM characters WHERE workspace_id=$1 AND id=$2`, [ws, id])).rows[0]; return r ? charRow(r) : null; }
export async function createCharacter(ws: string, input: Partial<Character>): Promise<Character> {
  const p = await db(); const n = normalizeCharacter(ws, input);
  const r = await p.query(`INSERT INTO characters(id,workspace_id,project_id,avatar_id,name,role,archetype,status,economy_profile,story_seed,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [n.id, ws, n.projectId, n.avatarId, n.name, n.role, n.archetype, n.status, n.economyProfile, n.storySeed, n.createdAt, n.updatedAt]);
  return charRow(r.rows[0]); }
export async function updateCharacter(ws: string, id: string, patch: Partial<Character>): Promise<Character | null> {
  const p = await db(); const now = new Date().toISOString();
  const r = await p.query(`UPDATE characters SET project_id=COALESCE($3,project_id), avatar_id=COALESCE($4,avatar_id),
      name=COALESCE($5,name), role=COALESCE($6,role), archetype=COALESCE($7,archetype), status=COALESCE($8,status),
      economy_profile=COALESCE($9,economy_profile), story_seed=COALESCE($10,story_seed), updated_at=$11
    WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [ws, id, patch.projectId ?? null, patch.avatarId ?? null, patch.name ?? null, patch.role ?? null, patch.archetype ?? null,
     patch.status ?? null, patch.economyProfile ?? null, patch.storySeed ?? null, now]);
  return r.rows[0] ? charRow(r.rows[0]) : null; }
export async function deleteCharacter(ws: string, id: string): Promise<void> {
  const p = await db(); await p.query(`DELETE FROM characters WHERE workspace_id=$1 AND id=$2`, [ws, id]); }
// P29.1 relationships (character↔character edges).
export async function listRelationships(ws: string, characterId?: string): Promise<CharacterRelationship[]> {
  const p = await db();
  const q = characterId
    ? await p.query(`SELECT * FROM character_relationships WHERE workspace_id=$1 AND (source_character_id=$2 OR target_character_id=$2) ORDER BY created_at ASC`, [ws, characterId])
    : await p.query(`SELECT * FROM character_relationships WHERE workspace_id=$1 ORDER BY created_at ASC`, [ws]);
  return q.rows.map(relRow); }
export async function createRelationship(ws: string, input: Partial<CharacterRelationship>): Promise<CharacterRelationship> {
  const p = await db(); const n = normalizeRelationship(ws, input);
  const r = await p.query(`INSERT INTO character_relationships(id,workspace_id,project_id,source_character_id,target_character_id,relation_type,description,strength,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [n.id, ws, n.projectId, n.sourceCharacterId, n.targetCharacterId, n.relationType, n.description, n.strength, n.createdAt, n.updatedAt]);
  return relRow(r.rows[0]); }
export async function deleteRelationship(ws: string, id: string): Promise<void> {
  const p = await db(); await p.query(`DELETE FROM character_relationships WHERE workspace_id=$1 AND id=$2`, [ws, id]); }
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

// P27.8 identity sources.
function idsrcRow(r: any): AvatarIdentitySource { return { id: r.id, avatarId: r.avatar_id, workspaceId: r.workspace_id,
  type: r.type ?? "photo", label: r.label ?? "", fileUrl: r.file_url ?? "", status: r.status ?? "pending_review",
  consentStatus: r.consent_status ?? "unknown",
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
export async function listIdentitySources(ws: string, avatarId: string): Promise<AvatarIdentitySource[]> {
  const p = await db(); return (await p.query(`SELECT * FROM avatar_identity_sources WHERE workspace_id=$1 AND avatar_id=$2 ORDER BY created_at ASC`, [ws, avatarId])).rows.map(idsrcRow); }
export async function createIdentitySource(ws: string, avatarId: string, input: Partial<AvatarIdentitySource> & { consentConfirmed?: boolean }): Promise<AvatarIdentitySource> {
  const p = await db(); const n = normalizeIdentitySource(ws, avatarId, input);
  const r = await p.query(`INSERT INTO avatar_identity_sources(id,avatar_id,workspace_id,type,label,file_url,status,consent_status,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [n.id, avatarId, ws, n.type, n.label, n.fileUrl, n.status, n.consentStatus, n.createdAt, n.updatedAt]);
  return idsrcRow(r.rows[0]); }

// P29.2 character profiles.
function cprofRow(r: any): CharacterProfile { return { id: r.id, characterId: r.character_id, workspaceId: r.workspace_id,
  goals: r.goals ?? "", profession: r.profession ?? "", interests: r.interests ?? "", speechStyle: r.speech_style ?? "",
  memory: r.memory ?? "", skills: r.skills ?? "", constraints: r.constraints ?? "", toneOfVoice: r.tone_of_voice ?? "",
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
export async function getCharacterProfile(ws: string, characterId: string): Promise<CharacterProfile | null> {
  const p = await db(); const r = (await p.query(`SELECT * FROM character_profiles WHERE workspace_id=$1 AND character_id=$2`, [ws, characterId])).rows[0]; return r ? cprofRow(r) : null; }
export async function upsertCharacterProfile(ws: string, characterId: string, input: Partial<CharacterProfile>): Promise<CharacterProfile> {
  const p = await db(); const n = normalizeCharacterProfile(ws, characterId, input);
  const r = await p.query(`INSERT INTO character_profiles(id,character_id,workspace_id,goals,profession,interests,speech_style,memory,skills,constraints,tone_of_voice,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (workspace_id,character_id) DO UPDATE SET goals=$4,profession=$5,interests=$6,speech_style=$7,memory=$8,skills=$9,constraints=$10,tone_of_voice=$11,updated_at=$13 RETURNING *`,
    [n.id, characterId, ws, n.goals, n.profession, n.interests, n.speechStyle, n.memory, n.skills, n.constraints, n.toneOfVoice, n.createdAt, n.updatedAt]);
  return cprofRow(r.rows[0]); }

// P29.3 story planner — seasons / episodes / scenes.
function seasonRow(r: any): Season { return { id: r.id, workspaceId: r.workspace_id, projectId: r.project_id ?? "", name: r.name ?? "",
  orderIndex: Number(r.order_index ?? 0), createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
function episodeRow(r: any): Episode { return { id: r.id, workspaceId: r.workspace_id, projectId: r.project_id ?? "", seasonId: r.season_id ?? "",
  name: r.name ?? "", orderIndex: Number(r.order_index ?? 0), synopsis: r.synopsis ?? "",
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }
function sceneRow(r: any): Scene { return { id: r.id, workspaceId: r.workspace_id, projectId: r.project_id ?? "", episodeId: r.episode_id ?? "",
  name: r.name ?? "", orderIndex: Number(r.order_index ?? 0), characterIds: Array.isArray(r.character_ids) ? r.character_ids : [],
  summary: r.summary ?? "", goal: r.goal ?? "", output: r.output ?? "", status: r.status ?? "draft",
  createdAt: new Date(r.created_at).toISOString(), updatedAt: new Date(r.updated_at).toISOString() }; }

export async function listSeasons(ws: string, projectId?: string): Promise<Season[]> {
  const p = await db();
  const q = projectId ? await p.query(`SELECT * FROM avatar_seasons WHERE workspace_id=$1 AND project_id=$2 ORDER BY order_index ASC, created_at ASC`, [ws, projectId])
    : await p.query(`SELECT * FROM avatar_seasons WHERE workspace_id=$1 ORDER BY order_index ASC, created_at ASC`, [ws]);
  return q.rows.map(seasonRow); }
export async function createSeason(ws: string, input: Partial<Season>): Promise<Season> {
  const p = await db(); const n = normalizeSeason(ws, input);
  const r = await p.query(`INSERT INTO avatar_seasons(id,workspace_id,project_id,name,order_index,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [n.id, ws, n.projectId, n.name, n.orderIndex, n.createdAt, n.updatedAt]);
  return seasonRow(r.rows[0]); }
export async function listEpisodes(ws: string, seasonId?: string): Promise<Episode[]> {
  const p = await db();
  const q = seasonId ? await p.query(`SELECT * FROM avatar_episodes WHERE workspace_id=$1 AND season_id=$2 ORDER BY order_index ASC, created_at ASC`, [ws, seasonId])
    : await p.query(`SELECT * FROM avatar_episodes WHERE workspace_id=$1 ORDER BY order_index ASC, created_at ASC`, [ws]);
  return q.rows.map(episodeRow); }
export async function createEpisode(ws: string, input: Partial<Episode>): Promise<Episode> {
  const p = await db(); const n = normalizeEpisode(ws, input);
  const r = await p.query(`INSERT INTO avatar_episodes(id,workspace_id,project_id,season_id,name,order_index,synopsis,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [n.id, ws, n.projectId, n.seasonId, n.name, n.orderIndex, n.synopsis, n.createdAt, n.updatedAt]);
  return episodeRow(r.rows[0]); }
export async function listScenes(ws: string, episodeId?: string): Promise<Scene[]> {
  const p = await db();
  const q = episodeId ? await p.query(`SELECT * FROM avatar_scenes WHERE workspace_id=$1 AND episode_id=$2 ORDER BY order_index ASC, created_at ASC`, [ws, episodeId])
    : await p.query(`SELECT * FROM avatar_scenes WHERE workspace_id=$1 ORDER BY order_index ASC, created_at ASC`, [ws]);
  return q.rows.map(sceneRow); }
export async function getScene(ws: string, id: string): Promise<Scene | null> {
  const p = await db(); const r = (await p.query(`SELECT * FROM avatar_scenes WHERE workspace_id=$1 AND id=$2`, [ws, id])).rows[0]; return r ? sceneRow(r) : null; }
export async function createScene(ws: string, input: Partial<Scene>): Promise<Scene> {
  const p = await db(); const n = normalizeScene(ws, input);
  const r = await p.query(`INSERT INTO avatar_scenes(id,workspace_id,project_id,episode_id,name,order_index,character_ids,summary,goal,output,status,created_at,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [n.id, ws, n.projectId, n.episodeId, n.name, n.orderIndex, JSON.stringify(n.characterIds), n.summary, n.goal, n.output, n.status, n.createdAt, n.updatedAt]);
  return sceneRow(r.rows[0]); }
export async function updateScene(ws: string, id: string, patch: Partial<Scene>): Promise<Scene | null> {
  const p = await db(); const now = new Date().toISOString();
  const r = await p.query(`UPDATE avatar_scenes SET name=COALESCE($3,name), character_ids=COALESCE($4,character_ids),
      summary=COALESCE($5,summary), goal=COALESCE($6,goal), output=COALESCE($7,output), status=COALESCE($8,status),
      order_index=COALESCE($9,order_index), updated_at=$10
    WHERE workspace_id=$1 AND id=$2 RETURNING *`,
    [ws, id, patch.name ?? null, patch.characterIds ? JSON.stringify(patch.characterIds) : null,
     patch.summary ?? null, patch.goal ?? null, patch.output ?? null, patch.status ?? null,
     patch.orderIndex ?? null, now]);
  return r.rows[0] ? sceneRow(r.rows[0]) : null; }
export async function deleteScene(ws: string, id: string): Promise<void> {
  const p = await db(); await p.query(`DELETE FROM avatar_scenes WHERE workspace_id=$1 AND id=$2`, [ws, id]); }

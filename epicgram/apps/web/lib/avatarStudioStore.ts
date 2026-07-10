import fs from "node:fs";
import path from "node:path";
import { normalizeAvatar, normalizePassport, normalizeJob, normalizeAsset, normalizeIdentitySource,
  normalizeProject, normalizeCharacter, normalizeRelationship, normalizeCharacterProfile,
  normalizeSeason, normalizeEpisode, normalizeScene,
  type Avatar, type AvatarPassport, type RenderJob, type AvatarAsset, type AvatarIdentitySource,
  type Project, type Character, type CharacterRelationship, type CharacterProfile,
  type Season, type Episode, type Scene } from "@/lib/avatarStudio";

// P27.1 fs fallback (keyed by workspace_id). Same shape as the DB adapter.
const FILE = path.join(process.cwd(), ".avatar-studio-data.json");
type WS = { avatars: Avatar[]; passports: AvatarPassport[]; jobs: RenderJob[]; assets: AvatarAsset[];
  identitySources?: AvatarIdentitySource[]; projects?: Project[]; characters?: Character[];
  relationships?: CharacterRelationship[]; characterProfiles?: CharacterProfile[];
  seasons?: Season[]; episodes?: Episode[]; scenes?: Scene[] };
type DB = { ws: Record<string, WS> };
function load(): DB { try { if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {} return { ws: {} }; }
function save(db: DB) { try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch {} }
function bucket(db: DB, ws: string): WS { return (db.ws[ws] ||= { avatars: [], passports: [], jobs: [], assets: [], identitySources: [], projects: [], characters: [], relationships: [], characterProfiles: [], seasons: [], episodes: [], scenes: [] }); }
const desc = <T extends { updatedAt: string }>(a: T[]) => a.slice().sort((x, y) => (x.updatedAt < y.updatedAt ? 1 : -1));

export async function listAvatars(ws: string): Promise<Avatar[]> { return desc(bucket(load(), ws).avatars); }
export async function getAvatar(ws: string, id: string): Promise<Avatar | null> { return bucket(load(), ws).avatars.find(a => a.id === id) ?? null; }
export async function createAvatar(ws: string, input: Partial<Avatar>): Promise<Avatar> {
  const db = load(); const b = bucket(db, ws); const n = normalizeAvatar(ws, input); b.avatars.push(n); save(db); return n; }
// P29.1 projects.
export async function listProjects(ws: string): Promise<Project[]> {
  const b = bucket(load(), ws); return (b.projects || []).slice().sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1)); }
export async function getProject(ws: string, id: string): Promise<Project | null> { return (bucket(load(), ws).projects || []).find(p => p.id === id) ?? null; }
export async function createProject(ws: string, input: Partial<Project>): Promise<Project> {
  const db = load(); const b = bucket(db, ws); (b.projects ||= []); const n = normalizeProject(ws, input); b.projects.push(n); save(db); return n; }
// P29.1 characters.
export async function listCharacters(ws: string, projectId?: string): Promise<Character[]> {
  const chars = bucket(load(), ws).characters || [];
  return (projectId ? chars.filter(c => c.projectId === projectId) : chars).slice().sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1)); }
export async function getCharacter(ws: string, id: string): Promise<Character | null> { return (bucket(load(), ws).characters || []).find(c => c.id === id) ?? null; }
export async function createCharacter(ws: string, input: Partial<Character>): Promise<Character> {
  const db = load(); const b = bucket(db, ws); (b.characters ||= []); const n = normalizeCharacter(ws, input); b.characters.push(n); save(db); return n; }
export async function updateCharacter(ws: string, id: string, patch: Partial<Character>): Promise<Character | null> {
  const db = load(); const b = bucket(db, ws); const c = (b.characters ||= []).find(x => x.id === id); if (!c) return null;
  if (patch.projectId != null) c.projectId = patch.projectId; if (patch.avatarId != null) c.avatarId = patch.avatarId;
  if (patch.name != null) c.name = patch.name; if (patch.role != null) c.role = patch.role;
  if (patch.archetype != null) c.archetype = patch.archetype; if (patch.status != null) c.status = patch.status;
  if (patch.economyProfile != null) c.economyProfile = patch.economyProfile; if (patch.storySeed != null) c.storySeed = patch.storySeed;
  c.updatedAt = new Date().toISOString(); save(db); return c; }
export async function deleteCharacter(ws: string, id: string): Promise<void> {
  const db = load(); const b = bucket(db, ws); if (b.characters) { b.characters = b.characters.filter(c => c.id !== id); save(db); } }
// P29.1 relationships.
export async function listRelationships(ws: string, characterId?: string): Promise<CharacterRelationship[]> {
  const rels = bucket(load(), ws).relationships || [];
  return (characterId ? rels.filter(r => r.sourceCharacterId === characterId || r.targetCharacterId === characterId) : rels)
    .slice().sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1)); }
export async function createRelationship(ws: string, input: Partial<CharacterRelationship>): Promise<CharacterRelationship> {
  const db = load(); const b = bucket(db, ws); (b.relationships ||= []); const n = normalizeRelationship(ws, input); b.relationships.push(n); save(db); return n; }
export async function deleteRelationship(ws: string, id: string): Promise<void> {
  const db = load(); const b = bucket(db, ws); if (b.relationships) { b.relationships = b.relationships.filter(r => r.id !== id); save(db); } }
export async function getPassport(ws: string, avatarId: string): Promise<AvatarPassport | null> { return bucket(load(), ws).passports.find(p => p.avatarId === avatarId) ?? null; }
export async function upsertPassport(ws: string, avatarId: string, input: Partial<AvatarPassport>): Promise<AvatarPassport> {
  const db = load(); const b = bucket(db, ws); const n = normalizePassport(ws, avatarId, input);
  const i = b.passports.findIndex(p => p.avatarId === avatarId); if (i >= 0) { n.id = b.passports[i].id; b.passports[i] = n; } else b.passports.push(n); save(db); return n; }
export async function listJobs(ws: string): Promise<RenderJob[]> { return desc(bucket(load(), ws).jobs); }
export async function getJob(ws: string, id: string): Promise<RenderJob | null> { return bucket(load(), ws).jobs.find(j => j.id === id) ?? null; }
export async function createJob(ws: string, input: Partial<RenderJob>): Promise<RenderJob> {
  const db = load(); const b = bucket(db, ws); const n = normalizeJob(ws, input); b.jobs.push(n); save(db); return n; }
export async function listJobsByStatus(ws: string, status: string, limit = 20): Promise<RenderJob[]> {
  const jobs = bucket(load(), ws).jobs.filter(j => j.status === status);
  jobs.sort((a, b) => (b.priority - a.priority) || (a.createdAt < b.createdAt ? -1 : 1));
  return jobs.slice(0, limit); }
export async function setJob(ws: string, id: string, patch: Partial<RenderJob>): Promise<RenderJob | null> {
  const db = load(); const b = bucket(db, ws); const j = b.jobs.find(x => x.id === id); if (!j) return null;
  if (patch.status) j.status = patch.status; if (patch.resultUrl != null) j.resultUrl = patch.resultUrl; if (patch.error != null) j.error = patch.error;
  if (patch.attempts != null) j.attempts = patch.attempts; if (patch.startedAt != null) j.startedAt = patch.startedAt;
  if (patch.completedAt != null) j.completedAt = patch.completedAt; if (patch.lastError != null) j.lastError = patch.lastError;
  if (patch.providerJobId != null) j.providerJobId = patch.providerJobId; if (patch.providerStatus != null) j.providerStatus = patch.providerStatus;
  if (patch.providerError != null) j.providerError = patch.providerError;
  j.updatedAt = new Date().toISOString(); save(db); return j; }
export async function listAssets(ws: string, avatarId?: string): Promise<AvatarAsset[]> {
  const a = bucket(load(), ws).assets; return desc(avatarId ? a.filter(x => x.avatarId === avatarId) : a); }
export async function createAsset(ws: string, input: Partial<AvatarAsset>): Promise<AvatarAsset> {
  const db = load(); const b = bucket(db, ws); const n = normalizeAsset(ws, input); b.assets.push(n); save(db); return n; }
export async function getAsset(ws: string, id: string): Promise<AvatarAsset | null> { return bucket(load(), ws).assets.find(a => a.id === id) ?? null; }
export async function listAssetsByJob(ws: string, jobId: string): Promise<AvatarAsset[]> { return bucket(load(), ws).assets.filter(a => a.jobId === jobId); }
export async function setAssetQuality(ws: string, id: string, patch: Partial<AvatarAsset>): Promise<AvatarAsset | null> {
  const db = load(); const b = bucket(db, ws); const a = b.assets.find(x => x.id === id); if (!a) return null;
  if (patch.qualityStatus != null) a.qualityStatus = patch.qualityStatus;
  if (patch.qualityScore !== undefined) a.qualityScore = patch.qualityScore;
  if (patch.identityScore !== undefined) a.identityScore = patch.identityScore;
  if (patch.styleScore !== undefined) a.styleScore = patch.styleScore;
  if (patch.artifactScore !== undefined) a.artifactScore = patch.artifactScore;
  if (patch.qualityNotes != null) a.qualityNotes = patch.qualityNotes;
  if (patch.status != null) a.status = patch.status;
  a.updatedAt = new Date().toISOString(); save(db); return a; }
export async function setAssetStatusByJob(ws: string, jobId: string, status: string): Promise<void> {
  const db = load(); const b = bucket(db, ws); let ch = false;
  for (const a of b.assets) if (a.jobId === jobId) { a.status = status as AvatarAsset["status"]; a.updatedAt = new Date().toISOString(); ch = true; }
  if (ch) save(db); }

// P27.8 identity sources.
export async function listIdentitySources(ws: string, avatarId: string): Promise<AvatarIdentitySource[]> {
  const b = bucket(load(), ws);
  return (b.identitySources || []).filter(s => s.avatarId === avatarId).slice().sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1)); }
export async function createIdentitySource(ws: string, avatarId: string, input: Partial<AvatarIdentitySource> & { consentConfirmed?: boolean }): Promise<AvatarIdentitySource> {
  const db = load(); const b = bucket(db, ws); (b.identitySources ||= []);
  const n = normalizeIdentitySource(ws, avatarId, input); b.identitySources.push(n); save(db); return n; }
// P29.2 character profiles.
export async function getCharacterProfile(ws: string, characterId: string): Promise<CharacterProfile | null> {
  return (bucket(load(), ws).characterProfiles || []).find(p => p.characterId === characterId) ?? null; }
export async function upsertCharacterProfile(ws: string, characterId: string, input: Partial<CharacterProfile>): Promise<CharacterProfile> {
  const db = load(); const b = bucket(db, ws); (b.characterProfiles ||= []); const n = normalizeCharacterProfile(ws, characterId, input);
  const i = b.characterProfiles.findIndex(p => p.characterId === characterId);
  if (i >= 0) { n.id = b.characterProfiles[i].id; n.createdAt = b.characterProfiles[i].createdAt; b.characterProfiles[i] = n; } else b.characterProfiles.push(n);
  save(db); return n; }
// P29.3 story planner.
const bySort = <T extends { orderIndex: number; createdAt: string }>(a: T[]) => a.slice().sort((x, y) => (x.orderIndex - y.orderIndex) || (x.createdAt < y.createdAt ? -1 : 1));
export async function listSeasons(ws: string, projectId?: string): Promise<Season[]> {
  const s = bucket(load(), ws).seasons || []; return bySort(projectId ? s.filter(x => x.projectId === projectId) : s); }
export async function createSeason(ws: string, input: Partial<Season>): Promise<Season> {
  const db = load(); const b = bucket(db, ws); (b.seasons ||= []); const n = normalizeSeason(ws, input); b.seasons.push(n); save(db); return n; }
export async function listEpisodes(ws: string, seasonId?: string): Promise<Episode[]> {
  const e = bucket(load(), ws).episodes || []; return bySort(seasonId ? e.filter(x => x.seasonId === seasonId) : e); }
export async function createEpisode(ws: string, input: Partial<Episode>): Promise<Episode> {
  const db = load(); const b = bucket(db, ws); (b.episodes ||= []); const n = normalizeEpisode(ws, input); b.episodes.push(n); save(db); return n; }
export async function listScenes(ws: string, episodeId?: string): Promise<Scene[]> {
  const s = bucket(load(), ws).scenes || []; return bySort(episodeId ? s.filter(x => x.episodeId === episodeId) : s); }
export async function getScene(ws: string, id: string): Promise<Scene | null> { return (bucket(load(), ws).scenes || []).find(s => s.id === id) ?? null; }
export async function createScene(ws: string, input: Partial<Scene>): Promise<Scene> {
  const db = load(); const b = bucket(db, ws); (b.scenes ||= []); const n = normalizeScene(ws, input); b.scenes.push(n); save(db); return n; }
export async function updateScene(ws: string, id: string, patch: Partial<Scene>): Promise<Scene | null> {
  const db = load(); const b = bucket(db, ws); const s = (b.scenes ||= []).find(x => x.id === id); if (!s) return null;
  if (patch.name != null) s.name = patch.name; if (patch.characterIds != null) s.characterIds = patch.characterIds;
  if (patch.summary != null) s.summary = patch.summary; if (patch.goal != null) s.goal = patch.goal;
  if (patch.output != null) s.output = patch.output; if (patch.status != null) s.status = patch.status;
  if (patch.orderIndex != null) s.orderIndex = patch.orderIndex;
  s.updatedAt = new Date().toISOString(); save(db); return s; }
export async function deleteScene(ws: string, id: string): Promise<void> {
  const db = load(); const b = bucket(db, ws); if (b.scenes) { b.scenes = b.scenes.filter(s => s.id !== id); save(db); } }

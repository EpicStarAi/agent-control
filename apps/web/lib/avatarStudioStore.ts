import fs from "node:fs";
import path from "node:path";
import { normalizeAvatar, normalizePassport, normalizeJob, normalizeAsset,
  type Avatar, type AvatarPassport, type RenderJob, type AvatarAsset } from "@/lib/avatarStudio";

// P27.1 fs fallback (keyed by workspace_id). Same shape as the DB adapter.
const FILE = path.join(process.cwd(), ".avatar-studio-data.json");
type WS = { avatars: Avatar[]; passports: AvatarPassport[]; jobs: RenderJob[]; assets: AvatarAsset[] };
type DB = { ws: Record<string, WS> };
function load(): DB { try { if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {} return { ws: {} }; }
function save(db: DB) { try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch {} }
function bucket(db: DB, ws: string): WS { return (db.ws[ws] ||= { avatars: [], passports: [], jobs: [], assets: [] }); }
const desc = <T extends { updatedAt: string }>(a: T[]) => a.slice().sort((x, y) => (x.updatedAt < y.updatedAt ? 1 : -1));

export async function listAvatars(ws: string): Promise<Avatar[]> { return desc(bucket(load(), ws).avatars); }
export async function getAvatar(ws: string, id: string): Promise<Avatar | null> { return bucket(load(), ws).avatars.find(a => a.id === id) ?? null; }
export async function createAvatar(ws: string, input: Partial<Avatar>): Promise<Avatar> {
  const db = load(); const b = bucket(db, ws); const n = normalizeAvatar(ws, input); b.avatars.push(n); save(db); return n; }
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

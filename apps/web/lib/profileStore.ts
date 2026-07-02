import fs from "node:fs";
import path from "node:path";
import { normalizeProfile, emptyProfile, type WorkspaceProfile } from "@/lib/profile";

// P31 fs fallback for workspace profiles (keyed by workspace_id).
const FILE = path.join(process.cwd(), ".profile-data.json");
type DB = { profiles: Record<string, WorkspaceProfile> };
function load(): DB { try { if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {} return { profiles: {} }; }
function save(db: DB){ try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch {} }

export function getProfile(workspaceId: string): WorkspaceProfile {
  return load().profiles[workspaceId] ?? emptyProfile(workspaceId);
}
export function saveProfile(workspaceId: string, input: Partial<WorkspaceProfile>): { ok: boolean; profile: WorkspaceProfile } {
  const db = load(); const n = normalizeProfile(workspaceId, { ...input, completed: true });
  db.profiles[workspaceId] = n; save(db); return { ok: true, profile: n };
}

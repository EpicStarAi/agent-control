import fs from "node:fs";
import path from "node:path";
import { normalizeOnboarding, emptyOnboarding, type OnboardingState } from "@/lib/onboarding";

// fs fallback for onboarding progress (keyed by workspace_id). Mirrors
// lib/profileStore.ts. Used only when DATABASE_URL is unset. Still server-side —
// never the browser. No secrets are stored here.
const FILE = path.join(process.cwd(), ".onboarding-data.json");
type DB = { states: Record<string, OnboardingState> };
function load(): DB { try { if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {} return { states: {} }; }
function save(db: DB){ try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch {} }

export function getOnboarding(workspaceId: string): OnboardingState {
  return load().states[workspaceId] ?? emptyOnboarding(workspaceId);
}
export function saveOnboarding(workspaceId: string, input: Partial<OnboardingState>): { ok: boolean; state: OnboardingState } {
  const db = load(); const n = normalizeOnboarding(workspaceId, input);
  db.states[workspaceId] = n; save(db); return { ok: true, state: n };
}

import * as db from "@/lib/profileDb";
import * as store from "@/lib/profileStore";
import type { WorkspaceProfile } from "@/lib/profile";

// P31 facade: Postgres when available, else fs. Carries source: "db"|"fallback".
type Src = "db" | "fallback";
export async function getProfile(workspaceId: string): Promise<{ profile: WorkspaceProfile; source: Src }> {
  if (db.enabled()) { try { return { profile: await db.getProfile(workspaceId), source: "db" }; } catch {} }
  return { profile: store.getProfile(workspaceId), source: "fallback" };
}
export async function saveProfile(workspaceId: string, input: Partial<WorkspaceProfile>): Promise<{ ok: boolean; profile: WorkspaceProfile; source: Src }> {
  if (db.enabled()) { try { return { ...(await db.saveProfile(workspaceId, input)), source: "db" }; } catch {} }
  return { ...store.saveProfile(workspaceId, input), source: "fallback" };
}

import * as db from "@/lib/memoryDb";
import * as store from "@/lib/memoryStore";
import type { MemoryEntry, MemoryScope } from "@/lib/memory";

// P34 facade: Postgres when available, else fs. Carries source: "db"|"fallback".
type Src = "db" | "fallback";
export async function listMemory(workspaceId: string, scope?: MemoryScope): Promise<{ entries: MemoryEntry[]; source: Src }> {
  if (db.enabled()) { try { return { entries: await db.listMemory(workspaceId, scope), source: "db" }; } catch {} }
  return { entries: store.listMemory(workspaceId, scope), source: "fallback" };
}
export async function addMemory(workspaceId: string, input: Partial<MemoryEntry>): Promise<{ ok: boolean; entry: MemoryEntry; source: Src }> {
  if (db.enabled()) { try { return { ...(await db.addMemory(workspaceId, input)), source: "db" }; } catch {} }
  return { ...store.addMemory(workspaceId, input), source: "fallback" };
}

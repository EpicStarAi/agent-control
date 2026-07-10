import fs from "node:fs";
import path from "node:path";
import { normalizeEntry, type MemoryEntry, type MemoryScope } from "@/lib/memory";

// P34 fs fallback for workspace memory (keyed by workspace_id). Dedupes on scope+key.
const FILE = path.join(process.cwd(), ".memory-data.json");
type DB = { entries: Record<string, MemoryEntry[]> };
function load(): DB { try { if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {} return { entries: {} }; }
function save(db: DB) { try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch {} }

export function listMemory(workspaceId: string, scope?: MemoryScope): MemoryEntry[] {
  const all = load().entries[workspaceId] ?? [];
  const rows = scope ? all.filter(e => e.scope === scope) : all;
  return rows.slice().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
export function addMemory(workspaceId: string, input: Partial<MemoryEntry>): { ok: boolean; entry: MemoryEntry } {
  const db = load(); const n = normalizeEntry(workspaceId, input);
  const list = db.entries[workspaceId] ?? [];
  const idx = list.findIndex(e => e.scope === n.scope && e.key === n.key);
  if (idx >= 0) { n.id = list[idx].id; list[idx] = n; } else { list.push(n); }
  db.entries[workspaceId] = list; save(db);
  return { ok: true, entry: n };
}

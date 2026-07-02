import fs from "node:fs";
import path from "node:path";
import { normalizeConnection, type Connection } from "@/lib/connections";

// P36 fs fallback for connections (keyed by workspace_id). Dedupes on provider.
const FILE = path.join(process.cwd(), ".connections-data.json");
type DB = { connections: Record<string, Connection[]> };
function load(): DB { try { if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {} return { connections: {} }; }
function save(db: DB) { try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch {} }

export function listConnections(workspaceId: string): Connection[] {
  const all = load().connections[workspaceId] ?? [];
  return all.slice().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
export function setConnection(workspaceId: string, input: Partial<Connection>): { ok: boolean; connection: Connection } {
  const db = load(); const n = normalizeConnection(workspaceId, input);
  const list = db.connections[workspaceId] ?? [];
  const idx = list.findIndex(c => c.provider === n.provider);
  if (idx >= 0) { n.id = list[idx].id; list[idx] = n; } else { list.push(n); }
  db.connections[workspaceId] = list; save(db);
  return { ok: true, connection: n };
}

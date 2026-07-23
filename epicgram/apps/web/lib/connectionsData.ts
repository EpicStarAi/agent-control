import * as db from "@/lib/connectionsDb";
import * as store from "@/lib/connectionsStore";
import { CATALOG, type Connection, type Provider, type ConnStatus, type ProviderClass } from "@/lib/connections";

// P36 facade: Postgres when available, else fs. Carries source: "db"|"fallback".
type Src = "db" | "fallback";

export async function listConnections(workspaceId: string): Promise<{ connections: Connection[]; source: Src }> {
  if (db.enabled()) { try { return { connections: await db.listConnections(workspaceId), source: "db" }; } catch {} }
  return { connections: store.listConnections(workspaceId), source: "fallback" };
}
export async function setConnection(workspaceId: string, input: Partial<Connection>): Promise<{ ok: boolean; connection: Connection; source: Src }> {
  if (db.enabled()) { try { return { ...(await db.setConnection(workspaceId, input)), source: "db" }; } catch {} }
  return { ...store.setConnection(workspaceId, input), source: "fallback" };
}

export interface CatalogItem extends Provider { status: ConnStatus; updatedAt: string | null; }
// Merge the static adapter catalog with the workspace's stored connections.
export async function catalog(workspaceId: string, klass?: ProviderClass): Promise<{ providers: CatalogItem[]; source: Src }> {
  const { connections, source } = await listConnections(workspaceId);
  const byId = new Map(connections.map(c => [c.provider, c]));
  const providers = CATALOG
    .filter(p => !klass || p.klass === klass)
    .map(p => { const c = byId.get(p.id); return { ...p, status: (c?.status ?? "available") as ConnStatus, updatedAt: c?.updatedAt ?? null }; });
  return { providers, source };
}

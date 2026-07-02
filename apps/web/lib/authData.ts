import * as db from "@/lib/authDb";
import * as store from "@/lib/authStore";
import type { User, Workspace } from "@/lib/auth";

// P30 facade: Postgres when available, else fs. Every result carries source: "db"|"fallback".
type Src = "db" | "fallback";
type LoginRes = { ok: boolean; reason?: string; token?: string; user?: User; workspace?: Workspace; source: Src };
type SessRes = { authenticated: boolean; user?: User; workspace?: Workspace; source: Src };

export async function referralLogin(code: string): Promise<LoginRes> {
  if (db.enabled()) { try { return { ...(await db.referralLogin(code)), source: "db" }; } catch {} }
  return { ...store.referralLogin(code), source: "fallback" };
}
export async function getSession(token: string): Promise<SessRes> {
  if (db.enabled()) { try { return { ...(await db.getSession(token)), source: "db" }; } catch {} }
  return { ...store.getSession(token), source: "fallback" };
}
export async function logout(token: string): Promise<{ ok: boolean; source: Src }> {
  if (db.enabled()) { try { return { ...(await db.logout(token)), source: "db" }; } catch {} }
  return { ...store.logout(token), source: "fallback" };
}

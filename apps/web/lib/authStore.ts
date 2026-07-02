import fs from "node:fs";
import path from "node:path";
import { sha256, newId, newToken, devReferralHash, SESSION_TTL_MS,
  type ReferralCode, type User, type Session, type Workspace } from "@/lib/auth";

// P30 fs fallback. Same rules: only hashes stored; logout expires (no delete).
const FILE = path.join(process.cwd(), ".auth-data.json");
type DB = { codes: ReferralCode[]; users: User[]; sessions: Session[]; workspaces: Workspace[] };

function load(): DB {
  try { if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf8")); } catch {}
  const dev = devReferralHash();
  const db: DB = { codes: [], users: [], sessions: [], workspaces: [] };
  if (dev) db.codes.push({ id:newId("rc"), codeHash:dev, label:"dev", status:"active", maxUses:50, usedCount:0, createdBy:"system", createdAt:new Date().toISOString(), expiresAt:null });
  save(db); return db;
}
function save(db: DB){ try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch {} }

export function referralLogin(code: string): { ok: boolean; reason?: string; token?: string; user?: User; workspace?: Workspace } {
  const db = load(); const c = db.codes.find(x=>x.codeHash===sha256(code||""));
  if (!c) return { ok:false, reason:"invalid" };
  if (c.status !== "active") return { ok:false, reason:"revoked" };
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { ok:false, reason:"expired" };
  if (c.usedCount >= c.maxUses) return { ok:false, reason:"exhausted" };
  const now = new Date().toISOString();
  const user: User = { id:newId("u"), displayName:"Operator", role:"owner", createdAt:now };
  const workspace: Workspace = { id:newId("ws"), ownerUserId:user.id, title:"Personal Workspace", createdAt:now };
  const token = newToken();
  db.users.push(user); db.workspaces.push(workspace);
  db.sessions.push({ id:newId("s"), userId:user.id, tokenHash:sha256(token), expiresAt:new Date(Date.now()+SESSION_TTL_MS).toISOString(), createdAt:now });
  c.usedCount++; if (c.usedCount >= c.maxUses) c.status = "used";
  save(db); return { ok:true, token, user, workspace };
}
export function getSession(token: string): { authenticated: boolean; user?: User; workspace?: Workspace } {
  if (!token) return { authenticated:false };
  const db = load(); const s = db.sessions.find(x=>x.tokenHash===sha256(token));
  if (!s || new Date(s.expiresAt) < new Date()) return { authenticated:false };
  const user = db.users.find(u=>u.id===s.userId);
  const workspace = db.workspaces.find(w=>w.ownerUserId===s.userId);
  return { authenticated:true, user, workspace };
}
export function logout(token: string): { ok: boolean } {
  if (!token) return { ok:true };
  const db = load(); const s = db.sessions.find(x=>x.tokenHash===sha256(token));
  if (s) { s.expiresAt = new Date().toISOString(); save(db); }
  return { ok:true };
}

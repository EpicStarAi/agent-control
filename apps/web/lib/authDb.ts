import { sha256, newId, newToken, devReferralHash, SESSION_TTL_MS,
  type ReferralCode, type User, type Session, type Workspace } from "@/lib/auth";

// P30 Postgres adapter. CREATE TABLE IF NOT EXISTS + seed dev referral code from env only.
// NO DROP/DELETE (logout marks a session expired instead of deleting). Only hashes stored.
type Row = Record<string, unknown>;
type PgPool = { query: (t: string, p?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicPgPool?: PgPool | null; __epicAuthInit?: Promise<void> };

export function enabled(): boolean { return Boolean(process.env.DATABASE_URL); }
async function loadPg(): Promise<any | null> { try { const n = "pg"; return await import(/* webpackIgnore: true */ n); } catch { return null; } }
async function pool(): Promise<PgPool | null> {
  if (!enabled()) return null;
  if (g.__epicPgPool) return g.__epicPgPool;
  const pg = await loadPg(); const Pool = pg?.Pool ?? pg?.default?.Pool; if (!Pool) { g.__epicPgPool = null; return null; }
  g.__epicPgPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 4000 }) as PgPool;
  return g.__epicPgPool;
}
async function ensureInit(p: PgPool): Promise<void> {
  if (!g.__epicAuthInit) g.__epicAuthInit = (async () => {
    await p.query(`CREATE TABLE IF NOT EXISTS referral_codes (
      id text PRIMARY KEY, code_hash text UNIQUE, label text, status text DEFAULT 'active',
      max_uses int DEFAULT 1, used_count int DEFAULT 0, created_by text, created_at timestamptz DEFAULT now(), expires_at timestamptz)`);
    await p.query(`CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY, display_name text, role text DEFAULT 'owner', created_at timestamptz DEFAULT now())`);
    await p.query(`CREATE TABLE IF NOT EXISTS sessions (
      id text PRIMARY KEY, user_id text, token_hash text UNIQUE, expires_at timestamptz, created_at timestamptz DEFAULT now())`);
    await p.query(`CREATE TABLE IF NOT EXISTS workspaces (
      id text PRIMARY KEY, owner_user_id text, title text, created_at timestamptz DEFAULT now())`);
    const dev = devReferralHash();
    if (dev && Number((await p.query(`SELECT count(*)::int n FROM referral_codes`)).rows[0]?.n ?? 0) === 0)
      await p.query(`INSERT INTO referral_codes(id,code_hash,label,status,max_uses,used_count,created_by)
        VALUES($1,$2,'dev','active',50,0,'system') ON CONFLICT (code_hash) DO NOTHING`, [newId("rc"), dev]);
  })();
  return g.__epicAuthInit;
}
async function db(): Promise<PgPool> { const p = await pool(); if (!p) throw new Error("pg unavailable"); await ensureInit(p); return p; }

function uRow(r: any): User { return { id:r.id, displayName:r.display_name, role:r.role, createdAt:new Date(r.created_at).toISOString() }; }
function wRow(r: any): Workspace { return { id:r.id, ownerUserId:r.owner_user_id, title:r.title, createdAt:new Date(r.created_at).toISOString() }; }

export async function referralLogin(code: string): Promise<{ ok: boolean; reason?: string; token?: string; user?: User; workspace?: Workspace }> {
  const p = await db(); const h = sha256(code || "");
  const r = (await p.query(`SELECT * FROM referral_codes WHERE code_hash=$1`, [h])).rows[0] as any;
  if (!r) return { ok: false, reason: "invalid" };
  if (r.status !== "active") return { ok: false, reason: "revoked" };
  if (r.expires_at && new Date(r.expires_at) < new Date()) return { ok: false, reason: "expired" };
  if (Number(r.used_count) >= Number(r.max_uses)) return { ok: false, reason: "exhausted" };
  const now = new Date(); const uid = newId("u"); const wid = newId("ws");
  await p.query(`INSERT INTO users(id,display_name,role,created_at) VALUES($1,'Operator','owner',$2)`, [uid, now.toISOString()]);
  await p.query(`INSERT INTO workspaces(id,owner_user_id,title,created_at) VALUES($1,$2,'Personal Workspace',$3)`, [wid, uid, now.toISOString()]);
  const nextUsed = Number(r.used_count) + 1;
  await p.query(`UPDATE referral_codes SET used_count=$2, status=CASE WHEN $2>=max_uses THEN 'used' ELSE status END WHERE id=$1`, [r.id, nextUsed]);
  const token = newToken(); const exp = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await p.query(`INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at) VALUES($1,$2,$3,$4,$5)`, [newId("s"), uid, sha256(token), exp, now.toISOString()]);
  const user = uRow((await p.query(`SELECT * FROM users WHERE id=$1`, [uid])).rows[0]);
  const workspace = wRow((await p.query(`SELECT * FROM workspaces WHERE id=$1`, [wid])).rows[0]);
  return { ok: true, token, user, workspace };
}
export async function getSession(token: string): Promise<{ authenticated: boolean; user?: User; workspace?: Workspace }> {
  if (!token) return { authenticated: false };
  const p = await db();
  const s = (await p.query(`SELECT * FROM sessions WHERE token_hash=$1`, [sha256(token)])).rows[0] as any;
  if (!s || new Date(s.expires_at) < new Date()) return { authenticated: false };
  const u = (await p.query(`SELECT * FROM users WHERE id=$1`, [s.user_id])).rows[0];
  const w = (await p.query(`SELECT * FROM workspaces WHERE owner_user_id=$1 ORDER BY created_at ASC LIMIT 1`, [s.user_id])).rows[0];
  return { authenticated: true, user: u ? uRow(u) : undefined, workspace: w ? wRow(w) : undefined };
}
export async function logout(token: string): Promise<{ ok: boolean }> {
  if (!token) return { ok: true };
  const p = await db();
  await p.query(`UPDATE sessions SET expires_at=now() WHERE token_hash=$1`, [sha256(token)]); // expire, no DELETE
  return { ok: true };
}

// Bootstrap login — creates an EPICGRAM owner session WITHOUT a referral code.
// Used by the /login CTA so the entry flow can mint a session before /client.
// Creates ONLY the EPICGRAM session (user + workspace + session); NEVER any
// Telegram authorization. No caller-supplied id is trusted — everything is
// generated server-side.
export async function bootstrapLogin(): Promise<{ ok: boolean; token?: string; user?: User; workspace?: Workspace }> {
  const p = await db();
  const now = new Date(); const uid = newId("u"); const wid = newId("ws");
  await p.query(`INSERT INTO users(id,display_name,role,created_at) VALUES($1,'Operator','owner',$2)`, [uid, now.toISOString()]);
  await p.query(`INSERT INTO workspaces(id,owner_user_id,title,created_at) VALUES($1,$2,'Personal Workspace',$3)`, [wid, uid, now.toISOString()]);
  const token = newToken(); const exp = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await p.query(`INSERT INTO sessions(id,user_id,token_hash,expires_at,created_at) VALUES($1,$2,$3,$4,$5)`, [newId("s"), uid, sha256(token), exp, now.toISOString()]);
  const user = uRow((await p.query(`SELECT * FROM users WHERE id=$1`, [uid])).rows[0]);
  const workspace = wRow((await p.query(`SELECT * FROM workspaces WHERE id=$1`, [wid])).rows[0]);
  return { ok: true, token, user, workspace };
}

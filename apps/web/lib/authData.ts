import * as db from "@/lib/authDb";
import * as store from "@/lib/authStore";
import { isFsAuthFallbackAllowed } from "@/lib/authFallbackPolicy.js";
import type { User, Workspace } from "@/lib/auth";

// P30 facade: Postgres, with an OPT-IN filesystem fallback for local dev.
//
// P0 consolidation — why the fallback is no longer silent:
// this used to be `if (db.enabled()) { try { return db... } catch {} } return store...`.
// Any Postgres error — connection refused, auth failure, a migration that had
// not been applied, a transient network blip — was swallowed and the request
// silently continued against `.auth-data.json` on the local disk. In production
// that turns a database outage into an authentication substitution: sessions and
// referral codes get read from (and written to) a file that the real system does
// not consider authoritative, and nothing in the response says so.
//
// Rules now:
//   * DATABASE_URL set  -> Postgres is the ONLY source of truth. A DB error
//     propagates to the caller (500) instead of degrading into the file store.
//   * The filesystem store is used only when there is no DATABASE_URL at all,
//     or when it is explicitly opted into for local dev via
//     EPICGRAM_ALLOW_FS_AUTH_FALLBACK=true — which is refused outright when
//     NODE_ENV=production, so setting it on a prod host cannot re-open the hole.
//
// Every result still carries source: "db" | "fallback" so callers and tests can
// assert which path answered.

type Src = "db" | "fallback";
type LoginRes = { ok: boolean; reason?: string; token?: string; user?: User; workspace?: Workspace; source: Src };
type SessRes = { authenticated: boolean; user?: User; workspace?: Workspace; source: Src };

// The policy itself lives in lib/authFallbackPolicy.js so node:test can assert
// it without a TypeScript build (same convention as localApprovalFallback.js).
const fsFallbackAllowed = () => isFsAuthFallbackAllowed();

// Runs `op` against Postgres when configured. On failure the error propagates
// unless the fs fallback is explicitly allowed for this (non-production) env.
async function withDb<T extends object>(
  op: () => Promise<T>,
  fallback: () => T
): Promise<T & { source: Src }> {
  if (db.enabled()) {
    try {
      return { ...(await op()), source: "db" as const };
    } catch (error) {
      if (!fsFallbackAllowed()) throw error;
      // Local dev only: keep working without a database, but say so loudly.
      console.warn("[auth] Postgres unavailable; using fs fallback (local dev opt-in).");
    }
  } else if (!fsFallbackAllowed()) {
    // No DATABASE_URL and no explicit opt-in: the fs store is still the only
    // thing available, so use it, but make the degraded mode visible.
    console.warn("[auth] DATABASE_URL is not set; auth is running on the fs store.");
  }
  return { ...fallback(), source: "fallback" as const };
}

export async function referralLogin(code: string): Promise<LoginRes> {
  return withDb(() => db.referralLogin(code), () => store.referralLogin(code));
}
export async function getSession(token: string): Promise<SessRes> {
  return withDb(() => db.getSession(token), () => store.getSession(token));
}
export async function logout(token: string): Promise<{ ok: boolean; source: Src }> {
  return withDb(() => db.logout(token), () => store.logout(token));
}

import { isProductionRuntime } from "./localApprovalFallback.js";

// P0 — referral/session storage policy.
//
// Postgres is the source of truth for referral codes and sessions. The
// filesystem store (.auth-data.json) is a local-development convenience only.
// Letting it answer in production turns a database outage into an
// authentication substitution: logins get validated against a file the real
// system does not consider authoritative.
//
// Kept in plain .js, next to localApprovalFallback.js, so the policy can be
// asserted directly from node:test without a TypeScript build step. It reuses
// isProductionRuntime so that EPICGRAM_RUNTIME_MODE=production also closes the
// door, not just NODE_ENV.
export function isFsAuthFallbackAllowed(env = process.env) {
  if (isProductionRuntime(env)) return false;
  return String(env.EPICGRAM_ALLOW_FS_AUTH_FALLBACK || "").trim().toLowerCase() === "true";
}

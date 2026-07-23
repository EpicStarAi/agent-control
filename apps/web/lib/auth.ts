import crypto from "node:crypto";

// P30 Access Gate / Referral Auth — model. Referral code = gate into the closed system,
// NOT Telegram authorization (that is a later layer). SAFE: only code_hash / token_hash
// are stored (never the raw code/token). No secrets logged.

export type CodeStatus = "active" | "used" | "revoked";

export interface ReferralCode {
  id: string; codeHash: string; label: string; status: CodeStatus;
  maxUses: number; usedCount: number; createdBy: string; createdAt: string; expiresAt: string | null;
}
export interface ReferralRedemption {
  id: string;
  referralCodeId: string;
  userId: string;
  workspaceId: string;
  redeemedAt: string;
}
export interface User { id: string; displayName: string; role: string; createdAt: string; }
export interface Session { id: string; userId: string; tokenHash: string; expiresAt: string; createdAt: string; }
export interface Workspace { id: string; ownerUserId: string; title: string; createdAt: string; }

export const SESSION_COOKIE = "epic_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d

export function sha256(s: string){ return crypto.createHash("sha256").update(String(s)).digest("hex"); }
export function newId(p: string){ return `${p}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`; }
export function newToken(){ return crypto.randomBytes(32).toString("hex"); }

// Dev referral code is seeded ONLY from env (EPIC_DEV_REFERRAL). If unset, no seed code exists
// and the gate stays closed until a code is provisioned. The raw value is never returned/logged.
export function devReferralHash(): string | null {
  const v = process.env.EPIC_DEV_REFERRAL;
  return v ? sha256(v) : null;
}

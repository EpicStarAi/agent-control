export function stagingOwnerAccountId(role?: string): string | null {
  const enabled = String(process.env.EPICGRAM_STAGING_OWNER_MODE || "").trim().toLowerCase() === "true";
  const token = String(process.env.EPICGRAM_BACKEND_SERVICE_TOKEN || "").trim();
  const accountId = String(process.env.EPICGRAM_STAGING_OWNER_ACCOUNT_ID || "owner").trim();

  if (!enabled || token.length < 32 || String(role || "").toLowerCase() !== "owner") return null;
  return /^[a-zA-Z0-9_-]{1,64}$/.test(accountId) ? accountId : null;
}

export function isProductionRuntime(env = process.env) {
  return env.NODE_ENV === "production" || env.EPICGRAM_RUNTIME_MODE === "production";
}

export function isLocalApprovalFallbackAllowed(env = process.env) {
  if (isProductionRuntime(env)) return false;
  if (String(env.LOCAL_APPROVAL_FALLBACK_ENABLED || "").toLowerCase() !== "true") return false;
  if (env.NODE_ENV === "development") return true;
  if (env.EPICGRAM_RUNTIME_MODE === "candidate") return true;
  return env.NODE_ENV === "test" && String(env.EPICGRAM_ALLOW_TEST_LOCAL_APPROVAL_FALLBACK || "").toLowerCase() === "true";
}

export function approvalStorageUnavailableReason(env = process.env) {
  if (isProductionRuntime(env)) return "approval_db_required";
  return "approval_storage_unavailable";
}

export function trustedSendApprovalFromHeaders(headers, env = process.env) {
  const expected = String(env.EPICGRAM_INTERNAL_SEND_SECRET || "");
  if (expected.length < 16) return false;
  const got = String(headers?.["x-epicgram-internal-send-secret"] || "");
  return got === expected;
}

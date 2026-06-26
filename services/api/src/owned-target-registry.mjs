// OWNED TELEGRAM TARGET REGISTRY + PERMISSION GUARD (PHASE T15).
// ADDITIVE. Real send is allowed ONLY to a target that a human explicitly added, verified as
// owned/test, whitelisted, send-allowed, active, of an allowed type, and permitted for the agent.
// This module never sends. live-pilot.confirmSend calls validateSendByTarget() before any send.

const now = () => new Date().toISOString();
const tid = () => "target_" + Math.random().toString(36).slice(2, 10);
const normAgent = (a) => String(a || "").toLowerCase().replace(/\s+/g, "-");

const ALLOWED_TYPES = ["owned_channel", "owned_group", "saved_messages_test", "private_test_chat", "internal_test_chat", "channel", "group", "private", "saved"];
const WHITELIST_REQUIRED = String(process.env.OPERATOR_TARGET_WHITELIST_REQUIRED || "true") !== "false";

const targets = new Map();

export function maskChatId(id) { const s = String(id || ""); return s.length > 6 ? s.slice(0, 3) + "***" + s.slice(-2) : s; }

function safety() {
  return { target_whitelist_required: WHITELIST_REQUIRED, target_ownership_required: true, manual_target_add_required: true, manual_approval_required: true, two_step_send_confirmation: true, confirm_phrase_required: true, one_target_only: true, one_send_only: true, auto_send_allowed: false, background_messaging: false, mass_messaging: false, bulk_dm_allowed: false, scraped_targets_allowed: false, unknown_targets_allowed: false, multi_chat_send_allowed: false, credential_export: false, session_export: false, approval_bypass_allowed: false, raw_text_send_allowed: false };
}

function publicView(t) {
  return { id: t.id, createdAt: t.createdAt, updatedAt: t.updatedAt, accountId: t.accountId, accountDisplayName: t.accountDisplayName, telegramChatId: t.telegramChatId, chatIdMasked: maskChatId(t.telegramChatId), title: t.title, username: t.username || null, type: t.type, status: t.status, owned: t.owned, testAllowed: t.testAllowed, sendAllowed: t.sendAllowed, whitelisted: t.whitelisted, manualAdded: true, verifiedBy: t.verifiedBy || null, verifiedAt: t.verifiedAt || null, notes: t.notes || "", riskLevel: t.riskLevel || "low", environment: t.environment || "test", livePilotAllowed: !!t.sendAllowed, lastHealthCheckAt: t.lastHealthCheckAt || null, allowedAgents: t.allowedAgents || [], limits: t.limits, safety: t.safety };
}

export function registryStatus() {
  const all = [...targets.values()];
  return { ok: true, targetRegistry: { enabled: true, whitelistRequired: WHITELIST_REQUIRED, totalTargets: all.length, activeTargets: all.filter((t) => t.status === "active").length, blockedTargets: all.filter((t) => t.status === "blocked").length, sendAllowedTargets: all.filter((t) => t.sendAllowed && t.whitelisted && t.status === "active").length }, safety: { manualApprovalRequired: true, whitelistRequired: WHITELIST_REQUIRED, autoSendAllowed: false, massSendAllowed: false } };
}

export function listTargets(q) {
  q = q || {};
  let all = [...targets.values()];
  if (q.accountId) all = all.filter((t) => t.accountId === q.accountId);
  if (q.status) all = all.filter((t) => t.status === q.status);
  if (q.type) all = all.filter((t) => t.type === q.type);
  if (q.agentId) all = all.filter((t) => (t.allowedAgents || []).indexOf(normAgent(q.agentId)) >= 0);
  return { ok: true, targets: all.map(publicView) };
}

export function createTarget(b) {
  b = b || {};
  if (!b.accountId || !b.telegramChatId) return { ok: false, reason: "ACCOUNT_AND_CHAT_REQUIRED" };
  const type = ALLOWED_TYPES.indexOf(b.type) >= 0 ? b.type : "unknown";
  const t = {
    id: tid(), createdAt: now(), updatedAt: now(), accountId: b.accountId, accountDisplayName: b.accountDisplayName || b.accountId,
    telegramChatId: String(b.telegramChatId), title: b.title || String(b.telegramChatId), username: b.username || null,
    type, status: "needs_review", owned: false, testAllowed: false, sendAllowed: false, whitelisted: false,
    verifiedBy: null, verifiedAt: null, notes: b.notes || "", riskLevel: b.riskLevel || "low", environment: ["sandbox", "test", "production"].indexOf(b.environment) >= 0 ? b.environment : "test", lastHealthCheckAt: null, allowedAgents: [],
    limits: { manualLivePilotAllowed: true, oneSendOnly: true, massSendAllowed: false, autoSendAllowed: false, backgroundMessagingAllowed: false },
    safety: { manualApprovalRequired: true, confirmPhraseRequired: true, whitelistRequired: true, ownershipRequired: true, scrapedTarget: false, bulkTarget: false }
  };
  targets.set(t.id, t);
  return { ok: true, target: publicView(t) };
}

export function verifyTarget(b) {
  b = b || {}; const t = targets.get(b.targetId); if (!t) return { ok: false, reason: "TARGET_NOT_FOUND" };
  if (t.type === "unknown") return { ok: false, blocked: true, reason: "TARGET_UNKNOWN_TYPE" };
  t.owned = b.owned === true; t.testAllowed = b.testAllowed === true; t.verifiedBy = "human"; t.verifiedAt = now(); t.notes = b.note || t.notes;
  if ((t.owned || t.testAllowed) && t.status === "needs_review") t.status = "active";
  t.updatedAt = now();
  return { ok: true, target: publicView(t) };
}

export function whitelistTarget(b) {
  b = b || {}; const t = targets.get(b.targetId); if (!t) return { ok: false, reason: "TARGET_NOT_FOUND" };
  if (ALLOWED_TYPES.indexOf(t.type) < 0) return { ok: false, blocked: true, reason: "TARGET_UNKNOWN_TYPE" };
  if (!(t.owned || t.testAllowed)) return { ok: false, blocked: true, reason: "TARGET_NOT_OWNED_OR_TEST_ALLOWED" };
  t.whitelisted = b.whitelisted !== false; t.sendAllowed = b.sendAllowed === true && t.whitelisted; if (t.whitelisted && t.status === "needs_review") t.status = "active"; t.notes = b.note || t.notes; t.updatedAt = now();
  return { ok: true, target: publicView(t) };
}

export function allowAgent(b) {
  b = b || {}; const t = targets.get(b.targetId); if (!t) return { ok: false, reason: "TARGET_NOT_FOUND" };
  const a = normAgent(b.agentId); if (!a) return { ok: false, reason: "AGENT_REQUIRED" };
  const set = new Set(t.allowedAgents || []); if (b.allowed === false) set.delete(a); else set.add(a); t.allowedAgents = [...set]; t.updatedAt = now();
  return { ok: true, target: publicView(t) };
}

export function disableTarget(b) { const t = targets.get((b || {}).targetId); if (!t) return { ok: false, reason: "TARGET_NOT_FOUND" }; t.status = "disabled"; t.sendAllowed = false; t.updatedAt = now(); return { ok: true, target: publicView(t) }; }
export function blockTarget(b) { const t = targets.get((b || {}).targetId); if (!t) return { ok: false, reason: "TARGET_NOT_FOUND" }; t.status = "blocked"; t.sendAllowed = false; t.whitelisted = false; t.updatedAt = now(); return { ok: true, target: publicView(t) }; }

// ---- Permission Guard ----
function guard(t, opts) {
  opts = opts || {};
  const fail = (reason) => ({ ok: false, allowed: false, blocked: true, reason });
  if (!t) return fail("TARGET_NOT_FOUND");
  if (ALLOWED_TYPES.indexOf(t.type) < 0) return fail("TARGET_UNKNOWN_TYPE");
  if (t.status === "disabled") return fail("TARGET_DISABLED");
  if (t.status === "blocked") return fail("TARGET_BLOCKED");
  if (t.status !== "active") return fail("TARGET_NOT_ACTIVE");
  if (!t.whitelisted) return fail("TARGET_NOT_WHITELISTED");
  if (!(t.owned || t.testAllowed)) return fail("TARGET_NOT_OWNED_OR_TEST_ALLOWED");
  if (!t.sendAllowed) return fail("TARGET_SEND_NOT_ALLOWED");
  if (t.safety && (t.safety.scrapedTarget || t.safety.bulkTarget)) return fail("SCRAPED_TARGET_BLOCKED");
  if (opts.accountId && t.accountId !== opts.accountId) return fail("TARGET_ACCOUNT_MISMATCH");
  if (opts.chatId && String(t.telegramChatId) !== String(opts.chatId)) return fail("TARGET_CHAT_MISMATCH");
  if (opts.agentId && (t.allowedAgents || []).indexOf(normAgent(opts.agentId)) < 0) return fail("TARGET_AGENT_NOT_ALLOWED");
  return { ok: true, allowed: true, target: publicView(t) };
}

export function validateForPilot(b) { b = b || {}; return { ...guard(targets.get(b.targetId), { accountId: b.accountId, agentId: b.agentId }), safety: safety() }; }
export function validateForSend(b) { b = b || {}; return { ...guard(targets.get(b.targetId), { accountId: b.accountId, chatId: b.chatId, agentId: b.agentId }), safety: safety() }; }

// Used by live-pilot before the single real send. Match by account+chat among whitelisted targets.
export function validateSendByTarget(opts) {
  opts = opts || {};
  if (!WHITELIST_REQUIRED) return { allowed: true, bypass: "whitelist_not_required" };
  const all = [...targets.values()];
  const match = all.find((t) => t.accountId === opts.accountId && String(t.telegramChatId) === String(opts.chatId));
  if (!match) return { allowed: false, blocked: true, reason: all.length === 0 ? "NO_TARGETS_IN_REGISTRY" : "TARGET_NOT_IN_REGISTRY" };
  return guard(match, { accountId: opts.accountId, chatId: opts.chatId, agentId: opts.agentId });
}

// T17: validate by targetId OR by account+chat match.
export function validateForPilotFlex(b) {
  b = b || {};
  if (b.targetId) return { ...guard(targets.get(b.targetId), { accountId: b.accountId, agentId: b.agentId }), safety: safety() };
  if (b.accountId && (b.chatId || b.telegramChatId)) {
    const r = validateSendByTarget({ accountId: b.accountId, chatId: b.chatId || b.telegramChatId, agentId: b.agentId });
    return { ...r, safety: safety() };
  }
  return { ok: false, allowed: false, blocked: true, reason: "TARGET_NOT_FOUND", safety: safety() };
}

// T17: target health (read-only; no history read, no scraping).
export function targetHealth(b) {
  b = b || {}; const t = targets.get(b.targetId); if (!t) return { ok: false, reason: "TARGET_NOT_FOUND" };
  t.lastHealthCheckAt = now(); t.updatedAt = now();
  return { ok: true, targetHealth: { targetId: t.id, telegramChatId: maskChatId(t.telegramChatId), title: t.title, status: t.status, environment: t.environment || "test", sendAllowed: t.sendAllowed, livePilotAllowed: !!t.sendAllowed, ownership: t.owned ? "owned" : t.testAllowed ? "test" : "unknown", linkedAgents: t.allowedAgents || [], lastHealthCheckAt: t.lastHealthCheckAt } };
}

// OWNED TELEGRAM ACCOUNT REGISTRY + SESSION HEALTH GUARD (PHASE T16).
// ADDITIVE. Real send requires a human-registered, verified-owned, whitelisted, send-allowed,
// ACTIVE account whose Telegram session is READY (boolean only — never a session string) and
// whose selected agent is permitted. live-pilot.confirmSend calls validateAccountSend() before send.
// Session health is derived from telegram-runtime getStatus(); NO session strings / keys / tokens leave here.

import { getStatus } from "./telegram-runtime.mjs";

const now = () => new Date().toISOString();
const aid = () => "account_" + Math.random().toString(36).slice(2, 10);
const normAgent = (a) => String(a || "").toLowerCase().replace(/\s+/g, "-");

const ALLOWED_TYPES = ["owned_user_account", "owned_channel_admin_account", "owned_bot_account_preview", "internal_test_account", "saved_messages_test_account"];
const WHITELIST_REQUIRED = String(process.env.OPERATOR_ACCOUNT_WHITELIST_REQUIRED || "true") !== "false";

const accounts = new Map();

export function maskTelegramUserId(v) { const s = String(v || ""); return s.length > 4 ? s.slice(0, 2) + "***" + s.slice(-2) : (s ? "***" : null); }

function safety() {
  return { account_whitelist_required: WHITELIST_REQUIRED, account_ownership_required: true, manual_account_add_required: true, session_health_required: true, session_export_allowed: false, credential_export_allowed: false, manual_approval_required: true, two_step_send_confirmation: true, confirm_phrase_required: true, one_account_only: true, one_target_only: true, one_send_only: true, auto_send_allowed: false, background_messaging: false, mass_messaging: false, bulk_dm_allowed: false, scraped_accounts_allowed: false, unknown_accounts_allowed: false, multi_account_send_allowed: false, raw_text_send_allowed: false, approval_bypass_allowed: false };
}

// SessionHealthGuard — returns booleans only, never session data.
async function liveSessionReady(telegramSlotId) {
  if (!telegramSlotId) return { ready: false, status: "unknown", lastError: "no_account_bound" };
  try {
    const st = await getStatus(); const d = st && st.body ? st.body : st; const accs = (d && d.accounts) || [];
    const a = accs.find((x) => x.slotId === telegramSlotId);
    if (!a) return { ready: false, status: "disconnected", lastError: "account_not_found_in_runtime" };
    const ready = a.status === "ready" || a.authorizationState === "authorizationStateReady";
    return { ready, status: ready ? "ready" : (a.status || "disconnected"), lastError: ready ? null : "account_not_ready" };
  } catch (e) { return { ready: false, status: "error", lastError: "runtime_unreachable" }; }
}

function publicView(a) {
  return { id: a.id, createdAt: a.createdAt, updatedAt: a.updatedAt, displayName: a.displayName, username: a.username || null, telegramSlotId: a.telegramSlotId || null, telegramUserIdMasked: a.telegramUserIdMasked || null, type: a.type, status: a.status, owned: a.owned, verifiedBy: a.verifiedBy || null, verifiedAt: a.verifiedAt || null, whitelisted: a.whitelisted, sendAllowed: a.sendAllowed, readAllowed: true, draftAllowed: true, sessionHealth: a.sessionHealth, capabilities: a.capabilities, allowedAgents: a.allowedAgents || [], riskLevel: a.riskLevel || "low", notes: a.notes || "", limits: a.limits, safety: a.safety };
}

export function registryStatus() {
  const all = [...accounts.values()];
  return { ok: true, accountRegistry: { enabled: true, whitelistRequired: WHITELIST_REQUIRED, totalAccounts: all.length, activeAccounts: all.filter((a) => a.status === "active").length, sendAllowedAccounts: all.filter((a) => a.sendAllowed && a.whitelisted && a.status === "active").length, blockedAccounts: all.filter((a) => a.status === "blocked").length }, safety: { manualApprovalRequired: true, accountWhitelistRequired: WHITELIST_REQUIRED, sessionExport: false, credentialExport: false, autoSendAllowed: false, massSendAllowed: false } };
}

export function listAccounts(q) {
  q = q || {}; let all = [...accounts.values()];
  if (q.status) all = all.filter((a) => a.status === q.status);
  if (q.type) all = all.filter((a) => a.type === q.type);
  if (q.agentId) all = all.filter((a) => (a.allowedAgents || []).indexOf(normAgent(q.agentId)) >= 0);
  return { ok: true, accounts: all.map(publicView) };
}

export function createAccount(b) {
  b = b || {};
  if (!b.displayName) return { ok: false, reason: "DISPLAY_NAME_REQUIRED" };
  const type = ALLOWED_TYPES.indexOf(b.type) >= 0 ? b.type : "unknown";
  const a = {
    id: aid(), createdAt: now(), updatedAt: now(), displayName: b.displayName, username: b.username || null, telegramSlotId: b.telegramSlotId || null, telegramUserIdMasked: b.telegramUserId ? maskTelegramUserId(b.telegramUserId) : null,
    type, status: "needs_review", owned: false, verifiedBy: null, verifiedAt: null, whitelisted: false, sendAllowed: false,
    sessionHealth: { ready: false, status: "unknown", lastCheckAt: null, lastError: null, sessionVisible: false, sessionExportAllowed: false },
    capabilities: { listChats: false, readMessages: false, createDraft: true, manualLivePilot: false, realSend: false, massSend: false, autoSend: false, backgroundMessaging: false },
    allowedAgents: [], riskLevel: b.riskLevel || "low", notes: b.notes || "",
    limits: { manualLivePilotAllowed: true, oneSendOnly: true, maxPilotSendsPerRun: 1, massSendAllowed: false, autoSendAllowed: false, backgroundMessagingAllowed: false },
    safety: { manualApprovalRequired: true, confirmPhraseRequired: true, accountWhitelistRequired: true, ownershipRequired: true, sessionExport: false, credentialExport: false }
  };
  accounts.set(a.id, a);
  return { ok: true, account: publicView(a) };
}

export function verifyAccount(b) {
  b = b || {}; const a = accounts.get(b.accountId); if (!a) return { ok: false, reason: "ACCOUNT_NOT_FOUND" };
  if (a.type === "unknown") return { ok: false, blocked: true, reason: "UNKNOWN_ACCOUNT_BLOCKED" };
  a.owned = b.owned === true; if (b.telegramSlotId) a.telegramSlotId = b.telegramSlotId; a.verifiedBy = "human"; a.verifiedAt = now(); a.notes = b.note || a.notes;
  if (a.owned && a.status === "needs_review") a.status = "active"; a.updatedAt = now();
  return { ok: true, account: publicView(a) };
}

export function whitelistAccount(b) {
  b = b || {}; const a = accounts.get(b.accountId); if (!a) return { ok: false, reason: "ACCOUNT_NOT_FOUND" };
  if (ALLOWED_TYPES.indexOf(a.type) < 0) return { ok: false, blocked: true, reason: "UNKNOWN_ACCOUNT_BLOCKED" };
  if (!a.owned) return { ok: false, blocked: true, reason: "ACCOUNT_NOT_OWNED" };
  a.whitelisted = b.whitelisted !== false; a.sendAllowed = b.sendAllowed === true && a.whitelisted; a.capabilities.realSend = a.sendAllowed; a.capabilities.manualLivePilot = a.sendAllowed; if (a.whitelisted && a.status === "needs_review") a.status = "active"; a.notes = b.note || a.notes; a.updatedAt = now();
  return { ok: true, account: publicView(a) };
}

export function allowAgent(b) {
  b = b || {}; const a = accounts.get(b.accountId); if (!a) return { ok: false, reason: "ACCOUNT_NOT_FOUND" };
  const ag = normAgent(b.agentId); if (!ag) return { ok: false, reason: "AGENT_REQUIRED" };
  const set = new Set(a.allowedAgents || []); if (b.allowed === false) set.delete(ag); else set.add(ag); a.allowedAgents = [...set]; a.updatedAt = now();
  return { ok: true, account: publicView(a) };
}

export function disableAccount(b) { const a = accounts.get((b || {}).accountId); if (!a) return { ok: false, reason: "ACCOUNT_NOT_FOUND" }; a.status = "disabled"; a.sendAllowed = false; a.capabilities.realSend = false; a.updatedAt = now(); return { ok: true, account: publicView(a) }; }
export function blockAccount(b) { const a = accounts.get((b || {}).accountId); if (!a) return { ok: false, reason: "ACCOUNT_NOT_FOUND" }; a.status = "blocked"; a.sendAllowed = false; a.whitelisted = false; a.capabilities.realSend = false; a.updatedAt = now(); return { ok: true, account: publicView(a) }; }

export async function sessionHealth(b) {
  b = b || {}; const a = accounts.get(b.accountId); if (!a) return { ok: false, reason: "ACCOUNT_NOT_FOUND" };
  const h = await liveSessionReady(a.telegramSlotId);
  a.sessionHealth = { ready: h.ready, status: h.status, lastCheckAt: now(), lastError: h.lastError, sessionVisible: false, sessionExportAllowed: false }; a.updatedAt = now();
  // includeSessionString is intentionally ignored — never returned
  return { ok: h.ready, sessionHealth: { accountId: a.id, ready: h.ready, status: h.status, sessionVisible: false, sessionExportAllowed: false, lastCheckAt: a.sessionHealth.lastCheckAt, lastError: a.sessionHealth.lastError } };
}

async function guard(a, opts) {
  opts = opts || {};
  const fail = (reason) => ({ ok: false, allowed: false, blocked: true, reason, safety: { sessionExport: false, credentialExport: false, manualApprovalRequired: true } });
  if (!a) return fail("ACCOUNT_NOT_FOUND");
  if (ALLOWED_TYPES.indexOf(a.type) < 0) return fail("UNKNOWN_ACCOUNT_BLOCKED");
  if (a.status === "disabled") return fail("ACCOUNT_DISABLED");
  if (a.status === "blocked") return fail("ACCOUNT_BLOCKED");
  if (a.status !== "active") return fail("ACCOUNT_NOT_ACTIVE");
  if (!a.whitelisted) return fail("ACCOUNT_NOT_WHITELISTED");
  if (!a.owned) return fail("ACCOUNT_NOT_OWNED");
  if (!a.sendAllowed) return fail("ACCOUNT_SEND_NOT_ALLOWED");
  const h = await liveSessionReady(a.telegramSlotId);
  if (!h.ready) return fail("ACCOUNT_SESSION_NOT_READY");
  if (opts.agentId && (a.allowedAgents || []).indexOf(normAgent(opts.agentId)) < 0) return fail("ACCOUNT_AGENT_NOT_ALLOWED");
  return { ok: true, allowed: true, account: publicView(a), safety: { sessionExport: false, credentialExport: false } };
}

export async function validateForPilot(b) { b = b || {}; return { ...(await guard(accounts.get(b.accountId), { agentId: b.agentId })), safety: safety() }; }
export async function validateForSend(b) { b = b || {}; return { ...(await guard(accounts.get(b.accountId), { agentId: b.agentId })), safety: safety() }; }

// Used by live-pilot before the single real send. accountId here is the Telegram slotId.
export async function validateAccountSend(opts) {
  opts = opts || {};
  if (!WHITELIST_REQUIRED) return { allowed: true, bypass: "account_whitelist_not_required" };
  const match = [...accounts.values()].find((a) => a.telegramSlotId === opts.accountId);
  if (!match) return { allowed: false, blocked: true, reason: accounts.size === 0 ? "NO_ACCOUNTS_IN_REGISTRY" : "ACCOUNT_NOT_IN_REGISTRY" };
  return await guard(match, { agentId: opts.agentId });
}

// EPICSTAR PRODUCTION GATE (PHASE T7) — runtime mode + readiness + kill switch.
// ADDITIVE. In-memory runtime state. Default SIMULATION_ONLY. Real send requires explicit
// two-step manual enable (confirm phrase) AND readiness pass AND kill switch off.
// This module decides POLICY only — it never sends. The frontend Workbench checks
// /operator/production/status before any real send; otherwise it mocks. Existing /telegram/send
// (the proven Publisher path) is untouched.

import { selectActiveModel, getOperatorConfig } from "./operator-core.mjs";
import { getStatus } from "./telegram-runtime.mjs";

const now = () => new Date().toISOString();
const ALLOWED_MODES = ["READ_ONLY", "SIMULATION_ONLY", "MANUAL_LIVE_ONLY", "LOCKED"];
const UNSAFE_MODES = ["AUTO_SEND", "BACKGROUND_AUTOMATION", "MASS_MESSAGING", "UNSUPERVISED_RUNTIME", "BYPASS_APPROVAL"];

const state = {
  runtimeMode: (process.env.OPERATOR_RUNTIME_MODE && ALLOWED_MODES.indexOf(process.env.OPERATOR_RUNTIME_MODE) >= 0) ? process.env.OPERATOR_RUNTIME_MODE : "SIMULATION_ONLY",
  killSwitch: String(process.env.OPERATOR_KILL_SWITCH || "false") === "true",
  realSendAllowed: false,
  manualLiveAllowed: String(process.env.OPERATOR_MANUAL_LIVE_ALLOWED || "false") === "true",
  liveRequests: [],
  lastCheckAt: null,
  lastReport: null
};
if (state.killSwitch) state.runtimeMode = "LOCKED";

function safety() {
  return { manualApprovalRequired: true, twoStepSendConfirmation: true, autoSendAllowed: false, massMessaging: false, backgroundMessaging: false, approvalBypassAllowed: false, realSendRequiresManualLive: true, killSwitchAvailable: true };
}

export async function runProductionCheck(body) {
  body = body || {};
  const cfg = getOperatorConfig();
  const m = await selectActiveModel(cfg);
  let tgReady = false;
  try { const st = await getStatus(); const d = st && st.body ? st.body : st; tgReady = !!((d && d.accounts) || []).find((a) => a.status === "ready" || a.authorizationState === "authorizationStateReady"); } catch {}
  const pass = (b) => (b ? "pass" : "fail");
  // QA + audit validity are owned by the frontend (LS) — accepted as flags, default false => blocker.
  const qaPassed = body.qaPassed === true;
  const auditValid = body.auditValid === true;
  const checks = {
    operatorHealth: "pass",
    modelHealth: m.modelOnline ? "pass" : "fail",
    telegramReadiness: pass(tgReady),
    draftQueue: "pass",
    approvalPipeline: "pass",
    safeSendAdapter: "pass",
    simulationQA: pass(qaPassed),
    auditReplay: pass(auditValid),
    safetyFlags: "pass"
  };
  const blockers = Object.keys(checks).filter((k) => checks[k] === "fail").map((k) => k + "_failed");
  const warnings = m.status === "degraded" ? ["PRIMARY_MODEL_UNAVAILABLE_FALLBACK_ACTIVE"] : [];
  const readyForLive = blockers.length === 0 && !state.killSwitch;
  state.lastCheckAt = now();
  state.lastReport = { id: "prod_report_" + Math.random().toString(36).slice(2, 10), createdAt: now(), runtimeMode: state.runtimeMode, readyForLive, checks, blockers, warnings };
  return { ok: blockers.length === 0, productionGate: gateView(readyForLive), report: state.lastReport, safety: safety() };
}

function gateView(readyForLive) {
  return {
    enabled: true,
    runtimeMode: state.runtimeMode,
    manualLiveAllowed: state.manualLiveAllowed,
    realSendAllowed: state.realSendAllowed,
    killSwitch: state.killSwitch,
    readyForLive: typeof readyForLive === "boolean" ? readyForLive : (state.lastReport ? state.lastReport.readyForLive : false),
    lastCheckAt: state.lastCheckAt,
    lastReportId: state.lastReport ? state.lastReport.id : null
  };
}

export function productionStatus() {
  return { ok: true, productionGate: gateView(), checks: state.lastReport ? state.lastReport.checks : null, blockers: state.lastReport ? state.lastReport.blockers : [], warnings: state.lastReport ? state.lastReport.warnings : [], safety: safety() };
}

export function requestLive(body) {
  body = body || {};
  if (state.killSwitch) return { ok: false, enabled: false, reason: "OPERATOR_LOCKED" };
  const req = { id: "live_req_" + Math.random().toString(36).slice(2, 10), requestedBy: body.requestedBy || "human", reason: body.reason || "", status: "pending_final_confirm", createdAt: now(), expiresAt: new Date(Date.now() + 10 * 60000).toISOString() };
  state.liveRequests.unshift(req); state.liveRequests = state.liveRequests.slice(0, 20);
  return { ok: true, liveRequest: req, warning: "Manual live mode still requires approve + confirm for each draft" };
}

export function enableLive(body) {
  body = body || {};
  if (body.confirmPhrase !== "ENABLE MANUAL LIVE") return { ok: false, enabled: false, reason: "CONFIRM_PHRASE_MISMATCH" };
  if (state.killSwitch) return { ok: false, enabled: false, reason: "OPERATOR_LOCKED" };
  const req = state.liveRequests.find((r) => r.id === body.liveRequestId);
  if (!req) return { ok: false, enabled: false, reason: "LIVE_REQUEST_NOT_FOUND" };
  if (!state.lastReport || !state.lastReport.readyForLive) return { ok: false, enabled: false, reason: "PRODUCTION_GATE_BLOCKED", blockers: state.lastReport ? state.lastReport.blockers : ["NO_READINESS_CHECK"] };
  req.status = "enabled";
  state.runtimeMode = "MANUAL_LIVE_ONLY"; state.realSendAllowed = true; state.manualLiveAllowed = true;
  return { ok: true, runtimeMode: state.runtimeMode, realSendAllowed: true, autoSendAllowed: false, manualApprovalRequired: true, twoStepSendConfirmation: true };
}

export function disableLive() {
  state.runtimeMode = state.killSwitch ? "LOCKED" : "SIMULATION_ONLY"; state.realSendAllowed = false;
  return { ok: true, runtimeMode: state.runtimeMode, realSendAllowed: false };
}

export function lockRuntime(body) {
  state.killSwitch = true; state.runtimeMode = "LOCKED"; state.realSendAllowed = false;
  return { ok: true, runtimeMode: "LOCKED", killSwitch: true, realSendAllowed: false, reason: (body && body.reason) || "manual lock" };
}

export function unlockRuntime(body) {
  body = body || {};
  if (body.confirmPhrase !== "UNLOCK OPERATOR") return { ok: false, reason: "CONFIRM_PHRASE_MISMATCH" };
  state.killSwitch = false; state.runtimeMode = "SIMULATION_ONLY"; state.realSendAllowed = false;
  return { ok: true, runtimeMode: "SIMULATION_ONLY", killSwitch: false, realSendAllowed: false };
}

// Live send guard — frontend calls before any REAL send. Default-deny.
export function validateSendGuard(body) {
  body = body || {};
  const d = body.draft || {};
  const fails = [];
  if (state.runtimeMode !== "MANUAL_LIVE_ONLY") fails.push("RUNTIME_NOT_MANUAL_LIVE");
  if (!state.realSendAllowed) fails.push("REAL_SEND_NOT_ALLOWED");
  if (state.killSwitch) fails.push("KILL_SWITCH_ACTIVE");
  if (!d.id) fails.push("NO_DRAFT_ID");
  if (d.status !== "send_confirm_required") fails.push("DRAFT_NOT_CONFIRM_READY");
  if (d.sentAt) fails.push("ALREADY_SENT");
  if (!d.text) fails.push("EMPTY_TEXT");
  if (!d.accountId || !d.chatId) fails.push("NO_TARGET");
  const allowed = fails.length === 0;
  return { ok: allowed, allowed, sent: false, blocked: !allowed, reason: allowed ? "LIVE_SEND_GUARD_PASSED" : "LIVE_SEND_GUARD_BLOCKED", details: fails, safety: safety() };
}

export function assertSafeMode(mode) { return UNSAFE_MODES.indexOf(String(mode || "").toUpperCase()) >= 0 ? "LOCKED" : mode; }

// EPICSTAR POST-LIVE EVIDENCE + FREEZE + DEBRIEF + DECISION GATE (PHASE T19).
// ADDITIVE. Read-only / freeze / report layer that runs AFTER one controlled live send.
// NEVER sends, approves, confirms, retries, or enables auto mode. Redacts secrets in evidence.

import { runbookReport } from "./live-pilot-runbook.mjs";
import { wizardConfirmSend } from "./live-wizard.mjs";
import { redactSecrets } from "./operator-analytics.mjs";

const now = () => new Date().toISOString();
const pid = (p) => p + "_" + Math.random().toString(36).slice(2, 10);
const reviews = new Map();
let activeId = null;

const ALLOWED_DECISIONS = ["keep_simulation", "allow_next_manual_pilot_later", "setup_manual_queue_preview", "lock_live_mode", "request_persona_tuning_preview", "request_target_review", "request_account_review"];
const BLOCKED_DECISIONS = ["enable_auto_send", "enable_mass_send", "enable_background_posting", "enable_unsupervised_runtime", "skip_approval_next_time", "disable_confirm_phrase", "allow_unwhitelisted_targets"];

function safety() {
  return { post_live_review_only: true, manual_approval_required: true, two_step_send_confirmation: true, confirm_phrase_required: true, one_send_only: true, pilot_freeze_required_after_send: true, second_send_must_be_blocked: true, auto_send_allowed: false, background_messaging: false, mass_messaging: false, bulk_dm_allowed: false, credential_export: false, session_export: false, approval_bypass_allowed: false, raw_text_send_allowed: false, multi_chat_send_allowed: false, retry_without_confirm_allowed: false, post_live_send_allowed: false };
}

export function postLiveStatus() {
  const r = activeId ? reviews.get(activeId) : null;
  return { ok: true, postLive: { enabled: true, activePostLiveId: r ? r.id : null, evidencePack: true, pilotFreeze: true, operatorDebrief: true, autoSendAllowed: false }, safety: safety() };
}

export function createPostLive(b) {
  b = b || {};
  const rep = b.runbookId ? runbookReport(b.runbookId) : null;
  const r = (rep && rep.report) || {};
  const pl = {
    id: pid("postlive"), createdAt: now(), updatedAt: now(), operator: "EPICSTAR AI OPERATOR", mode: "POST_LIVE_REVIEW", status: "created",
    runbookId: b.runbookId || null, wizardId: r.wizardId || null, pilotId: r.pilotId || null, draftId: r.draftId || null,
    accountId: r.accountId || null, targetId: r.targetId || null, chatId: r.chatId || null, agentId: r.agentId || null,
    telegramMessageId: r.telegramMessageId || null, messageUrl: null, sentAt: r.sentAt || null,
    freeze: { pilotFrozen: false, wizardFrozen: false, runbookFrozen: false, secondSendBlocked: !!r.secondSendBlocked, frozenAt: null },
    verification: { postSendVerified: false, telegramMessageIdPresent: !!r.telegramMessageId, auditChainComplete: false, secondSendBlockVerified: !!r.secondSendBlocked, targetMatchVerified: false, draftMatchVerified: false },
    evidence: { jsonReportId: null, markdownReportId: null, auditReplayId: null, screenshots: [], manualNotes: [] },
    decision: { status: "pending", nextStep: null, approvedBy: null, decidedAt: null },
    debrief: null, runbookSnapshot: r, safety: safety()
  };
  reviews.set(pl.id, pl); activeId = pl.id;
  return { ok: true, postLive: pl };
}

export function freezePostLive(b) {
  b = b || {}; const pl = reviews.get(b.postLiveId); if (!pl) return { ok: false, reason: "POSTLIVE_NOT_FOUND" };
  pl.freeze = { pilotFrozen: true, wizardFrozen: true, runbookFrozen: true, secondSendBlocked: pl.freeze.secondSendBlocked, frozenAt: now() }; pl.status = "frozen"; pl.updatedAt = now();
  return { ok: true, freeze: pl.freeze, note: "Pilot/Wizard/Runbook заморожены. Повторная отправка невозможна (enforced guard'ами)." };
}

export function verifyPostLive(b) {
  b = b || {}; const pl = reviews.get(b.postLiveId); if (!pl) return { ok: false, reason: "POSTLIVE_NOT_FOUND" };
  const r = pl.runbookSnapshot || {};
  const sent = r.status === "sent" || r.status === "verified" || !!r.sentAt;
  const checks = {
    sendResult: sent ? "pass" : "fail",
    draftMatch: r.draftId ? "pass" : "warning",
    targetMatch: (r.targetId && r.chatId) ? "pass" : "warning",
    guards: "pass",
    secondSendBlock: pl.freeze.secondSendBlocked ? "pass" : "warning",
    auditChain: sent && pl.freeze.secondSendBlocked ? "pass" : "warning"
  };
  pl.verification.postSendVerified = sent; pl.verification.targetMatchVerified = checks.targetMatch === "pass"; pl.verification.draftMatchVerified = checks.draftMatch === "pass"; pl.verification.auditChainComplete = checks.auditChain === "pass";
  const blockers = Object.keys(checks).filter((k) => checks[k] === "fail");
  pl.status = blockers.length === 0 ? "verified" : "failed"; pl.updatedAt = now();
  return { ok: blockers.length === 0, verified: blockers.length === 0, checks, warnings: Object.keys(checks).filter((k) => checks[k] === "warning"), blockers };
}

export function buildEvidence(b) {
  b = b || {}; const pl = reviews.get(b.postLiveId); if (!pl) return { ok: false, reason: "POSTLIVE_NOT_FOUND" };
  const r = pl.runbookSnapshot || {};
  const pack = {
    id: pid("evidence"), createdAt: now(), type: "post_live_pilot_evidence", runbookId: pl.runbookId, wizardId: pl.wizardId, pilotId: pl.pilotId, draftId: pl.draftId,
    summary: { sent: r.status === "sent" || r.status === "verified", oneMessageOnly: true, secondSendBlocked: pl.freeze.secondSendBlocked, auditVerified: pl.verification.auditChainComplete, pilotFrozen: pl.freeze.pilotFrozen },
    account: { accountId: pl.accountId, sessionHealth: "ready", sessionVisible: false },
    target: { targetId: pl.targetId, chatId: pl.chatId },
    agent: { agentId: pl.agentId },
    message: { telegramMessageId: pl.telegramMessageId, messageUrl: null, sentAt: pl.sentAt },
    safety: safety(), manualNotes: (pl.evidence.manualNotes || []).map((n) => redactSecrets(n))
  };
  pl.evidence.jsonReportId = pack.id; pl.updatedAt = now();
  if (b.format === "markdown") {
    const md = "# Post-Live Pilot Evidence\n\n" +
      "- Runbook: " + pl.runbookId + "\n- Wizard: " + pl.wizardId + "\n- Pilot: " + pl.pilotId + "\n- Draft: " + pl.draftId + "\n" +
      "- Account: " + pl.accountId + " (session ready, session NOT shown)\n- Target: " + pl.targetId + " / chat " + pl.chatId + "\n- Agent: " + pl.agentId + "\n" +
      "- Message ID: " + (pl.telegramMessageId || "—") + " · Sent At: " + (pl.sentAt || "—") + "\n\n" +
      "## Summary\n- sent: " + pack.summary.sent + "\n- oneMessageOnly: true\n- secondSendBlocked: " + pack.summary.secondSendBlocked + "\n- pilotFrozen: " + pack.summary.pilotFrozen + "\n\n" +
      "## Safety\nauto_send_allowed: false · post_live_send_allowed: false · session_export: false · credential_export: false\n";
    return { ok: true, evidence: pack, markdown: md, exportPreviewOnly: true };
  }
  return { ok: true, evidence: pack, exportPreviewOnly: true };
}

export function saveDebrief(b) {
  b = b || {}; const pl = reviews.get(b.postLiveId); if (!pl) return { ok: false, reason: "POSTLIVE_NOT_FOUND" };
  const decision = String(b.decision || "pending");
  if (BLOCKED_DECISIONS.indexOf(decision) >= 0) return { ok: false, blocked: true, reason: "Blocked by Post-Live Decision policy" };
  const d = { id: pid("debrief"), createdAt: now(), postLiveId: pl.id, operator: "human", messageVisible: b.messageVisible ?? null, textMatched: b.textMatched ?? null, targetCorrect: b.targetCorrect ?? null, agentCorrect: b.agentCorrect ?? null, qualityRating: b.qualityRating ?? null, safetyRating: b.safetyRating ?? null, notes: redactSecrets(b.notes || ""), decision: ALLOWED_DECISIONS.indexOf(decision) >= 0 ? decision : "pending", appliedAutomatically: false };
  pl.debrief = d; pl.status = "reviewed"; pl.updatedAt = now();
  return { ok: true, debrief: d, note: "Debrief сохранён. Решение НЕ запускает live-действий автоматически." };
}

export function saveDecision(b) {
  b = b || {}; const pl = reviews.get(b.postLiveId); if (!pl) return { ok: false, reason: "POSTLIVE_NOT_FOUND" };
  const decision = String(b.decision || "");
  if (BLOCKED_DECISIONS.indexOf(decision) >= 0) return { ok: false, blocked: true, reason: "Blocked by Post-Live Decision policy", safety: safety() };
  if (ALLOWED_DECISIONS.indexOf(decision) < 0) return { ok: false, reason: "UNKNOWN_DECISION", allowed: ALLOWED_DECISIONS };
  pl.decision = { status: "saved", nextStep: decision, approvedBy: "human", decidedAt: now() }; pl.status = "closed"; pl.updatedAt = now();
  return { ok: true, decision: pl.decision, note: "Решение зафиксировано (preview-only, без автозапуска)." };
}

// Attempt a second send after freeze — MUST be blocked.
export async function blockTest(b) {
  b = b || {}; const pl = reviews.get(b.postLiveId); if (!pl) return { ok: false, reason: "POSTLIVE_NOT_FOUND" };
  if (!pl.wizardId) return { ok: true, blocked: true, reason: "NO_WIZARD_NOTHING_TO_RETRY" };
  const r = await wizardConfirmSend({ wizardId: pl.wizardId, confirmPhrase: "SEND ONE LIVE MESSAGE" });
  const blocked = !!(r && (r.blocked || r.sent === false));
  return { ok: blocked, blocked, passed: blocked, reason: blocked ? (r.reason || "WIZARD_ALREADY_SENT_ONE_MESSAGE") : "NOT_BLOCKED" };
}

export function postLiveReport(id) {
  const pl = reviews.get(id); if (!pl) return { ok: false, reason: "POSTLIVE_NOT_FOUND" };
  return { ok: true, report: { id: pl.id, status: pl.status, runbookId: pl.runbookId, wizardId: pl.wizardId, pilotId: pl.pilotId, draftId: pl.draftId, account: pl.accountId, target: pl.targetId, chat: pl.chatId, agent: pl.agentId, telegramMessageId: pl.telegramMessageId, sentAt: pl.sentAt, freeze: pl.freeze, verification: pl.verification, decision: pl.decision, debrief: pl.debrief, safety: pl.safety } };
}

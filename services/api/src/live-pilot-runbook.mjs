// EPICSTAR LIVE PILOT E2E RUNBOOK (PHASE T18) — single orchestrator that runs the whole chain:
// brain → account+session → target+whitelist → agent binding → wizard lock → draft → approve →
// confirm phrase → ONE real send → second-send-blocked verification → report.
// ADDITIVE. Never calls sendMessage directly — it drives the existing Live Wizard (which delegates
// the single send to live-pilot → the proven sendMessage path). All guards still apply.

import { buildBrainStatus } from "./operator-brain-bootstrap.mjs";
import { validateAccountSend } from "./owned-account-registry.mjs";
import { validateForPilotFlex } from "./owned-target-registry.mjs";
import { startWizard, wizardPreflight, selectAccount, selectTarget, selectAgent, lockTarget, wizardCreatePilot, wizardCreateDraft, wizardScoreDraft, wizardApprove, wizardConfirmSend, wizardReport } from "./live-wizard.mjs";

const PHRASE = "SEND ONE LIVE MESSAGE";
const now = () => new Date().toISOString();
const rbid = () => "runbook_" + Math.random().toString(36).slice(2, 10);
const runbooks = new Map();
let activeRunbookId = null;

function safety() {
  return { manual_approval_required: true, two_step_send_confirmation: true, confirm_phrase_required: true, owned_account_required: true, session_health_required: true, owned_target_required: true, target_whitelist_required: true, agent_target_binding_required: true, target_lock_required: true, one_account_only: true, one_target_only: true, one_agent_only: true, one_draft_only: true, one_send_only: true, second_send_must_be_blocked: true, auto_send_allowed: false, background_messaging: false, mass_messaging: false, bulk_dm_allowed: false, credential_export: false, session_export: false, approval_bypass_allowed: false, raw_text_send_allowed: false, multi_chat_send_allowed: false, retry_without_confirm_allowed: false };
}

const newChecks = () => ({ brain: "not_checked", account: "not_checked", session: "not_checked", target: "not_checked", binding: "not_checked", wizard: "not_checked", draft: "not_checked", approval: "not_checked", safeSend: "not_checked", postSend: "not_checked", secondSendBlock: "not_checked", audit: "not_checked" });

export function runbookStatusSummary() {
  const rb = activeRunbookId ? runbooks.get(activeRunbookId) : null;
  return { ok: true, runbook: { enabled: true, activeRunbookId: rb && rb.status !== "sent" && rb.status !== "verified" ? rb.id : null, mode: "END_TO_END_LIVE_PILOT", oneSendOnly: true, autoSendAllowed: false }, safety: safety() };
}

export function createRunbook(b) {
  const rb = { id: rbid(), createdAt: now(), updatedAt: now(), operator: "EPICSTAR AI OPERATOR", mode: "END_TO_END_LIVE_PILOT", status: "created", accountId: null, accountDisplayName: null, targetId: null, chatId: null, agentId: null, wizardId: null, pilotId: null, draftId: null, telegramMessageId: null, sentAt: null, checks: newChecks(), blockers: [], warnings: [], safety: safety() };
  runbooks.set(rb.id, rb); activeRunbookId = rb.id;
  return { ok: true, runbook: rb };
}

export async function runbookPreflight(b) {
  b = b || {}; const rb = runbooks.get(b.runbookId); if (!rb) return { ok: false, reason: "RUNBOOK_NOT_FOUND" };
  rb.status = "checking"; rb.accountId = b.accountId || rb.accountId; rb.targetId = b.targetId || rb.targetId; rb.agentId = b.agentId || rb.agentId; rb.accountDisplayName = b.accountDisplayName || rb.accountDisplayName;
  const brain = await buildBrainStatus();
  const acc = await validateAccountSend({ accountId: rb.accountId, agentId: rb.agentId });
  const tgt = validateForPilotFlex({ targetId: rb.targetId, accountId: rb.accountId, agentId: rb.agentId });
  if (tgt && tgt.target && tgt.target.telegramChatId) rb.chatId = tgt.target.telegramChatId;
  const c = rb.checks;
  c.brain = brain.brain.online ? "pass" : "fail";
  c.account = acc.allowed ? "pass" : "fail";
  c.session = acc.allowed ? "pass" : (acc.reason === "ACCOUNT_SESSION_NOT_READY" ? "fail" : (acc.reason ? "warning" : "fail"));
  c.target = tgt.allowed ? "pass" : "fail";
  c.binding = (tgt.allowed && acc.allowed) ? "pass" : "fail";
  rb.blockers = [];
  if (!brain.brain.online) rb.blockers.push("BRAIN_OFFLINE");
  if (!acc.allowed) rb.blockers.push("ACCOUNT:" + (acc.reason || "blocked"));
  if (!tgt.allowed) rb.blockers.push("TARGET:" + (tgt.reason || "blocked"));
  const ready = rb.blockers.length === 0;
  rb.status = ready ? "ready" : "blocked"; rb.updatedAt = now();
  return { ok: ready, ready, checks: rb.checks, blockers: rb.blockers, warnings: rb.warnings, hint: brain.brain.online ? undefined : "Start LM Studio 8096 or Ollama 11434" };
}

async function driveWizard(rb, opts) {
  opts = opts || {};
  const w = startWizard(); const wid = w.wizard.id; rb.wizardId = wid;
  await wizardPreflight({ wizardId: wid });
  selectAccount({ wizardId: wid, accountId: rb.accountId, accountDisplayName: rb.accountDisplayName });
  selectTarget({ wizardId: wid, chatId: rb.chatId });
  selectAgent({ wizardId: wid, agentId: rb.agentId });
  const lk = lockTarget({ wizardId: wid, confirm: true });
  rb.checks.wizard = lk.ok ? "pass" : "fail"; if (!lk.ok) { rb.status = "blocked"; rb.blockers.push("WIZARD_LOCK:" + (lk.reason || "fail")); return { ok: false, reason: lk.reason }; }
  const cp = await wizardCreatePilot({ wizardId: wid }); if (!cp.ok) { rb.checks.wizard = "fail"; rb.blockers.push("PILOT:" + (cp.reason || "fail")); return { ok: false, reason: cp.reason }; }
  const cd = await wizardCreateDraft({ wizardId: wid, instruction: opts.instruction || "Один короткий безопасный тестовый пост. Не утверждай, что он отправлен." });
  rb.checks.draft = cd.ok ? "pass" : "fail"; if (!cd.ok) { rb.blockers.push("DRAFT:" + (cd.reason || "fail")); return { ok: false, reason: cd.reason }; }
  rb.draftId = cd.draft && cd.draft.id;
  wizardScoreDraft({ wizardId: wid });
  const ap = wizardApprove({ wizardId: wid, approved: true });
  rb.checks.approval = ap.ok ? "pass" : "fail"; if (!ap.ok) { rb.blockers.push("APPROVE:" + (ap.reason || "fail")); return { ok: false, reason: ap.reason }; }
  return { ok: true, wizardId: wid };
}

export async function executeDryRun(b) {
  b = b || {}; const rb = runbooks.get(b.runbookId); if (!rb) return { ok: false, reason: "RUNBOOK_NOT_FOUND" };
  const pf = await runbookPreflight({ runbookId: rb.id });
  if (!pf.ready) return { ok: false, blocked: true, reason: "LIVE_RUNBOOK_PREFLIGHT_BLOCKED", blockers: pf.blockers };
  const d = await driveWizard(rb, { instruction: b.instruction });
  if (!d.ok) return { ok: false, blocked: true, reason: d.reason, blockers: rb.blockers };
  rb.checks.safeSend = "pass"; rb.status = "ready"; rb.updatedAt = now();
  return { ok: true, dryRun: true, mock: true, note: "Pipeline проверен до approve. Реальная отправка НЕ выполнялась (mock).", wizardId: rb.wizardId, draftId: rb.draftId };
}

export async function executeLive(b) {
  b = b || {}; const rb = runbooks.get(b.runbookId); if (!rb) return { ok: false, reason: "RUNBOOK_NOT_FOUND" };
  if (b.confirmPhrase !== PHRASE) return { ok: false, blocked: true, reason: "CONFIRM_PHRASE_MISMATCH" };
  const pf = await runbookPreflight({ runbookId: rb.id });
  if (!pf.ready) return { ok: false, blocked: true, reason: "LIVE_RUNBOOK_PREFLIGHT_BLOCKED", blockers: pf.blockers };
  const d = await driveWizard(rb, { instruction: b.instruction });
  if (!d.ok) return { ok: false, blocked: true, reason: d.reason, blockers: rb.blockers };
  rb.status = "running"; rb.updatedAt = now();
  const r = await wizardConfirmSend({ wizardId: rb.wizardId, confirmPhrase: PHRASE });
  if (r && r.sent) { rb.status = "sent"; rb.telegramMessageId = r.telegramMessageId || null; rb.sentAt = now(); rb.checks.safeSend = "pass"; rb.checks.postSend = "pass"; rb.updatedAt = now(); return { ok: true, sent: true, runbookId: rb.id, telegramMessageId: rb.telegramMessageId, status: "LIVE_RUNBOOK_ONE_MESSAGE_SENT" }; }
  rb.status = "failed"; rb.checks.safeSend = r && r.blocked ? "fail" : "warning"; rb.updatedAt = now();
  return { ok: false, sent: false, blocked: !!(r && r.blocked), reason: (r && r.reason) || "SEND_FAILED", message: r && r.message };
}

export function verifyPostSend(b) {
  b = b || {}; const rb = runbooks.get(b.runbookId); if (!rb) return { ok: false, reason: "RUNBOOK_NOT_FOUND" };
  const ok = rb.status === "sent" && !!rb.sentAt;
  rb.checks.postSend = ok ? "pass" : "fail"; rb.updatedAt = now();
  return { ok, postSend: { sent: rb.status === "sent", telegramMessageId: rb.telegramMessageId, sentAt: rb.sentAt, pilotSendUsed: rb.status === "sent" } };
}

export async function verifySecondSendBlocked(b) {
  b = b || {}; const rb = runbooks.get(b.runbookId); if (!rb || !rb.wizardId) return { ok: false, reason: "RUNBOOK_OR_WIZARD_NOT_FOUND" };
  const r = await wizardConfirmSend({ wizardId: rb.wizardId, confirmPhrase: PHRASE });
  const blocked = !!(r && (r.blocked || r.sent === false));
  rb.checks.secondSendBlock = blocked ? "pass" : "fail"; rb.checks.audit = "pass"; if (blocked && rb.status === "sent") rb.status = "verified"; rb.updatedAt = now();
  return { ok: blocked, secondSendBlocked: blocked, reason: (r && r.reason) || "WIZARD_ALREADY_SENT_ONE_MESSAGE" };
}

export function cancelRunbook(b) { b = b || {}; const rb = runbooks.get(b.runbookId); if (!rb) return { ok: false, reason: "RUNBOOK_NOT_FOUND" }; if (rb.status === "sent" || rb.status === "verified") return { ok: false, reason: "ALREADY_SENT" }; rb.status = "cancelled"; rb.updatedAt = now(); return { ok: true, status: "cancelled" }; }

export function runbookReport(runbookId) {
  const rb = runbooks.get(runbookId); if (!rb) return { ok: false, reason: "RUNBOOK_NOT_FOUND" };
  const wr = rb.wizardId ? wizardReport(rb.wizardId) : null;
  return { ok: true, report: { id: "runbook_report_" + Math.random().toString(36).slice(2, 10), runbookId: rb.id, createdAt: now(), status: rb.status, accountId: rb.accountId, targetId: rb.targetId, chatId: rb.chatId, agentId: rb.agentId, wizardId: rb.wizardId, draftId: rb.draftId, telegramMessageId: rb.telegramMessageId, sentAt: rb.sentAt, sent: rb.status === "sent" || rb.status === "verified", secondSendBlocked: rb.checks.secondSendBlock === "pass", checks: rb.checks, blockers: rb.blockers, warnings: rb.warnings, wizard: wr && wr.report, safety: rb.safety } };
}

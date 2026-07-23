// EPICSTAR LIVE PILOT EXECUTION WIZARD (PHASE T14) — guided one-send flow with server-enforced
// TARGET LOCK + SECOND-SEND guard. ADDITIVE. The wizard NEVER calls sendMessage directly — it
// delegates the single send to live-pilot.mjs (which uses the proven sendMessage path). After
// target lock, account/chat/agent are immutable for this wizard run.

import { createPilot, createDraft, approveDraft, confirmSend as pilotConfirmSend, pilotReport } from "./live-pilot.mjs";
import { scoreDraft } from "./operator-analytics.mjs";
import { getOperatorConfig, selectActiveModel, getPersona } from "./operator-core.mjs";
import { getStatus } from "./telegram-runtime.mjs";
import { productionStatus } from "./production-gate.mjs";

const now = () => new Date().toISOString();
const wid = () => "wizard_" + Math.random().toString(36).slice(2, 10);
const CONFIRM_PHRASE = "SEND ONE LIVE MESSAGE";
const wizards = new Map();
let activeWizardId = null;

function safety() {
  return { manual_approval_required: true, two_step_send_confirmation: true, confirm_phrase_required: true, target_lock_required: true, one_account_only: true, one_target_only: true, one_agent_only: true, one_draft_only: true, one_send_only: true, auto_send_allowed: false, background_messaging: false, mass_messaging: false, bulk_dm_allowed: false, credential_export: false, session_export: false, approval_bypass_allowed: false, raw_text_send_allowed: false, multi_chat_send_allowed: false, retry_without_confirm_allowed: false };
}

export function wizardStatusSummary() {
  const w = activeWizardId ? wizards.get(activeWizardId) : null;
  return { ok: true, wizard: { enabled: true, activeWizardId: w && !w.sent ? w.id : null, mode: "MANUAL_LIVE_PILOT", oneSendOnly: true, autoSendAllowed: false }, safety: safety() };
}

function view(w) { return { id: w.id, status: w.status, step: w.step, accountId: w.accountId, accountDisplayName: w.accountDisplayName, chatId: w.chatId, chatTitle: w.chatTitle, agentId: w.agentId, agentName: w.agentName, targetLocked: w.targetLocked, pilotId: w.pilotId, draftId: w.draftId, draftText: w.draftText, draftScore: w.draftScore, approved: w.approved, confirmRequired: w.status === "confirm_required", sent: w.sent, telegramMessageId: w.telegramMessageId, sentAt: w.sentAt, secondSendBlocked: w.sent, preflight: w.preflight, safety: w.safety }; }

export function startWizard() {
  const w = { id: wid(), createdAt: now(), updatedAt: now(), operator: "EPICSTAR AI OPERATOR", mode: "MANUAL_LIVE_PILOT", status: "preflight", step: 1, pilotId: null, accountId: null, accountDisplayName: null, chatId: null, chatTitle: null, agentId: null, agentName: null, targetLocked: false, draftId: null, draftText: null, draftScore: null, approved: false, sent: false, telegramMessageId: null, sentAt: null, preflight: null, safety: safety() };
  wizards.set(w.id, w); activeWizardId = w.id;
  return { ok: true, wizard: view(w) };
}

export async function wizardPreflight(body) {
  const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" };
  const cfg = getOperatorConfig(); const m = await selectActiveModel(cfg);
  let tgReady = false; try { const st = await getStatus(); const d = st && st.body ? st.body : st; tgReady = ((d && d.accounts) || []).some((a) => a.status === "ready" || a.authorizationState === "authorizationStateReady"); } catch {}
  const prod = productionStatus();
  const checks = { operatorOnline: m.modelOnline ? "pass" : "fail", brainOnline: m.modelOnline ? "pass" : "fail", telegramSystemReady: tgReady ? "pass" : "fail", draftQueue: "pass", approvalPipeline: "pass", safeSendAdapter: "pass", killSwitchOff: prod.productionGate.killSwitch ? "fail" : "pass", worldOsAvailable: "pass" };
  const blockers = Object.keys(checks).filter((k) => checks[k] === "fail").map((k) => k + "_failed");
  w.preflight = { passed: blockers.length === 0, checks, blockers, warnings: [] }; w.status = blockers.length === 0 ? "target_selection" : "blocked"; w.step = 2; w.updatedAt = now();
  return { ok: w.preflight.passed, preflight: w.preflight };
}

const lockBlock = { ok: false, blocked: true, reason: "TARGET_ALREADY_LOCKED" };

export function selectAccount(body) { const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" }; if (w.targetLocked) return lockBlock; w.accountId = body.accountId || null; w.accountDisplayName = body.accountDisplayName || body.accountId || null; w.step = 3; w.updatedAt = now(); return { ok: true, wizard: view(w) }; }
export function selectTarget(body) { const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" }; if (w.targetLocked) return lockBlock; w.chatId = body.chatId || null; w.chatTitle = body.chatTitle || body.chatId || null; w.chatType = body.chatType || "unknown"; w.step = 4; w.updatedAt = now(); return { ok: true, wizard: view(w) }; }
export function selectAgent(body) { const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" }; if (w.targetLocked) return lockBlock; const p = getPersona(body.agentId); w.agentId = p.agentId; w.agentName = p.name; w.step = 5; w.updatedAt = now(); return { ok: true, wizard: view(w) }; }

export function lockTarget(body) {
  const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" };
  if (w.targetLocked) return lockBlock;
  if (body.confirm !== true) return { ok: false, reason: "CONFIRM_REQUIRED" };
  if (!w.accountId || !w.chatId || !w.agentId) return { ok: false, reason: "INCOMPLETE_TARGET", details: { account: !!w.accountId, chat: !!w.chatId, agent: !!w.agentId } };
  w.targetLocked = true; w.status = "target_locked"; w.step = 6; w.updatedAt = now();
  return { ok: true, targetLocked: true, lockedTarget: { accountId: w.accountId, chatId: w.chatId, agentId: w.agentId } };
}

export async function wizardCreatePilot(body) {
  const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" };
  if (!w.targetLocked) return { ok: false, blocked: true, reason: "TARGET_NOT_LOCKED" };
  const r = await createPilot({ accountId: w.accountId, accountDisplayName: w.accountDisplayName, chatId: w.chatId, chatTitle: w.chatTitle, agentId: w.agentId });
  if (!r.ok) { w.status = "blocked"; return r; }
  w.pilotId = r.pilot.id; w.status = "draft_created"; w.step = 7; w.updatedAt = now();
  return { ok: true, wizard: view(w), pilotStatus: r.pilot.status };
}

export async function wizardCreateDraft(body) {
  const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" };
  if (!w.pilotId) return { ok: false, reason: "NO_PILOT" };
  if (w.draftId && w.status !== "cancelled") return { ok: false, blocked: true, reason: "DRAFT_ALREADY_EXISTS" };
  const r = await createDraft({ pilotId: w.pilotId, instruction: body.instruction || "Create one short safe Telegram post for the selected target and agent. Natural, concise, suitable for manual review. Do not claim it was sent." });
  if (!r.ok) return r;
  w.draftId = r.draft.id; w.draftText = r.draft.text; w.approved = false; w.status = "draft_review"; w.step = 8; w.updatedAt = now();
  return { ok: true, draft: r.draft };
}

export function wizardScoreDraft(body) {
  const w = wizards.get((body || {}).wizardId); if (!w || !w.draftText) return { ok: false, reason: "NO_DRAFT" };
  const s = scoreDraft({ id: w.draftId, text: w.draftText, agentId: w.agentId, chatId: w.chatId });
  w.draftScore = s.score; w.step = 9; w.updatedAt = now();
  return { ok: true, score: s.score };
}

export function wizardUpdateDraft(body) {
  const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" };
  if (w.sent) return { ok: false, blocked: true, reason: "WIZARD_ALREADY_SENT_ONE_MESSAGE" };
  w.draftText = String((body || {}).text || ""); w.approved = false; w.status = "draft_review"; w.updatedAt = now();
  return { ok: true, draft: { id: w.draftId, text: w.draftText, status: "waiting_for_review", approved: false } };
}

export function wizardApprove(body) {
  const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" };
  if (body.approved !== true) return { ok: false, reason: "NOT_APPROVED" };
  const r = approveDraft({ pilotId: w.pilotId, draftId: w.draftId, approved: true, reviewer: "human" });
  if (!r.ok) return r;
  w.approved = true; w.status = "confirm_required"; w.step = 11; w.updatedAt = now();
  return { ok: true, draft: { status: "send_confirm_required", approved: true, sent: false }, nextStep: "confirm_live_send" };
}

export async function wizardConfirmSend(body) {
  const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, blocked: true, reason: "WIZARD_NOT_FOUND" };
  if (w.sent) return { ok: false, blocked: true, reason: "WIZARD_ALREADY_SENT_ONE_MESSAGE" };
  if (!w.targetLocked) return { ok: false, blocked: true, reason: "TARGET_NOT_LOCKED" };
  if (w.status !== "confirm_required") return { ok: false, blocked: true, reason: "DRAFT_NOT_APPROVED" };
  if (body.confirmPhrase !== CONFIRM_PHRASE) { w.updatedAt = now(); return { ok: false, blocked: true, reason: "CONFIRM_PHRASE_MISMATCH" }; }
  w.status = "sending"; w.step = 12; w.updatedAt = now();
  const r = await pilotConfirmSend({ pilotId: w.pilotId, draftId: w.draftId, confirmPhrase: CONFIRM_PHRASE, accountId: w.accountId, chatId: w.chatId });
  if (r && r.sent) { w.sent = true; w.telegramMessageId = r.telegramMessageId || null; w.sentAt = now(); w.status = "sent"; w.step = 13; w.updatedAt = now(); return { ok: true, sent: true, wizardId: w.id, telegramMessageId: w.telegramMessageId, status: "LIVE_WIZARD_MESSAGE_SENT" }; }
  w.sent = true; w.status = "failed"; w.updatedAt = now(); // burn — no auto retry
  return { ok: false, sent: false, blocked: !!(r && r.blocked), reason: (r && r.reason) || "SEND_FAILED", message: r && r.message, note: "Wizard run завершён. Для повторной попытки начни новый wizard." };
}

export function wizardCancel(body) { const w = wizards.get((body || {}).wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" }; if (w.status === "sent") return { ok: false, reason: "ALREADY_SENT" }; w.status = "cancelled"; w.updatedAt = now(); return { ok: true, status: "cancelled" }; }

export function wizardReport(wizardId) {
  const w = wizards.get(wizardId); if (!w) return { ok: false, reason: "WIZARD_NOT_FOUND" };
  const pr = w.pilotId ? pilotReport(w.pilotId) : null;
  return { ok: true, report: { id: "wizard_report_" + Math.random().toString(36).slice(2, 10), wizardId: w.id, createdAt: now(), status: w.status, account: w.accountDisplayName, chat: w.chatTitle, agent: w.agentName, draftId: w.draftId, draftScore: w.draftScore, approved: w.approved, sent: w.sent, telegramMessageId: w.telegramMessageId, sentAt: w.sentAt, secondSendBlocked: w.sent, targetLocked: w.targetLocked, preflight: w.preflight, pilot: pr && pr.report, safety: w.safety } };
}

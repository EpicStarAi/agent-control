// EPICSTAR MANUAL LIVE PILOT (PHASE T13) — one account, one agent, one chat, one draft, ONE send.
// ADDITIVE. The single real send goes through the proven telegram-runtime sendMessage with
// operatorApproved=true, behind: preflight + manual approve + exact confirm phrase + one-send guard.
// NO auto-send, NO batch, NO multi-chat, NO retry without a brand-new pilot.

import { getStatus, sendMessage } from "./telegram-runtime.mjs";
import { getOperatorConfig, callModel, selectActiveModel, getPersona } from "./operator-core.mjs";
import { productionStatus } from "./production-gate.mjs";
import { validateSendByTarget } from "./owned-target-registry.mjs";
import { validateAccountSend } from "./owned-account-registry.mjs";

const CONFIRM_PHRASE = "SEND ONE LIVE MESSAGE";
const now = () => new Date().toISOString();
const rid = (p) => p + "_" + Math.random().toString(36).slice(2, 10);

const pilots = new Map(); // pilotId -> pilot
let lastPilotId = null;

function safety() {
  return { manualApprovalRequired: true, twoStepSendConfirmation: true, confirmPhraseRequired: true, oneDraftOnly: true, oneTargetOnly: true, oneSendOnly: true, autoSendAllowed: false, backgroundMessaging: false, massMessaging: false, approvalBypassAllowed: false, rawTextSendAllowed: false, multiChatSendAllowed: false, retryWithoutConfirmAllowed: false };
}

export function livePilotStatus() {
  const active = lastPilotId ? pilots.get(lastPilotId) : null;
  return { ok: true, livePilot: { enabled: true, mode: "MANUAL_LIVE_PILOT", activePilotId: active && !active.pilotSendUsed ? active.id : null, lastPilotId, pilotAllowed: false, oneSendOnly: true, autoSendAllowed: false }, safety: safety() };
}

export async function preflight(body) {
  body = body || {};
  const cfg = getOperatorConfig();
  const m = await selectActiveModel(cfg);
  let tgReady = false, accountOk = false;
  try {
    const st = await getStatus(); const d = st && st.body ? st.body : st; const accs = (d && d.accounts) || [];
    const acc = accs.find((a) => (a.slotId === body.accountId) && (a.status === "ready" || a.authorizationState === "authorizationStateReady"));
    accountOk = !!acc; tgReady = accs.some((a) => a.status === "ready" || a.authorizationState === "authorizationStateReady");
  } catch {}
  const prod = productionStatus();
  const tcheck = validateSendByTarget({ accountId: body.accountId, chatId: body.chatId, agentId: body.agentId });
  const checks = {
    operatorOnline: m.modelOnline ? "pass" : "fail",
    brainOnline: m.modelOnline ? "pass" : "fail",
    telegramReady: tgReady ? "pass" : "fail",
    accountSelected: body.accountId ? "pass" : "fail",
    accountReady: accountOk ? "pass" : "fail",
    chatSelected: body.chatId ? "pass" : "fail",
    agentSelected: body.agentId ? "pass" : "warn",
    targetWhitelisted: tcheck.allowed ? "pass" : "fail",
    killSwitchOff: prod.productionGate.killSwitch ? "fail" : "pass",
    safetyFlags: "pass"
  };
  const blockers = Object.keys(checks).filter((k) => checks[k] === "fail").map((k) => k + "_failed");
  const passed = blockers.length === 0;
  return { ok: passed, pilotAllowed: passed, preflight: { passed, checks, blockers, warnings: checks.agentSelected === "warn" ? ["no_agent_selected_neutral_style"] : [] }, safety: safety() };
}

export async function createPilot(body) {
  body = body || {};
  const pf = await preflight(body);
  if (!pf.pilotAllowed) return { ok: false, pilotAllowed: false, reason: "LIVE_PILOT_PREFLIGHT_BLOCKED", blockers: pf.preflight.blockers, preflight: pf.preflight };
  const persona = getPersona(body.agentId);
  const pilot = {
    id: rid("pilot"), createdAt: now(), updatedAt: now(), operator: "EPICSTAR AI OPERATOR", mode: "MANUAL_LIVE_PILOT",
    status: "preflight_passed", accountId: body.accountId, accountDisplayName: body.accountDisplayName || body.accountId,
    chatId: body.chatId, chatTitle: body.chatTitle || body.chatId, agentId: persona.agentId, agentName: persona.name,
    draftId: null, draftText: null, messageId: null, sentAt: null, pilotSendUsed: false,
    preflight: pf.preflight, safety: safety()
  };
  pilots.set(pilot.id, pilot); lastPilotId = pilot.id;
  return { ok: true, pilot };
}

export async function createDraft(body) {
  body = body || {};
  const p = pilots.get(body.pilotId);
  if (!p) return { ok: false, reason: "PILOT_NOT_FOUND" };
  if (p.pilotSendUsed) return { ok: false, blocked: true, reason: "PILOT_SEND_ALREADY_USED" };
  const cfg = getOperatorConfig(); const m = await selectActiveModel(cfg); const persona = getPersona(p.agentId);
  let text = "";
  if (m.modelOnline) {
    const r = await callModel(m.activeModel, [
      { role: "system", content: "You are EPICSTAR AI OPERATOR. Create ONE short, safe Telegram post in the voice of agent " + persona.name + ". MANUAL_APPROVAL_ONLY. Output only the post text." },
      { role: "user", content: String(body.instruction || "Короткий безопасный пост.") }
    ], cfg);
    text = r.ok ? r.text : "";
  }
  if (!text) text = String(body.instruction || "").trim() || "[draft] (укажи instruction; brain offline — текст взят как есть для ручного review)";
  p.draftId = rid("draft"); p.draftText = text; p.status = "draft_created"; p.updatedAt = now();
  return { ok: true, pilotId: p.id, draft: { id: p.draftId, text, status: "waiting_for_review", sent: false } };
}

export function approveDraft(body) {
  body = body || {};
  const p = pilots.get(body.pilotId);
  if (!p) return { ok: false, reason: "PILOT_NOT_FOUND" };
  if (body.draftId !== p.draftId) return { ok: false, blocked: true, reason: "DRAFT_NOT_LINKED_TO_PILOT" };
  if (body.approved !== true) return { ok: false, reason: "NOT_APPROVED" };
  if (p.pilotSendUsed) return { ok: false, blocked: true, reason: "PILOT_SEND_ALREADY_USED" };
  p.status = "send_confirm_required"; p.approvedAt = now(); p.updatedAt = now();
  return { ok: true, draft: { id: p.draftId, status: "send_confirm_required", approved: true, sent: false }, nextStep: "confirm_live_send" };
}

// The single real send. Default-deny guard.
export async function confirmSend(body) {
  body = body || {};
  const p = pilots.get(body.pilotId);
  const fail = (reason) => ({ ok: false, sent: false, blocked: true, reason, safety: safety() });
  if (!p) return fail("PILOT_NOT_FOUND");
  if (p.pilotSendUsed) return fail("PILOT_SEND_ALREADY_USED");
  if (body.draftId !== p.draftId) return fail("DRAFT_NOT_LINKED_TO_PILOT");
  if (p.status !== "send_confirm_required") return fail("DRAFT_NOT_APPROVED");
  if (body.confirmPhrase !== CONFIRM_PHRASE) return fail("CONFIRM_PHRASE_MISMATCH");
  if (!p.accountId || !p.chatId) return fail("NO_TARGET");
  if (!p.draftText) return fail("EMPTY_TEXT");
  if (body.accountId && body.accountId !== p.accountId) return fail("PILOT_TARGET_MISMATCH");
  if (body.chatId && body.chatId !== p.chatId) return fail("PILOT_TARGET_MISMATCH");
  // T15: target must be in the owned/whitelisted registry (or whitelist disabled)
  const areg = await validateAccountSend({ accountId: p.accountId, agentId: p.agentId });
  if (!areg.allowed) return fail("ACCOUNT_PERMISSION_GUARD_BLOCKED:" + (areg.reason || "blocked"));
  const treg = validateSendByTarget({ accountId: p.accountId, chatId: p.chatId, agentId: p.agentId });
  if (!treg.allowed) return fail("TARGET_PERMISSION_GUARD_BLOCKED:" + (treg.reason || "blocked"));
  // exactly one send via the proven path
  p.status = "sending"; p.updatedAt = now();
  let res = null;
  try { res = await sendMessage({ accountId: p.accountId, chatId: p.chatId, text: p.draftText, operatorApproved: true }); } catch (e) { res = { status: 0, body: { message: String(e && e.message || e) } }; }
  const ok = res && res.status >= 200 && res.status < 300 && res.body && res.body.sent !== false;
  p.pilotSendUsed = true; // burn the pilot regardless of outcome — no auto-retry
  p.status = ok ? "sent" : "failed"; p.sentAt = ok ? now() : null; p.messageId = ok ? (res.body && (res.body.messageId || res.body.id)) || null : null; p.updatedAt = now();
  if (!ok) return { ok: false, sent: false, pilotId: p.id, draftId: p.draftId, status: "LIVE_PILOT_SEND_FAILED", message: (res && res.body && res.body.message) || "send failed", note: "Pilot burned — создай новый pilot для повторной попытки." };
  return { ok: true, sent: true, pilotId: p.id, draftId: p.draftId, telegramMessageId: p.messageId, status: "LIVE_PILOT_MESSAGE_SENT" };
}

export function cancelPilot(body) {
  body = body || {};
  const p = pilots.get(body.pilotId);
  if (!p) return { ok: false, reason: "PILOT_NOT_FOUND" };
  if (p.status === "sent") return { ok: false, reason: "ALREADY_SENT" };
  p.status = "cancelled"; p.updatedAt = now();
  return { ok: true, pilotId: p.id, status: "cancelled" };
}

export function pilotReport(pilotId) {
  const p = pilots.get(pilotId);
  if (!p) return { ok: false, reason: "PILOT_NOT_FOUND" };
  return { ok: true, report: { id: rid("pilot_report"), pilotId: p.id, createdAt: now(), status: p.status, account: p.accountDisplayName, chat: p.chatTitle, agent: p.agentName, draftId: p.draftId, sent: p.status === "sent", messageId: p.messageId, sentAt: p.sentAt, pilotSendUsed: p.pilotSendUsed, preflight: p.preflight, safety: p.safety } };
}

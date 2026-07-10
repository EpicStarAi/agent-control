// EPIC☠️GRAM — AI Operator Tool Router v1 (P3.4a). BACKEND-ONLY, NON-DESTRUCTIVE.
//
// Additive layer behind POST /ai/route. It NEVER sends Telegram messages, never
// creates channels, never publishes or schedules. Read/summarize/draft/prepare
// tools produce only drafts or structured suggestions. Any outbound action is
// returned as `proposedAction.status = "pending_approval"` and MUST be executed
// elsewhere through the existing operator approval-card + gated /telegram/send.

import { generateDraftReply } from "./ai-chat.mjs";
import { evaluatePolicy, actionTypeForTool } from "./policy.mjs";
import { appendEvent, sha256 } from "./operator-audit.mjs";
import { parseCompetitors, generateContentPlan, preparePost, proposeSchedule } from "./content-tools.mjs";

// ---- payload normalization (identical contract to P3.1a /ai/suggest) --------
function normalize(payload = {}) {
  const tg = payload?.tgContext ?? {};
  const instruction = payload?.instruction || payload?.command || payload?.prompt || "";
  const history =
    Array.isArray(payload?.history) ? payload.history :
    Array.isArray(payload?.messages) ? payload.messages :
    Array.isArray(tg?.messages) ? tg.messages :
    [];
  const chatId = payload?.chatId || payload?.conversationId || tg?.chatId || null;
  const chatTitle = payload?.chatTitle || tg?.chatTitle || tg?.title || null;
  return { instruction, history, chatId, chatTitle };
}

function normMsgs(history) {
  return (Array.isArray(history) ? history : [])
    .map((x) => ({
      content: String(x?.content ?? x?.text ?? x?.message ?? "").trim(),
      isOutgoing: Boolean(x?.isOutgoing ?? x?.outgoing ?? x?.is_outgoing)
    }))
    .filter((m) => m.content.length > 0);
}

function historyText(msgs, cap = 6000) {
  return msgs.map((m) => `${m.isOutgoing ? "Оператор" : "Собеседник"}: ${m.content}`).join("\n").slice(0, cap);
}

function extractJson(t) {
  if (!t) return null;
  const s = String(t).replace(/```json|```/g, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}

// ---- deterministic intent routing (v1) --------------------------------------
export function detectTool(instruction = "") {
  // NB: JS regex \w / \b do NOT match Cyrillic without the /u flag, so intent
  // patterns use literal stems + dot-globs and key word-starts on whitespace.
  const s = String(instruction).toLowerCase();
  if (/конкурент|competitor/.test(s)) return "parse_competitors";
  if (/расписан|schedule|график.*публик|запланир|календар.*контент/.test(s)) return "propose_schedule";
  if (/контент.?план|content.?plan/.test(s)) return "generate_content_plan";
  if (/подготов.*пост|prepare.?post|напиш.*пост|сдела.*пост|создай.*пост|(^|\s)пост/.test(s)) return "prepare_post";
  if (/послед.*сообщ|сообщ.*послед|последн|last.*mess|recent.*mess/.test(s)) return "get_last_messages";
  if (/суммар|summar|summary|резюм|кратк.*содерж/.test(s)) return "summarize_chat";
  if (/ответ|reply|черновик|draft|предлож/.test(s)) return "draft_reply";
  return "draft_reply"; // safe default: draft only, never sends
}

// ---- output builders --------------------------------------------------------
const SAFETY = { executedExternalAction: false, sendBlocked: true, approvalRequiredForSend: true };

function result(tool, chatId, chatTitle, { text = "", items = [], proposedAction = null, model = null, extra = null } = {}) {
  return {
    ok: true,
    kind: "tool_result",
    tool,
    approvalRequired: !!proposedAction,
    chatId: chatId ?? null,
    chatTitle: chatTitle ?? null,
    model,
    result: { text, items, ...(extra && typeof extra === "object" ? extra : {}) },
    proposedAction,
    safety: { ...SAFETY }
  };
}

function failure(tool, chatId, chatTitle, error, status = 200) {
  return { ok: false, kind: "tool_error", tool, error, chatId: chatId ?? null, chatTitle: chatTitle ?? null, proposedAction: null, safety: { ...SAFETY }, status };
}

// Draft-only proposed action. NEVER executed here — approval-card gates it.
function pendingSend(chatId, chatTitle, text) {
  return { type: "telegram_send", status: "pending_approval", chatId: chatId ?? null, chatTitle: chatTitle ?? null, text };
}

// ---- tools ------------------------------------------------------------------
async function toolReadSelectedChat(n) {
  const items = n.msgs.map((m, i) => ({ idx: i + 1, from: m.isOutgoing ? "operator" : "contact", content: m.content }));
  const text = items.length
    ? `Чат «${n.chatTitle || n.chatId || "—"}»: ${items.length} видимых сообщений.`
    : "Контекст выбранного чата пуст.";
  return result("read_selected_chat", n.chatId, n.chatTitle, { text, items });
}

async function toolGetLastMessages(n) {
  const m = String(n.instruction).match(/\d+/);
  let count = m ? Number(m[0]) : 5;
  count = Math.max(1, Math.min(20, Number.isFinite(count) ? count : 5));
  const last = n.msgs.slice(-count);
  const items = last.map((mm, i) => ({ idx: i + 1, from: mm.isOutgoing ? "operator" : "contact", content: mm.content }));
  const text = items.length ? `Последние ${items.length} сообщений выбранного чата.` : "Контекст выбранного чата пуст.";
  return result("get_last_messages", n.chatId, n.chatTitle, { text, items });
}

async function toolSummarizeChat(n) {
  if (!n.msgs.length) {
    return result("summarize_chat", n.chatId, n.chatTitle, { text: "Контекст выбранного чата пуст — суммаризировать нечего." });
  }
  const r = await generateDraftReply({
    conversationId: n.chatId,
    chatTitle: n.chatTitle,
    history: n.history,
    instruction:
      "По предоставленной истории чата дай структуру: 1) краткое резюме; 2) открытые вопросы; 3) предложенный следующий ответ оператора. Не выдумывай факты, опирайся только на данный контекст."
  });
  if (!r.ok) return failure("summarize_chat", n.chatId, n.chatTitle, r.error);
  return result("summarize_chat", n.chatId, n.chatTitle, { text: r.draft, model: r.model });
}

async function toolDraftReply(n) {
  const r = await generateDraftReply({
    conversationId: n.chatId,
    chatTitle: n.chatTitle,
    history: n.history,
    instruction: n.instruction
  });
  if (!r.ok) return failure("draft_reply", n.chatId, n.chatTitle, r.error);
  const draft = String(r.draft || "").trim();
  const proposed = draft ? pendingSend(n.chatId, n.chatTitle, draft) : null;
  return result("draft_reply", n.chatId, n.chatTitle, { text: draft, proposedAction: proposed, model: r.model });
}

// P3.6a: delegate to content-tools (draft/proposal-only). No crawl/publish/schedule.
async function toolParseCompetitors(n) {
  const c = await parseCompetitors(n);
  if (!c.ok) return failure("parse_competitors", n.chatId, n.chatTitle, c.error || "parse_failed");
  return result("parse_competitors", n.chatId, n.chatTitle, { text: c.text, items: c.items, extra: c.extra, proposedAction: c.proposedAction, model: c.model });
}

async function toolGenerateContentPlan(n) {
  const c = await generateContentPlan(n);
  if (!c.ok) return failure("generate_content_plan", n.chatId, n.chatTitle, c.error || "plan_failed");
  return result("generate_content_plan", n.chatId, n.chatTitle, { text: c.text, items: c.items, extra: c.extra, proposedAction: c.proposedAction, model: c.model });
}

async function toolPreparePost(n) {
  const c = await preparePost(n);
  if (!c.ok) return failure("prepare_post", n.chatId, n.chatTitle, c.error || "post_failed");
  // proposedAction is publish_post/pending_approval — policy blocks it; never executed.
  return result("prepare_post", n.chatId, n.chatTitle, { text: c.text, items: c.items, extra: c.extra, proposedAction: c.proposedAction, model: c.model });
}

async function toolProposeSchedule(n) {
  const c = await proposeSchedule(n);
  if (!c.ok) return failure("propose_schedule", n.chatId, n.chatTitle, c.error || "schedule_failed");
  // proposedAction is schedule_post/pending_approval — policy blocks it; never executed.
  return result("propose_schedule", n.chatId, n.chatTitle, { text: c.text, items: c.items, extra: c.extra, proposedAction: c.proposedAction, model: c.model });
}

const DISPATCH = {
  read_selected_chat: toolReadSelectedChat,
  get_last_messages: toolGetLastMessages,
  summarize_chat: toolSummarizeChat,
  draft_reply: toolDraftReply,
  parse_competitors: toolParseCompetitors,
  generate_content_plan: toolGenerateContentPlan,
  prepare_post: toolPreparePost,
  propose_schedule: toolProposeSchedule
};

// ---- entry point ------------------------------------------------------------
export async function routeCommand(payload = {}) {
  const norm = normalize(payload);
  const msgs = normMsgs(norm.history);
  const ctx = { ...norm, msgs, payload };
  const forced = typeof payload?.tool === "string" && DISPATCH[payload.tool] ? payload.tool : null;
  const tool = forced || detectTool(norm.instruction);
  const fn = DISPATCH[tool] || toolDraftReply;

  let out;
  try {
    out = await fn(ctx);
  } catch (e) {
    out = failure(tool, norm.chatId, norm.chatTitle, String(e?.message || e), 200);
  }

  // Safe log only — never private message bodies.
  console.log(`[ai/route] tool=${tool} chatId=${norm.chatId ?? "-"} chatTitle=${norm.chatTitle ?? "-"} messagesCount=${msgs.length} approvalRequired=${!!out?.approvalRequired} executedExternalAction=false`);
  // P3.5a/P3.6a: non-executing policy decision + operator audit event (returns auditId).
  const actionType = out?.proposedAction?.type || actionTypeForTool(tool);
  const policy = evaluatePolicy({ actionType, tool, source: "ai_route", autoSend: false });
  // Primary event records the PROPOSAL; a separate *_blocked event (below) records
  // the policy block for publish/schedule so both signals are auditable.
  const status = out?.proposedAction ? "pending_approval" : "proposed";
  // Preview/hash ONLY AI-generated draft/summary/plan text — never raw private messages.
  const auditableText =
    out?.proposedAction?.text ||
    (tool === "summarize_chat" || tool === "generate_content_plan" || tool === "prepare_post" || tool === "propose_schedule" ? out?.result?.text : "") ||
    "";
  const safety = { executedExternalAction: false, sendBlocked: true, autoSendBlocked: true, approvalRequiredForSend: true };
  let auditId = null;
  try {
    const rec = appendEvent({
      status,
      actor: "ai",
      source: "ai_route",
      tool,
      actionType,
      chatId: norm.chatId,
      chatTitle: norm.chatTitle,
      model: out?.model || null,
      messageCount: msgs.length,
      preview: auditableText,
      textSha256: auditableText ? sha256(auditableText) : null,
      safety,
      policy
    });
    auditId = rec?.auditId || null;
    // P3.6a: publish/schedule/create actions are blocked — record an explicit
    // *_blocked event linked to the same auditId (never executed).
    if (policy.blocked && auditId) {
      appendEvent({ auditId, status: "blocked", actor: "system", source: "policy", tool, actionType, chatId: norm.chatId, chatTitle: norm.chatTitle, messageCount: 0, safety, policy });
    }
  } catch {}

  if (out && typeof out === "object") {
    out.auditId = auditId;
    out.actionType = actionType;
    out.policy = { allow: policy.allow, reason: policy.reason };
  }

  return out;
}

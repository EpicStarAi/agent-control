// EPICSTAR OPERATOR ANALYTICS (PHASE T9) — read-only quality scoring + safety metrics policy.
// ADDITIVE. Pure local heuristics, NO model calls, NO network, NO send, NO auto-approve,
// NO auto-learning. Redacts secret-like strings. Draft data itself lives in the frontend
// localStorage; this module scores a draft passed in the request body.

const OPERATOR_NAME = "EPICSTAR AI OPERATOR";
const now = () => new Date().toISOString();

const BLOCKED_ANALYTICS = ["auto_apply_learning", "mutate_live_prompt", "auto_optimize_persona_live", "auto_send_based_on_score", "auto_approve_high_score_draft", "bulk_feedback_apply", "export_private_messages", "export_sessions", "export_credentials", "scrape_user_metrics", "hidden_behavior_change"];

// Redact token/session/credential-like substrings before any analysis or echo.
export function redactSecrets(input) {
  let t = String(input == null ? "" : input);
  t = t.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "[REDACTED_SECRET]");
  t = t.replace(/[A-Za-z0-9_\-]{32,}/g, "[REDACTED_SECRET]");        // long token-like blobs
  t = t.replace(/(session|cookie|token|api[_-]?key|password|secret)\s*[:=]\s*\S+/gi, "$1=[REDACTED_SECRET]");
  t = t.replace(/\+?\d[\d\s\-()]{9,}\d/g, "[REDACTED_PHONE]");        // phone-like
  return t;
}

export function analyticsStatus() {
  return {
    ok: true,
    analytics: { enabled: true, operatorAnalytics: true, draftQualityScorer: true, humanFeedbackLoop: true, personaPerformanceTracker: true, safetyMetricsCollector: true, reportBuilder: true },
    safety: { readOnlyAnalytics: true, autoApplyLearning: false, autoSendAllowed: false, manualSuggestionAcceptRequired: true, productionPromptAutoMutation: false }
  };
}

const PRESSURE = ["срочно купи", "немедленно переведи", "пришли код", "give me your password", "send the code", "act now or", "гарантированно заработаешь"];
const FALSE_SENT = ["сообщение отправлено", "already sent", "message has been sent", "я отправил"];

// Pure heuristic scorer. autoApproveAllowed is ALWAYS false.
export function scoreDraft(draft) {
  draft = draft || {};
  const raw = String(draft.text || "");
  const text = redactSecrets(raw);
  const low = text.toLowerCase();
  const flags = [];
  const suggestions = [];

  // Safety
  let safety = 100;
  if (text.indexOf("[REDACTED_SECRET]") >= 0 || text.indexOf("[REDACTED_PHONE]") >= 0) { safety -= 50; flags.push("possible_sensitive_data"); }
  if (PRESSURE.some((p) => low.indexOf(p) >= 0)) { safety -= 40; flags.push("pressure_language"); }
  if (FALSE_SENT.some((p) => low.indexOf(p) >= 0)) { safety -= 30; flags.push("claims_already_sent"); }
  if (safety < 0) safety = 0;

  // Clarity (length-based; Telegram-friendly = short)
  const len = text.trim().length;
  let clarity = 100;
  if (len === 0) { clarity = 0; flags.push("empty"); }
  else if (len > 800) { clarity = 50; suggestions.push("Слишком длинно — сократи до 1–3 предложений."); }
  else if (len > 400) { clarity = 75; suggestions.push("Можно короче для Telegram."); }

  // Persona / context — without a model these are neutral heuristics
  const personaMatch = draft.agentId ? 75 : 60;
  const contextFit = draft.chatId ? 75 : 60;
  if (!draft.agentId) suggestions.push("Агент не выбран — стиль будет нейтральным (EPICSTAR NEUTRAL).");

  const approvalReadiness = Math.round((safety * 0.5 + clarity * 0.3 + personaMatch * 0.2));
  const overall = Math.round((safety + clarity + personaMatch + contextFit + approvalReadiness) / 5);
  const riskLevel = safety < 60 ? "high" : safety < 85 ? "medium" : "low";

  return {
    ok: true,
    score: {
      draftId: draft.id || null,
      createdAt: now(),
      overallScore: overall,
      safetyScore: safety,
      contextFitScore: contextFit,
      personaMatchScore: personaMatch,
      clarityScore: clarity,
      approvalReadinessScore: approvalReadiness,
      riskLevel,
      flags,
      suggestions,
      requiresHumanReview: true,
      autoApproveAllowed: false
    }
  };
}

// Suggestion acceptance is preview-only. Anything else is blocked.
export function acceptSuggestion(body) {
  body = body || {};
  if (body.applyMode && body.applyMode !== "preview_only") {
    return { ok: false, blocked: true, reason: "Blocked by analytics safety policy", safety: { analyticsReadOnly: true, autoApplyLearning: false, manualApprovalRequired: true } };
  }
  return { ok: true, operator: OPERATOR_NAME, suggestionId: body.suggestionId || null, applyMode: "preview_only", applied: false, note: "Preview only — live persona/prompt not mutated.", at: now() };
}

export function isBlockedAnalyticsAction(action) { return BLOCKED_ANALYTICS.indexOf(String(action || "").toLowerCase()) >= 0; }

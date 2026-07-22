// EPICSTAR AI OPERATOR — core (PHASE T2). System-level operator brain selection + policy.
// ADDITIVE: does NOT replace operator-agent.mjs. NEVER sends to Telegram from here — it only
// checks model health, selects the active local brain, enforces command policy, and prepares
// draft previews. All send actions stay behind the existing manual approval + /telegram/send.
// No external AI runtime, no background jobs, no credential/session exposure.

import { getStatus } from "./telegram-runtime.mjs";

const OPERATOR_ID = "epicstar-ai-operator";
const OPERATOR_NAME = "EPICSTAR AI OPERATOR";

const ALLOWED = ["status", "list_chats", "read_messages", "summarize_chat", "suggest_reply", "prepare_message", "create_draft", "test_draft", "explain_action", "clear_operator_errors", "ping_brain"];
const BLOCKED = ["auto_send", "mass_send", "scrape_users", "export_sessions", "bypass_approval", "background_dm", "bulk_dm", "harvest_contacts", "credential_export", "session_export", "silent_publish", "hidden_action"];
const CAPABILITIES = ["status", "list_chats", "read_messages", "summarize_chat", "suggest_reply", "prepare_message", "create_draft", "explain_action", "test_draft"];
const BLOCKED_CAPS = ["auto_send", "mass_send", "scrape_users", "export_sessions", "bypass_approval", "background_dm", "credential_export", "session_export"];

const SYS = `You are EPICSTAR AI OPERATOR, a system-level operator inside DEEPINSIDE / EPICGRAM AgentOS.
You are not a persona, not NOVIKOVA, not EVA, not AI NEWSCASTER.
Your role is to help the human operator manage owned Telegram accounts, channels, drafts, queues, and agent workflows.
You operate in MANUAL_APPROVAL_ONLY mode. You may read allowed context, summarize chats, prepare drafts, suggest replies, explain actions, and create approval requests.
You must not send messages without explicit human approval. No mass messaging, spam, hidden background messaging, user scraping, session export, credential export, or approval bypass.
All send actions must return an approval_required object first. When uncertain, ask for clarification or return a safe blocked response.
Never expose secrets, tokens, cookies, session strings, phone numbers, private credentials, or private keys.`;

const rid = () => "op_" + Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export function getOperatorConfig() {
  return {
    name: process.env.OPERATOR_NAME || OPERATOR_NAME,
    mode: process.env.OPERATOR_MODE || "MANUAL_APPROVAL_ONLY",
    primaryModel: process.env.OPERATOR_PRIMARY_MODEL || process.env.EPICGRAM_AI_MODEL || process.env.EPICGRAM_OPENAI_MODEL || "qwen2.5-coder:7b",
    fallbackModel: process.env.OPERATOR_FALLBACK_MODEL || process.env.EPICGRAM_AI_FALLBACK_MODEL || "gemma2:9b",
    provider: process.env.OPERATOR_MODEL_PROVIDER || "local-openai-compatible",
    endpoint: process.env.OPERATOR_MODEL_ENDPOINT || process.env.EPICGRAM_AI_BASE_URL || "http://localhost:8096/v1/chat/completions",
    timeoutMs: Number(process.env.OPERATOR_MODEL_TIMEOUT_MS || 12000),
    approvalRequired: String(process.env.OPERATOR_APPROVAL_REQUIRED || "true") !== "false",
    autoSendAllowed: String(process.env.OPERATOR_AUTO_SEND_ALLOWED || "false") === "true",
    externalAiAllowed: String(process.env.OPERATOR_EXTERNAL_AI_RUNTIME_ALLOWED || "false") === "true",
    apiKey: process.env.OPERATOR_MODEL_API_KEY || process.env.EPICGRAM_AI_API_KEY || process.env.OPENAI_API_KEY || null
  };
}

function safety(cfg) {
  return {
    manual_approval_required: cfg.approvalRequired === true,
    auto_send_allowed: cfg.autoSendAllowed === true,
    background_messaging: false,
    mass_messaging: false,
    external_ai_runtime_allowed: cfg.externalAiAllowed === true,
    credential_export: false,
    session_export: false,
    approval_bypass_allowed: false
  };
}

// Low-level call to the local OpenAI-compatible endpoint. Never throws; returns a safe shape.
export async function callModel(model, messages, cfg) {
  cfg = cfg || getOperatorConfig();
  if (!cfg.endpoint) return { ok: false, error: "NO_ENDPOINT" };
  const headers = { "content-type": "application/json" };
  if (cfg.apiKey && cfg.apiKey !== "local-brain-no-key") headers.authorization = `Bearer ${cfg.apiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const resp = await fetch(cfg.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, stream: false, temperature: 0.3, max_tokens: 400 }),
      signal: controller.signal
    });
    if (!resp.ok) return { ok: false, error: "HTTP_" + resp.status };
    const d = await resp.json().catch(() => null);
    const text = d?.choices?.[0]?.message?.content?.trim() ?? d?.message?.content?.trim() ?? "";
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: e && e.name === "AbortError" ? "TIMEOUT" : "ECONNREFUSED" };
  } finally { clearTimeout(timer); }
}

async function checkModelHealth(model, cfg) {
  const r = await callModel(model, [{ role: "user", content: "ping" }], cfg);
  return r.ok;
}

// Try primary, then fallback. Never throws.
export async function selectActiveModel(cfg) {
  cfg = cfg || getOperatorConfig();
  const errors = [];
  const primaryOk = await checkModelHealth(cfg.primaryModel, cfg);
  if (primaryOk) return { activeModel: cfg.primaryModel, modelOnline: true, status: "online", errors };
  errors.push("PRIMARY_MODEL_UNAVAILABLE");
  const fallbackOk = await checkModelHealth(cfg.fallbackModel, cfg);
  if (fallbackOk) { errors.push("Fallback model selected: " + cfg.fallbackModel); return { activeModel: cfg.fallbackModel, modelOnline: true, status: "degraded", errors }; }
  errors.push("LOCAL_MODEL_ENDPOINT_UNREACHABLE", "No local model responded");
  return { activeModel: null, modelOnline: false, status: "offline", errors };
}

async function telegramReady() {
  try {
    const st = await getStatus();
    const data = st && st.body ? st.body : st;
    const accs = (data && data.accounts) || [];
    const ready = accs.find((a) => a.authorizationState === "authorizationStateReady" || a.status === "ready");
    return { ready: !!ready, selectedAccount: ready ? (ready.displayName || ready.slotId) : (data && data.activeAccountId) || null };
  } catch { return { ready: false, selectedAccount: null }; }
}

export async function buildOperatorStatus() {
  const cfg = getOperatorConfig();
  const m = await selectActiveModel(cfg);
  const tg = await telegramReady();
  const ok = m.status !== "offline";
  return {
    ok,
    operator: {
      id: OPERATOR_ID,
      name: cfg.name,
      type: "SYSTEM_OPERATOR",
      mode: cfg.mode,
      status: m.status,
      primaryModel: cfg.primaryModel,
      fallbackModel: cfg.fallbackModel,
      activeModel: m.activeModel,
      modelEndpoint: cfg.endpoint,
      modelProvider: cfg.provider,
      modelOnline: m.modelOnline,
      telegramReady: tg.ready,
      selectedAccount: tg.selectedAccount,
      selectedAgent: null,
      approvalRequired: cfg.approvalRequired,
      autoSendAllowed: cfg.autoSendAllowed,
      lastCheckAt: now(),
      capabilities: CAPABILITIES,
      blockedCapabilities: BLOCKED_CAPS,
      errors: m.errors
    },
    safety: safety(cfg)
  };
}

function blockedResponse(command, cfg) {
  return { ok: false, blocked: true, operator: OPERATOR_NAME, reason: "Command is blocked by MANUAL_APPROVAL_ONLY policy", command, safety: { manualApprovalRequired: true, autoSendAllowed: cfg.autoSendAllowed === true } };
}

// Command handler. NEVER sends. Returns status / draft_preview / blocked / reply.
export async function runCoreCommand(body) {
  body = body || {};
  const cfg = getOperatorConfig();
  const command = String(body.command || "").toLowerCase();

  if (BLOCKED.indexOf(command) >= 0) return blockedResponse(command, cfg);
  if (ALLOWED.indexOf(command) < 0) return { ok: false, operator: OPERATOR_NAME, reason: "Unknown command", command };

  if (command === "status") return buildOperatorStatus();
  if (command === "clear_operator_errors") return { ok: true, operator: OPERATOR_NAME, cleared: true };
  if (command === "ping_brain") {
    const m = await selectActiveModel(cfg);
    return { ok: m.modelOnline, operator: OPERATOR_NAME, status: m.status, activeModel: m.activeModel, primaryModel: cfg.primaryModel, fallbackModel: cfg.fallbackModel, modelOnline: m.modelOnline, errors: m.errors };
  }

  // draft-producing commands: suggest_reply / prepare_message / create_draft / test_draft
  if (["suggest_reply", "prepare_message", "create_draft", "test_draft", "summarize_chat", "explain_action"].indexOf(command) >= 0) {
    const m = await selectActiveModel(cfg);
    const agentId = body.agentId || body.agent || null;
    const styleHint = agentId ? `Draft in the voice/persona of agent "${agentId}", but the system operator remains EPICSTAR AI OPERATOR.` : "";
    let text = "";
    if (m.modelOnline && command !== "test_draft") {
      const r = await callModel(m.activeModel, [
        { role: "system", content: SYS },
        { role: "system", content: styleHint },
        { role: "user", content: String(body.input || body.text || "Подготовь короткий черновик поста.") }
      ], cfg);
      text = r.ok ? r.text : "";
    }
    if (!text) text = command === "test_draft"
      ? `[TEST DRAFT · ${agentId || "no-agent"}] Это локальный тестовый черновик EPICSTAR AI OPERATOR. Ничего не отправлено.`
      : `[DRAFT · brain ${m.modelOnline ? m.activeModel : "offline"}] ` + String(body.input || body.text || "черновик");
    const draft = {
      id: rid(),
      operator: OPERATOR_NAME,
      agentId: agentId,
      target: { accountId: body.accountId || null, chatId: body.chatId || null },
      text,
      status: "waiting_for_approval",
      createdAt: now()
    };
    return {
      ok: true,
      type: "draft_preview",
      operator: OPERATOR_NAME,
      selectedAgent: agentId,
      activeModel: m.activeModel,
      draftStyle: agentId || null,
      draft,
      approval: { required: true, approved: false, confirmEndpoint: "/operator/confirm" }
    };
  }

  // read-style commands acknowledged (actual data read stays in existing operator-agent / telegram routes)
  return { ok: true, operator: OPERATOR_NAME, command, note: "Use existing /telegram routes for live data; this core handles policy, health, and draft preview." };
}

// ---- PHASE T4: Persona Router ----
const PERSONAS = {
  "novikova": { agentId: "novikova", name: "NOVIKOVA", role: "media persona", language: "ru", tone: ["confident", "short", "cinematic", "human-like"], styleRules: ["write naturally", "avoid robotic phrases", "do not mention AI unless asked", "concise phrasing", "keep chat context"], forbiddenStyleRules: ["do not impersonate a real person", "no illegal access claims", "do not pressure users", "no manipulation", "no spam"] },
  "eva": { agentId: "eva", name: "EVA", role: "media persona", language: "ru", tone: ["warm", "playful", "concise"], styleRules: ["natural voice", "friendly", "concise"], forbiddenStyleRules: ["no impersonation", "no manipulation", "no spam"] },
  "ai-newscaster": { agentId: "ai-newscaster", name: "AI NEWSCASTER", role: "news presenter", language: "ru", tone: ["clear", "structured", "brief", "newsroom"], styleRules: ["lead with main point", "no emotional exaggeration", "separate facts and commentary"], forbiddenStyleRules: ["no fabrication", "no impersonation"] },
  "ai-music-public": { agentId: "ai-music-public", name: "AI MUSIC PUBLIC", role: "music channel operator", language: "ru", tone: ["energetic", "short", "promo"], styleRules: ["focus on release/vibe/sound/mood", "channel-friendly"], forbiddenStyleRules: ["no spam", "no impersonation"] },
  "epicstar-neutral": { agentId: "epicstar-neutral", name: "EPICSTAR NEUTRAL", role: "system operator voice", language: "ru", tone: ["neutral", "clear", "operator"], styleRules: ["concise", "factual"], forbiddenStyleRules: ["no manipulation", "no spam"] }
};
function normAgent(a) { if (!a) return "epicstar-neutral"; const k = String(a).toLowerCase().replace(/\s+/g, "-"); return PERSONAS[k] ? k : (PERSONAS[a] ? a : "epicstar-neutral"); }
export function getPersona(agentId) { return PERSONAS[normAgent(agentId)]; }

// ---- PHASE T4: Intent Detector ----
const BLOCKED_INTENTS = ["auto_send", "mass_send", "bulk_dm", "scrape_users", "harvest_contacts", "export_sessions", "bypass_approval", "background_dm", "silent_publish", "credential_export", "social_engineering_attack", "phishing", "impersonation_of_real_person", "spam_campaign"];
const INTENT_MAP = { status: "status_check", ping_brain: "brain_ping", list_chats: "list_chats", read_messages: "read_context", summarize_chat: "summarize_chat", suggest_reply: "draft_reply", prepare_message: "draft_message", create_draft: "draft_message", rewrite_draft: "rewrite_draft", improve_draft: "improve_draft", translate_draft: "translate_draft", shorten_draft: "shorten_draft", explain_action: "explain_action", test_draft: "test_draft" };
export function detectIntent(command, text) {
  const c = String(command || "").toLowerCase();
  if (BLOCKED_INTENTS.indexOf(c) >= 0) return { ok: false, blocked: true, reason: "Intent is blocked by operator safety policy", intent: c, operator: OPERATOR_NAME, safety: { manualApprovalRequired: true, autoSendAllowed: false } };
  return { ok: true, blocked: false, command: c, detectedIntent: INTENT_MAP[c] || "draft_reply", riskLevel: "low", requiresApproval: true };
}

export function simulationStatus() {
  const cfg = getOperatorConfig();
  const sim = String(process.env.OPERATOR_SIMULATION_MODE || "true") !== "false";
  const realSend = String(process.env.OPERATOR_REAL_SEND_ALLOWED || "false") === "true";
  return {
    ok: true,
    simulation: { enabled: true, mode: sim ? "SIMULATION_ONLY" : cfg.mode, mockSendAdapter: sim, realSendAllowed: realSend, qaRunner: true, auditReplay: true },
    safety: { manualApprovalRequired: true, twoStepSendConfirmation: true, autoSendAllowed: false, realSendInSimulation: false }
  };
}

export function contextEngineStatus() {
  const cfg = getOperatorConfig();
  return { ok: true, contextEngine: { enabled: true, operator: cfg.name, personaRouter: true, memoryBridge: true, chatContextBridge: true, intentDetector: true, safety: { manualApprovalRequired: cfg.approvalRequired === true, autoSendAllowed: cfg.autoSendAllowed === true } } };
}

// ---- PHASE T4: Context Snapshot (memory/chat read client-side from Agent Brain / telegram routes) ----
export async function buildContextSnapshot(body) {
  body = body || {};
  const cfg = getOperatorConfig();
  const m = await selectActiveModel(cfg);
  const persona = getPersona(body.agentId);
  const intent = detectIntent(body.command || "suggest_reply", body.text);
  const tg = await telegramReady();
  return {
    ok: true,
    contextSnapshot: {
      id: "ctx_" + Math.random().toString(36).slice(2, 10), createdAt: now(),
      operator: { id: OPERATOR_ID, name: cfg.name, type: "SYSTEM_OPERATOR", mode: cfg.mode },
      brain: { activeModel: m.activeModel, primaryModel: cfg.primaryModel, fallbackModel: cfg.fallbackModel, endpoint: cfg.endpoint, status: m.status },
      account: { accountId: body.accountId || null, displayName: tg.selectedAccount, telegramReady: tg.ready, sessionVisible: false },
      agent: { agentId: persona.agentId, name: persona.name, role: persona.role, status: "ready", personaEnabled: true },
      persona: { tone: persona.tone, language: persona.language, styleRules: persona.styleRules, forbiddenStyleRules: persona.forbiddenStyleRules, signature: null },
      memory: { available: false, reason: "Memory is read client-side from Agent Brain", shortTerm: [], longTerm: [], goals: [], facts: [], lastActivity: [] },
      chat: { chatId: body.chatId || null, title: null, type: "unknown", recentMessages: [], summary: null, readOnly: true },
      intent: { command: body.command || null, detectedIntent: intent.detectedIntent || null, blocked: !!intent.blocked, riskLevel: intent.riskLevel || "low", requiresApproval: true },
      safety: { manual_approval_required: true, two_step_send_confirmation: true, auto_send_allowed: false, background_messaging: false, mass_messaging: false, user_scraping: false, credential_export: false, session_export: false }
    }
  };
}

// EPICSTAR OPERATOR BRAIN BOOTSTRAP (PHASE T11) — local AI endpoint autodetect + health.
// ADDITIVE. Detects LM Studio (:8096) and Ollama (:11434) OpenAI-compatible endpoints, picks an
// active endpoint/model, and returns start instructions when offline. NEVER installs models,
// never starts processes, never sends messages. Pure read/health + in-memory endpoint override.

import { getOperatorConfig } from "./operator-core.mjs";

const now = () => new Date().toISOString();
const TIMEOUT = Number(process.env.OPERATOR_MODEL_TIMEOUT_MS || 3000);

// in-memory override set via /operator/brain/select-endpoint (config only, no secrets)
let override = null; // { provider, endpoint, model }

function candidates() {
  const cfg = getOperatorConfig();
  const list = [];
  if (cfg.endpoint) list.push({ provider: cfg.endpoint.indexOf("11434") >= 0 ? "ollama" : "lm-studio", endpoint: cfg.endpoint });
  list.push({ provider: "lm-studio", endpoint: "http://localhost:8096/v1/chat/completions" });
  list.push({ provider: "ollama", endpoint: process.env.OPERATOR_OLLAMA_ENDPOINT || "http://localhost:11434/v1/chat/completions" });
  // dedup by endpoint
  const seen = {}; return list.filter((c) => (seen[c.endpoint] ? false : (seen[c.endpoint] = true)));
}

function modelsUrl(ep) { return ep.replace("/chat/completions", "/models"); }

export async function checkEndpoint(ep, provider) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT);
  const started = Date.now();
  try {
    const r = await fetch(modelsUrl(ep), { method: "GET", signal: controller.signal });
    if (!r.ok) return { endpoint: ep, provider, online: false, latencyMs: null, error: "HTTP_" + r.status, checkedAt: now() };
    const d = await r.json().catch(() => null);
    const models = d && Array.isArray(d.data) ? d.data.map((m) => m.id).filter(Boolean) : [];
    return { endpoint: ep, provider, online: true, latencyMs: Date.now() - started, error: null, models, checkedAt: now() };
  } catch (e) {
    return { endpoint: ep, provider, online: false, latencyMs: null, error: e && e.name === "AbortError" ? "ETIMEDOUT" : "ECONNREFUSED", checkedAt: now() };
  } finally { clearTimeout(t); }
}

export async function detectLocalEndpoints() {
  const cands = override ? [{ provider: override.provider || "custom", endpoint: override.endpoint }, ...candidates()] : candidates();
  const seen = {}; const uniq = cands.filter((c) => (seen[c.endpoint] ? false : (seen[c.endpoint] = true)));
  const results = [];
  for (const c of uniq) results.push(await checkEndpoint(c.endpoint, c.provider));
  return results;
}

function pickModel(cfg, online) {
  const want = override?.model || cfg.primaryModel;
  if (online && Array.isArray(online.models) && online.models.length) {
    if (online.models.indexOf(want) >= 0) return want;
    if (online.models.indexOf(cfg.fallbackModel) >= 0) return cfg.fallbackModel;
    return online.models[0];
  }
  return want;
}

export async function buildBrainStatus() {
  const cfg = getOperatorConfig();
  const checked = await detectLocalEndpoints();
  const online = checked.find((c) => c.online) || null;
  const activeModel = pickModel(cfg, online);
  return {
    ok: !!online,
    brain: {
      online: !!online,
      provider: online ? online.provider : null,
      activeEndpoint: online ? online.endpoint : null,
      primaryModel: cfg.primaryModel,
      fallbackModel: cfg.fallbackModel,
      activeModel: online ? activeModel : null,
      latencyMs: online ? online.latencyMs : null,
      checkedEndpoints: checked,
      reason: online ? null : "No local AI endpoint responded",
      startInstructionsAvailable: true,
      lastCheckAt: now()
    },
    operator: { name: cfg.name, status: online ? "online" : "offline", mode: cfg.mode }
  };
}

export function brainConfig() {
  const cfg = getOperatorConfig();
  return { ok: true, config: { primaryModel: cfg.primaryModel, fallbackModel: cfg.fallbackModel, endpoint: override?.endpoint || cfg.endpoint, ollamaEndpoint: process.env.OPERATOR_OLLAMA_ENDPOINT || "http://localhost:11434/v1/chat/completions", provider: cfg.provider, timeoutMs: cfg.timeoutMs, approvalRequired: cfg.approvalRequired, autoSendAllowed: cfg.autoSendAllowed } };
}

export function startInstructions() {
  return {
    ok: true,
    lmStudio: { provider: "lm-studio", steps: ["Открой LM Studio", "Загрузи модель qwen2.5-coder:7b (или совместимую)", "Start Local Server", "Порт 8096", "Включи OpenAI-compatible API", "Проверь: http://localhost:8096/v1/chat/completions"], env: { OPERATOR_MODEL_ENDPOINT: "http://localhost:8096/v1/chat/completions", OPERATOR_PRIMARY_MODEL: "qwen2.5-coder:7b", OPERATOR_FALLBACK_MODEL: "gemma2:9b" } },
    ollama: { provider: "ollama", commands: ["ollama pull qwen2.5-coder:7b", "ollama pull gemma2:9b", "ollama serve"], test: "curl http://localhost:11434/v1/models", env: { OPERATOR_MODEL_ENDPOINT: "http://localhost:11434/v1/chat/completions", OPERATOR_PRIMARY_MODEL: "qwen2.5-coder:7b", OPERATOR_FALLBACK_MODEL: "gemma2:9b" } },
    safety: { brain_bootstrap_install_allowed: false, brain_bootstrap_send_allowed: false, note: "UI показывает команды, но не запускает install/serve сам." }
  };
}

// config-only override; no secrets, no send, no live mode, no safety change
export function selectEndpoint(body) {
  body = body || {};
  if (!body.endpoint) return { ok: false, reason: "NO_ENDPOINT" };
  override = { provider: body.provider || "custom", endpoint: String(body.endpoint), model: body.model || null };
  return { ok: true, selected: override, note: "Config-only override. Restart api or set .env.local to persist." };
}

export async function checkBrain(body) {
  body = body || {};
  const sel = String(body.endpoint || "auto");
  if (sel === "lm-studio") return { ok: true, result: await checkEndpoint("http://localhost:8096/v1/chat/completions", "lm-studio") };
  if (sel === "ollama") return { ok: true, result: await checkEndpoint(process.env.OPERATOR_OLLAMA_ENDPOINT || "http://localhost:11434/v1/chat/completions", "ollama") };
  if (sel === "custom" && body.customEndpoint) return { ok: true, result: await checkEndpoint(String(body.customEndpoint), "custom") };
  return await buildBrainStatus();
}

function configuredValue(value) {
  if (!value) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;
  if (normalized === "...") return false;
  if (normalized.startsWith("replace-with-")) return false;
  return true;
}

function maskSecret(value) {
  if (!configuredValue(value)) return null;
  const normalized = String(value).trim();
  return `configured: ***${normalized.slice(-4)}`;
}

export function getAiStatus() {
  const provider = process.env.EPICGRAM_AI_PROVIDER || "openai";
  const model = process.env.EPICGRAM_AI_MODEL || process.env.EPICGRAM_OPENAI_MODEL || process.env.OPERATOR_PRIMARY_MODEL || "gpt-4.1-mini";
  const visionModel = process.env.EPICGRAM_AI_VISION_MODEL || (provider === "ollama" ? "llava:7b" : model);
  const enabled = process.env.EPICGRAM_AI_ENABLED === "true";
  // OpenAI-compatible base URL (our own EPIC☠STAR brain proxy, or any OpenAI-style endpoint).
  const baseUrl = process.env.EPICGRAM_AI_BASE_URL || null;
  // A local self-hosted brain (e.g. Ollama proxy) needs no platform key; a cloud
  // OpenAI provider does. Support both, never expose the secret to the browser.
  const apiKey = process.env.EPICGRAM_AI_API_KEY || process.env.OPENAI_API_KEY;
  const sendMode = process.env.EPICGRAM_AI_SEND_MODE || "operator_approval_required";

  // Treat any non-"openai" provider with a configured base URL as a self-hosted
  // brain that does not require a platform API key.
  const isSelfHosted = provider !== "openai" && configuredValue(baseUrl);
  const apiKeyPresent = configuredValue(apiKey);
  const ready = enabled && (isSelfHosted || apiKeyPresent);

  let message;
  if (ready && isSelfHosted) {
    message = `Self-hosted brain wired: ${provider} @ ${baseUrl} (model ${model}). Send still gated by operator approval.`;
  } else if (ready) {
    message = "OpenAI API key is configured on the backend. The key is not exposed to the browser.";
  } else if (enabled) {
    message = isSelfHosted
      ? "AI provider is enabled but the brain base URL looks unconfigured."
      : "AI provider is enabled, but no API key / base URL is configured on the backend.";
  } else {
    message = "AI provider is disabled. Set EPICGRAM_AI_ENABLED=true in .env.local.";
  }

  return {
    runtime: ready ? "ready" : enabled ? "missing_key" : "disabled",
    provider,
    enabled,
    selfHosted: isSelfHosted,
    baseUrl,
    apiKeyPresent,
    apiKeyMasked: maskSecret(apiKey),
    model,
    visionModel,
    sendMode,
    message
  };
}

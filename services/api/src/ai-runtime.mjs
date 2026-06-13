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
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.EPICGRAM_OPENAI_MODEL || "gpt-4.1-mini";
  const provider = process.env.EPICGRAM_AI_PROVIDER || "openai";
  const enabled = process.env.EPICGRAM_AI_ENABLED === "true";
  const apiKeyPresent = configuredValue(apiKey);
  const ready = enabled && apiKeyPresent;

  return {
    runtime: ready ? "ready" : enabled ? "missing_key" : "disabled",
    provider,
    enabled,
    apiKeyPresent,
    apiKeyMasked: maskSecret(apiKey),
    model,
    sendMode: "operator_approval_required",
    message: ready
      ? "OpenAI API key is configured on the backend. The key is not exposed to the browser."
      : enabled
        ? "AI provider is enabled, but OPENAI_API_KEY is not configured on the backend."
        : "AI provider is disabled. Set EPICGRAM_AI_ENABLED=true and OPENAI_API_KEY in .env.local."
  };
}

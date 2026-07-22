function envEnabled(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return String(raw).trim().toLowerCase() === "true";
}

export function getRuntimeFlags() {
  const telegramMutation = envEnabled("TELEGRAM_MUTATION", false);
  return {
    telegramReadEnabled: envEnabled("TELEGRAM_READ_ENABLED", true),
    telegramSendEnabled: envEnabled("TELEGRAM_SEND_ENABLED", telegramMutation),
    telegramMutation,
    schedulerEnabled: envEnabled("SCHEDULER_ENABLED", false),
    aiOperatorEnabled: envEnabled("AI_OPERATOR_ENABLED", true),
  };
}

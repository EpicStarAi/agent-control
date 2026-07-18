import { appendEvent } from "../operator-audit.mjs";
import { createToolRegistry } from "./tool-registry.mjs";
import { registerTelegramReadTools } from "./telegram-tools.mjs";

function safeAudit(event) {
  try {
    appendEvent(event);
  } catch {
    // Audit failures must not silently enable or alter external actions.
  }
}

export function createEpicClawRuntime() {
  const registry = createToolRegistry({
    onBeforeExecute(invocation) {
      safeAudit({
        status: "started",
        actor: "epic_claw",
        source: "tool_registry",
        tool: invocation.name,
        actionType: invocation.capability,
        preview: JSON.stringify(invocation.input ?? {}).slice(0, 1000),
        safety: {
          autonomy: invocation.safety.autonomy,
          telegramSendEnabled: invocation.safety.telegramSendEnabled,
          telegramMutationEnabled: invocation.safety.telegramMutationEnabled,
          browserWriteEnabled: invocation.safety.browserWriteEnabled
        }
      });
    },
    onAfterExecute(invocation) {
      safeAudit({
        status: invocation.ok ? "completed" : "failed",
        actor: "epic_claw",
        source: "tool_registry",
        tool: invocation.name,
        actionType: invocation.capability,
        reason: invocation.ok ? undefined : String(invocation.error?.message || invocation.error || "tool_failed"),
        safety: { executedExternalAction: false }
      });
    }
  });

  registerTelegramReadTools(registry);

  return Object.freeze({
    listTools: () => registry.list(),
    describeTool: (name) => registry.describe(name),
    executeTool: (name, input, context) => registry.execute(name, input, context)
  });
}

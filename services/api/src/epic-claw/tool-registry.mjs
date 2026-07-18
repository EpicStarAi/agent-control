const RISK_LEVELS = Object.freeze({
  READ: "L0",
  DRAFT: "L1",
  REVERSIBLE: "L2",
  PUBLISH: "L3",
  CRITICAL: "L4",
  FORBIDDEN: "L5"
});

export class ToolPolicyError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ToolPolicyError";
    this.code = code;
    this.details = details;
  }
}

function envFlag(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export function getClawSafetyState() {
  return Object.freeze({
    autonomy: process.env.AGENT_AUTONOMY || "observe",
    telegramSendEnabled: envFlag("TELEGRAM_SEND_ENABLED", false),
    telegramMutationEnabled: envFlag("TELEGRAM_MUTATION", false),
    browserWriteEnabled: envFlag("BROWSER_WRITE_ENABLED", false)
  });
}

function assertToolDefinition(definition) {
  if (!definition || typeof definition !== "object") throw new TypeError("Tool definition is required");
  if (!definition.name || typeof definition.name !== "string") throw new TypeError("Tool name is required");
  if (!Object.values(RISK_LEVELS).includes(definition.risk)) throw new TypeError(`Unsupported risk level for ${definition.name}`);
  if (typeof definition.execute !== "function") throw new TypeError(`Tool executor is required for ${definition.name}`);
}

function authorize(definition, context = {}) {
  const safety = getClawSafetyState();

  if (definition.risk === RISK_LEVELS.FORBIDDEN) {
    throw new ToolPolicyError("TOOL_FORBIDDEN", `Tool ${definition.name} is forbidden`);
  }

  if (definition.capability === "telegram.send" && !safety.telegramSendEnabled) {
    throw new ToolPolicyError("TELEGRAM_SEND_DISABLED", "Telegram sending is disabled by kill switch", { tool: definition.name });
  }

  if (definition.capability?.startsWith("telegram.mutation") && !safety.telegramMutationEnabled) {
    throw new ToolPolicyError("TELEGRAM_MUTATION_DISABLED", "Telegram mutations are disabled by kill switch", { tool: definition.name });
  }

  if (definition.capability?.startsWith("browser.write") && !safety.browserWriteEnabled) {
    throw new ToolPolicyError("BROWSER_WRITE_DISABLED", "Browser writes are disabled by kill switch", { tool: definition.name });
  }

  if ([RISK_LEVELS.PUBLISH, RISK_LEVELS.CRITICAL].includes(definition.risk) && context.approved !== true) {
    throw new ToolPolicyError("APPROVAL_REQUIRED", `Approval is required for ${definition.name}`, { tool: definition.name, risk: definition.risk });
  }

  if (safety.autonomy === "observe" && definition.risk !== RISK_LEVELS.READ) {
    throw new ToolPolicyError("OBSERVE_MODE", `Tool ${definition.name} is unavailable while AGENT_AUTONOMY=observe`, { tool: definition.name });
  }

  return safety;
}

export function createToolRegistry({ onBeforeExecute, onAfterExecute } = {}) {
  const tools = new Map();

  return Object.freeze({
    register(definition) {
      assertToolDefinition(definition);
      if (tools.has(definition.name)) throw new Error(`Tool already registered: ${definition.name}`);
      tools.set(definition.name, Object.freeze({ ...definition }));
      return this;
    },

    list() {
      return [...tools.values()].map(({ execute, ...metadata }) => metadata);
    },

    describe(name) {
      const definition = tools.get(name);
      if (!definition) return null;
      const { execute, ...metadata } = definition;
      return metadata;
    },

    async execute(name, input = {}, context = {}) {
      const definition = tools.get(name);
      if (!definition) throw new ToolPolicyError("TOOL_NOT_FOUND", `Unknown tool: ${name}`);
      const safety = authorize(definition, context);
      const invocation = {
        name,
        input,
        risk: definition.risk,
        capability: definition.capability,
        safety,
        context,
        startedAt: new Date().toISOString()
      };
      await onBeforeExecute?.(invocation);
      try {
        const result = await definition.execute(input, context);
        await onAfterExecute?.({ ...invocation, ok: true, result, finishedAt: new Date().toISOString() });
        return result;
      } catch (error) {
        await onAfterExecute?.({ ...invocation, ok: false, error, finishedAt: new Date().toISOString() });
        throw error;
      }
    }
  });
}

export { RISK_LEVELS };

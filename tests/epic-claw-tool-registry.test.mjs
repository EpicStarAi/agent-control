import test from "node:test";
import assert from "node:assert/strict";
import {
  createToolRegistry,
  RISK_LEVELS,
  ToolPolicyError
} from "../services/api/src/epic-claw/tool-registry.mjs";

function withEnv(values, run) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
  return Promise.resolve(run()).finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("L0 read tool executes in observe mode", async () => {
  await withEnv({ AGENT_AUTONOMY: "observe" }, async () => {
    const registry = createToolRegistry();
    registry.register({
      name: "telegram.get_status",
      risk: RISK_LEVELS.READ,
      capability: "telegram.read.status",
      execute: async () => ({ ok: true })
    });

    assert.deepEqual(await registry.execute("telegram.get_status"), { ok: true });
  });
});

test("Telegram send remains blocked even when approval is forged", async () => {
  await withEnv({
    AGENT_AUTONOMY: "controlled",
    TELEGRAM_SEND_ENABLED: "false"
  }, async () => {
    const registry = createToolRegistry();
    registry.register({
      name: "telegram.send_message",
      risk: RISK_LEVELS.PUBLISH,
      capability: "telegram.send",
      execute: async () => ({ sent: true })
    });

    await assert.rejects(
      registry.execute("telegram.send_message", { text: "blocked" }, { approved: true }),
      (error) => error instanceof ToolPolicyError && error.code === "TELEGRAM_SEND_DISABLED"
    );
  });
});

test("observe mode blocks every non-read tool", async () => {
  await withEnv({
    AGENT_AUTONOMY: "observe",
    TELEGRAM_SEND_ENABLED: "true",
    TELEGRAM_MUTATION: "true"
  }, async () => {
    const registry = createToolRegistry();
    registry.register({
      name: "telegram.update_channel",
      risk: RISK_LEVELS.REVERSIBLE,
      capability: "telegram.mutation.channel",
      execute: async () => ({ ok: true })
    });

    await assert.rejects(
      registry.execute("telegram.update_channel"),
      (error) => error instanceof ToolPolicyError && error.code === "OBSERVE_MODE"
    );
  });
});

test("L3 tool requires explicit approval after kill switch is enabled", async () => {
  await withEnv({
    AGENT_AUTONOMY: "controlled",
    TELEGRAM_SEND_ENABLED: "true"
  }, async () => {
    const registry = createToolRegistry();
    registry.register({
      name: "telegram.send_message",
      risk: RISK_LEVELS.PUBLISH,
      capability: "telegram.send",
      execute: async () => ({ sent: true })
    });

    await assert.rejects(
      registry.execute("telegram.send_message"),
      (error) => error instanceof ToolPolicyError && error.code === "APPROVAL_REQUIRED"
    );
  });
});

test("L5 tool can never execute", async () => {
  const registry = createToolRegistry();
  registry.register({
    name: "telegram.steal_session",
    risk: RISK_LEVELS.FORBIDDEN,
    capability: "telegram.forbidden",
    execute: async () => ({ impossible: true })
  });

  await assert.rejects(
    registry.execute("telegram.steal_session", {}, { approved: true }),
    (error) => error instanceof ToolPolicyError && error.code === "TOOL_FORBIDDEN"
  );
});

// tests/agent-verify.test.mjs — P-CLAW-AGENT-CORE stage 1, verification discipline.
// A step is never `success` just because the call returned. Verification is a
// separate state check; unverified is a legitimate honest status; a mutation is
// never executed inside the loop and never a green success without proof.

import test from "node:test";
import assert from "node:assert/strict";

import { deriveStepStatus, isAcceptableTerminalStatus } from "../apps/web/lib/agent/verify.ts";
import { runAgentLoop } from "../apps/web/lib/agent/runLoop.ts";
import { createHeuristicPlanner } from "../apps/web/lib/agent/planner.ts";
import {
  makeStore,
  makeRegistry,
  makeRun,
  brokenTool,
  unverifiableTool,
  spyMutationTool
} from "./helpers/agentHarness.mjs";

// --- unit: the status mapping ------------------------------------------------

test("deriveStepStatus: a call that did not throw is not automatically success", () => {
  // ok + passing verification -> success
  assert.equal(deriveStepStatus("read", { ok: true }, { method: "m", passed: true, evidence: "" }), "success");
  // ok + NO verification -> unverified (honest "couldn't check")
  assert.equal(deriveStepStatus("read", { ok: true }, null), "unverified");
  // ok + verification CONTRADICTS -> failed (state proves no effect)
  assert.equal(deriveStepStatus("read", { ok: true }, { method: "m", passed: false, evidence: "" }), "failed");
  // call failed -> failed
  assert.equal(deriveStepStatus("read", { ok: false, error: "x" }, null), "failed");
  // ok + passing verification but tool flags partial -> partial
  assert.equal(deriveStepStatus("draft", { ok: true, partial: true }, { method: "m", passed: true, evidence: "" }), "partial");
});

test("a mutation may not terminate as unverified; read/draft may", () => {
  assert.equal(isAcceptableTerminalStatus("mutation", "unverified"), false);
  assert.equal(isAcceptableTerminalStatus("mutation", "success"), true);
  assert.equal(isAcceptableTerminalStatus("read", "unverified"), true);
  assert.equal(isAcceptableTerminalStatus("read", "failed"), false);
});

// --- through the loop: a broken tool -----------------------------------------

test("a broken tool that returns ok without effect yields failed, not a green check", async () => {
  const store = makeStore();
  const singleStage = () => [{ tool: "get_last_messages", risk: "read", intent: "collect" }];
  const registry = makeRegistry({ get_last_messages: brokenTool("get_last_messages", "read") });
  const run = makeRun();
  await store.createRun(run);
  const out = await runAgentLoop(run, {
    store,
    tools: registry,
    planner: createHeuristicPlanner(singleStage)
  });

  // The step is recorded honestly as failed — never success.
  assert.ok(out.steps.length >= 1);
  assert.ok(out.steps.every((s) => s.status !== "success"));
  assert.equal(out.steps[0].status, "failed");
  assert.equal(out.status, "failed");
});

test("an unverifiable tool yields status unverified, shown distinctly from success", async () => {
  const store = makeStore();
  const singleStage = () => [{ tool: "get_last_messages", risk: "read", intent: "collect" }];
  const registry = makeRegistry({ get_last_messages: unverifiableTool("get_last_messages", "read") });
  const run = makeRun();
  await store.createRun(run);
  const out = await runAgentLoop(run, {
    store,
    tools: registry,
    planner: createHeuristicPlanner(singleStage)
  });

  const s0 = out.steps[0];
  assert.equal(s0.status, "unverified");
  assert.notEqual(s0.status, "success");
  assert.equal(s0.verified, null, "unverified means no passing verification record");
});

// --- through the loop: mutation gating ---------------------------------------

test("a mutation step is NEVER executed in the loop — it pauses for the approval gate", async () => {
  const store = makeStore();
  const { spy, tool } = spyMutationTool("publish_post");
  const singleStage = () => [{ tool: "publish_post", risk: "mutation", intent: "publish" }];
  const registry = makeRegistry({ publish_post: tool });
  const run = makeRun({ goal: "опубликуй пост" });
  await store.createRun(run);
  const out = await runAgentLoop(run, {
    store,
    tools: registry,
    planner: createHeuristicPlanner(singleStage)
  });

  assert.equal(spy.calls, 0, "the mutation tool's call() must never run inside the loop");
  assert.equal(out.status, "waiting_approval");
  assert.equal(out.steps.length, 1);
  assert.equal(out.steps[0].status, "awaiting_approval");
  assert.notEqual(out.steps[0].status, "success");
});

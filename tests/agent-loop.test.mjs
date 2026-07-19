// tests/agent-loop.test.mjs — P-CLAW-AGENT-CORE stage 1, the loop machinery.
// Exercises the real engine (imported from TypeScript via Node type-stripping)
// with in-memory fakes: multi-step completion, cancel-between-steps, loop
// detection, hard maxSteps, run timeout, and honest tool-error handling.

import test from "node:test";
import assert from "node:assert/strict";

import { runAgentLoop } from "../apps/web/lib/agent/runLoop.ts";
import { createHeuristicPlanner } from "../apps/web/lib/agent/planner.ts";
import {
  makeStore,
  makeRegistry,
  makeRun,
  okTool,
  failingTool,
  stuckPlanner,
  countingPlanner,
  makeClock
} from "./helpers/agentHarness.mjs";

test("a multi-step task runs the full loop to succeeded with per-step intents", async () => {
  const store = makeStore();
  const registry = makeRegistry({
    get_last_messages: okTool("get_last_messages", "read"),
    summarize_chat: okTool("summarize_chat", "draft"),
    prepare_post: okTool("prepare_post", "draft"),
    review_draft: okTool("review_draft", "read")
  });
  const run = makeRun({ goal: "собери последние сообщения канала, проанализируй, подготовь черновик поста" });
  await store.createRun(run);

  const out = await runAgentLoop(run, { store, tools: registry, planner: createHeuristicPlanner() });

  assert.equal(out.status, "succeeded", out.reason ?? "");
  // collect -> analyze -> draft -> review = 4 steps (within the "4-5" target).
  assert.equal(out.steps.length, 4);
  for (const s of out.steps) {
    assert.equal(s.status, "success");
    assert.ok(s.intent && s.intent.length > 0, "every step carries a human intent");
    assert.ok(s.verified && s.verified.passed === true, "success requires a passing verification");
  }
  // The plan preview is exposed for the UI.
  assert.equal(out.plan.length, 4);
  assert.ok(out.plan.every((p) => p.intent && p.risk));
});

test("every step is persisted BEFORE execution (running) and updated AFTER", async () => {
  const store = makeStore();
  const registry = makeRegistry({
    get_last_messages: okTool("get_last_messages", "read"),
    summarize_chat: okTool("summarize_chat", "draft"),
    prepare_post: okTool("prepare_post", "draft"),
    review_draft: okTool("review_draft", "read")
  });
  const run = makeRun();
  await store.createRun(run);
  await runAgentLoop(run, { store, tools: registry, planner: createHeuristicPlanner() });

  // For step index 0 there must be a "running" write earlier than its final write.
  const step0 = store.events.filter((e) => e.kind === "step" && e.index === 0);
  assert.ok(step0.length >= 2, "step written at least twice (before + after)");
  assert.equal(step0[0].status, "running", "first write is the pre-execution row");
  assert.notEqual(step0[step0.length - 1].status, "running", "later write carries the resolved status");
});

test("cancel between steps stops the loop and records status cancelled", async () => {
  const store = makeStore();
  // The first tool triggers a concurrent cancel (as if the user pressed Cancel
  // while step 1 was running); the loop must not start step 2.
  const cancelDuringTool = {
    name: "get_last_messages",
    risk: "read",
    call: async (_a, ctx) => {
      await store.requestCancel(ctx.run.id);
      return { ok: true, claimed: "collected", data: { items: [1] } };
    },
    verify: async () => ({ method: "nonempty_result", passed: true, evidence: "1" })
  };
  const registry = makeRegistry({
    get_last_messages: cancelDuringTool,
    summarize_chat: okTool("summarize_chat", "draft"),
    prepare_post: okTool("prepare_post", "draft"),
    review_draft: okTool("review_draft", "read")
  });
  const run = makeRun();
  await store.createRun(run);
  const out = await runAgentLoop(run, { store, tools: registry, planner: createHeuristicPlanner() });

  assert.equal(out.status, "cancelled");
  assert.match(out.reason, /cancelled_by_user/);
  assert.equal(out.steps.length, 1, "the second step never starts");
});

test("repeated-step detection aborts a stuck agent", async () => {
  const store = makeStore();
  const registry = makeRegistry({ noop: okTool("noop", "read") });
  const step = { tool: "noop", args: { same: true }, intent: "loop", risk: "read" };
  const run = makeRun();
  await store.createRun(run);
  const out = await runAgentLoop(run, { store, tools: registry, planner: stuckPlanner(step) });

  assert.equal(out.status, "failed");
  assert.match(out.reason, /^repeated_step:noop/);
  // REPEAT_LIMIT=2 -> the 4th identical proposal trips it, so 3 ran.
  assert.equal(out.steps.length, 3);
});

test("hard maxSteps caps the run", async () => {
  const store = makeStore();
  const registry = makeRegistry({ work: okTool("work", "read") });
  const run = makeRun({ maxSteps: 3 });
  await store.createRun(run);
  const out = await runAgentLoop(run, { store, tools: registry, planner: countingPlanner("work") });

  assert.equal(out.status, "failed");
  assert.equal(out.reason, "max_steps_exceeded");
  assert.equal(out.steps.length, 3);
});

test("a run timeout ends the loop even if the planner keeps proposing work", async () => {
  const store = makeStore();
  const { state, clock } = makeClock(0);
  // Each tool call advances the clock past the 50ms budget.
  const slowTool = {
    name: "work",
    risk: "read",
    call: async () => {
      state.t += 100;
      return { ok: true, claimed: "did work", data: { items: [1] } };
    },
    verify: async () => ({ method: "nonempty_result", passed: true, evidence: "1" })
  };
  const registry = makeRegistry({ work: slowTool });
  const run = makeRun({ timeoutMs: 50 });
  await store.createRun(run);
  const out = await runAgentLoop(run, { store, tools: registry, planner: countingPlanner("work"), clock });

  assert.equal(out.status, "failed");
  assert.equal(out.reason, "timeout");
  assert.equal(out.steps.length, 1, "the timeout is enforced before a second step");
});

test("a tool error does not silently kill the run — it fails honestly with a reason", async () => {
  const store = makeStore();
  const registry = makeRegistry({
    get_last_messages: failingTool("get_last_messages", "read"),
    summarize_chat: okTool("summarize_chat", "draft"),
    prepare_post: okTool("prepare_post", "draft"),
    review_draft: okTool("review_draft", "read")
  });
  const run = makeRun();
  await store.createRun(run);
  const out = await runAgentLoop(run, { store, tools: registry, planner: createHeuristicPlanner() });

  assert.equal(out.status, "failed");
  assert.match(out.reason, /stage_failed:get_last_messages/);
  // The failing tool was retried once (MAX_STAGE_RETRIES=1) then the run stopped;
  // no later stage was reached and nothing was reported as success.
  assert.ok(out.steps.every((s) => s.status === "failed"));
  assert.ok(!out.steps.some((s) => s.status === "success"));
  assert.ok(out.steps.length >= 1);
});

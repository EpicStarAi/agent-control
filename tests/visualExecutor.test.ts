// Visual Executor unit tests. Run with: node --test tests/
//
// These live OUTSIDE apps/web on purpose: they import the logic module with an
// explicit .ts extension (required by node's native TS runner) which the Next
// tsconfig (moduleResolution: bundler, no allowImportingTsExtensions) would
// otherwise reject during `next build`. Node 24 strips the erasable types.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  reduce,
  initialContext,
  createDemoSteps,
  isAllowedTarget,
  resolveTargetSelector,
  telegramMutation,
  executionMode,
  actionCreated,
  clampToViewport,
  TARGET_IDS,
  DEMO_OLD_BIO,
  DEMO_NEW_BIO,
  EXECUTION_MODE,
  type ExecContext,
  type ExecEvent,
  type ExecutionState,
} from "../apps/web/lib/visualExecutor.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Drive a sequence of events with deterministic timestamps.
function run(events: ExecEvent[], start: ExecContext = initialContext()): ExecContext {
  return events.reduce((ctx, event, i) => reduce(ctx, { ...event, at: `2026-07-16T00:00:${String(i).padStart(2, "0")}.000Z` } as ExecEvent), start);
}

// Advance the executor through the whole plan up to the confirmation gate.
function runToAwaiting(): ExecContext {
  return run([
    { type: "APPROVE" },
    { type: "START" },
    { type: "ADVANCE" }, // complete open-profile
    { type: "ADVANCE" }, // complete choose-edit
    { type: "ADVANCE" }, // complete fill-bio (stages draft)
    { type: "ADVANCE" }, // reach await-save → awaiting_final_confirmation
  ]);
}

// 1. Allow: pending_approval → approved → executing.
test("1 · Allow moves pending_approval → approved → executing", () => {
  let ctx = initialContext();
  assert.equal(ctx.state, "pending_approval");
  ctx = reduce(ctx, { type: "APPROVE" });
  assert.equal(ctx.state, "approved");
  ctx = reduce(ctx, { type: "START" });
  assert.equal(ctx.state, "executing");
  assert.equal(ctx.currentStepIndex, 0);
  assert.equal(ctx.steps[0].status, "active");
});

// 2. Executor may target ONLY allowlisted IDs.
test("2 · only allowlisted target IDs are resolvable", () => {
  for (const id of TARGET_IDS) {
    assert.equal(isAllowedTarget(id), true);
    assert.equal(resolveTargetSelector(id), `[data-epic-target="${id}"]`);
  }
  for (const bad of ["body", "*", "profile-card; DROP", "input", "profile-delete-button", ""]) {
    assert.equal(isAllowedTarget(bad), false);
    assert.equal(resolveTargetSelector(bad), null);
  }
  // Every scenario step points only at allowlisted targets.
  for (const step of createDemoSteps()) {
    if (step.targetId) assert.equal(isAllowedTarget(step.targetId), true);
  }
});

// 3. Pause halts progression — ticks while paused are ignored.
test("3 · Pause stops step progression", () => {
  let ctx = run([{ type: "APPROVE" }, { type: "START" }, { type: "ADVANCE" }]);
  const idxBefore = ctx.currentStepIndex;
  ctx = reduce(ctx, { type: "PAUSE" });
  assert.equal(ctx.state, "paused");
  // A tick while paused must not advance.
  const after = reduce(ctx, { type: "ADVANCE" });
  assert.equal(after.state, "paused");
  assert.equal(after.currentStepIndex, idxBefore);
  // Resume re-enters executing at the same step.
  const resumed = reduce(ctx, { type: "RESUME" });
  assert.equal(resumed.state, "executing");
  assert.equal(resumed.currentStepIndex, idxBefore);
});

// 4. Cancel → cancelled from an active state.
test("4 · Cancel transitions to cancelled", () => {
  const ctx = run([{ type: "APPROVE" }, { type: "START" }, { type: "ADVANCE" }, { type: "CANCEL" }]);
  assert.equal(ctx.state, "cancelled");
  assert.ok(ctx.steps.every((s) => s.status !== "active"));
});

// 5. Before final Save the profile is unchanged.
test("5 · profile bio unchanged until Save", () => {
  const ctx = runToAwaiting();
  assert.equal(ctx.state, "awaiting_final_confirmation");
  assert.equal(ctx.bio, DEMO_OLD_BIO); // committed value still old
  assert.equal(ctx.draftBio, DEMO_NEW_BIO); // only staged
});

// 6. Final Save changes ONLY local demo state.
test("6 · Save commits new bio to local demo state only", () => {
  const before = runToAwaiting();
  const ctx = reduce(before, { type: "COMMIT_SAVE", at: "2026-07-16T00:01:00.000Z" });
  assert.equal(ctx.state, "completed");
  assert.equal(ctx.bio, DEMO_NEW_BIO);
  assert.equal(telegramMutation(ctx), false);
  assert.equal(executionMode(), EXECUTION_MODE);
});

// 7. TELEGRAM_MUTATION is false in every reachable state.
test("7 · TELEGRAM_MUTATION is always false", () => {
  const states: ExecContext[] = [
    initialContext(),
    run([{ type: "APPROVE" }]),
    run([{ type: "APPROVE" }, { type: "START" }]),
    run([{ type: "APPROVE" }, { type: "START" }, { type: "ADVANCE" }, { type: "PAUSE" }]),
    runToAwaiting(),
    reduce(runToAwaiting(), { type: "COMMIT_SAVE" }),
    run([{ type: "DENY" }]),
    run([{ type: "APPROVE" }, { type: "START" }, { type: "CANCEL" }]),
    run([{ type: "APPROVE" }, { type: "START" }, { type: "FAIL", reason: "x" }]),
  ];
  for (const ctx of states) {
    assert.equal(telegramMutation(ctx), false, `mutation must be false in state ${ctx.state}`);
  }
});

// 8. Read-only request does not start the executor.
test("8 · read-only message never starts execution", () => {
  const ctx = reduce(initialContext(), { type: "READ_ONLY_MESSAGE" });
  assert.equal(ctx.state, "pending_approval");
  assert.equal(actionCreated(ctx), true); // plan exists but…
  assert.equal(ctx.currentStepIndex, -1); // …nothing is executing
  // From idle it also stays idle.
  const idle: ExecContext = { ...initialContext(), state: "idle" as ExecutionState };
  assert.equal(reduce(idle, { type: "READ_ONLY_MESSAGE" }).state, "idle");
});

// 9. Back at the confirmation gate performs no action / mutation.
test("9 · Back from confirmation performs no mutation", () => {
  const before = runToAwaiting();
  const ctx = reduce(before, { type: "BACK", at: "2026-07-16T00:02:00.000Z" });
  assert.equal(ctx.state, "paused");
  assert.equal(ctx.bio, DEMO_OLD_BIO); // no save
  assert.equal(ctx.draftBio, DEMO_OLD_BIO); // staged text discarded
  // No completion / no mutation was logged.
  assert.ok(!ctx.audit.some((a) => a.event === "completed"));
});

// 10. /client receives no cursor / highlight / enhancer.
test("10 · /client is isolated from executor UI", () => {
  const clientPage = readFileSync(path.join(REPO_ROOT, "apps/web/app/client/page.tsx"), "utf8");
  for (const token of ["VisualExecutorCursor", "visualExecutor", "data-epic-target", "data-epic-cursor", "data-epic-highlight"]) {
    assert.equal(clientPage.includes(token), false, `/client must not reference ${token}`);
  }
  // The desktop enhancer is route-gated to /tma/profile.
  const enhancer = readFileSync(path.join(REPO_ROOT, "apps/web/components/DynamicOperatorWindowEnhancer.tsx"), "utf8");
  assert.ok(enhancer.includes('TARGET_PATH = "/tma/profile"'));
  assert.ok(enhancer.includes("isTargetRoute"));
});

// 11. Cursor stays inside the viewport / above safe-area (mobile no overlap).
test("11 · clampToViewport keeps the cursor on-screen", () => {
  const box = { width: 390, height: 844, safeTop: 20, safeBottom: 34, safeLeft: 8, safeRight: 8, margin: 18 };
  const below = clampToViewport({ x: 200, y: 5000 }, box);
  assert.ok(below.y <= box.height - box.margin - box.safeBottom);
  const above = clampToViewport({ x: -50, y: -50 }, box);
  assert.ok(above.x >= box.margin + box.safeLeft);
  assert.ok(above.y >= box.margin + box.safeTop);
  const inside = clampToViewport({ x: 195, y: 400 }, box);
  assert.deepEqual(inside, { x: 195, y: 400 }); // unchanged when already in bounds
});

// 12. Audit events are recorded in the correct order.
test("12 · audit trail order for the happy path", () => {
  const ctx = reduce(runToAwaiting(), { type: "COMMIT_SAVE", at: "2026-07-16T00:03:00.000Z" });
  const order = ctx.audit.map((a) => a.event);
  assert.deepEqual(order, [
    "approved",
    "step_started", // open-profile
    "step_completed",
    "step_started", // choose-edit
    "step_completed",
    "step_started", // fill-bio
    "step_completed",
    "step_started", // await-save
    "final_confirmation_requested",
    "completed",
  ]);
});

// 13. Deny at the gate → cancelled, nothing executes.
test("13 · Deny cancels before any step runs", () => {
  const ctx = reduce(initialContext(), { type: "DENY" });
  assert.equal(ctx.state, "cancelled");
  assert.equal(ctx.currentStepIndex, -1);
  assert.equal(ctx.bio, DEMO_OLD_BIO);
});

// 14. Reaching the gate never auto-saves (no COMMIT without explicit event).
test("14 · awaiting_final_confirmation does not auto-complete", () => {
  const ctx = runToAwaiting();
  // Extra ticks must not push past the gate or save.
  const ticked = reduce(reduce(ctx, { type: "ADVANCE" }), { type: "ADVANCE" });
  assert.equal(ticked.state, "awaiting_final_confirmation");
  assert.equal(ticked.bio, DEMO_OLD_BIO);
});

// 15. START only fires from approved; COMMIT_SAVE only from the gate.
test("15 · state guards reject out-of-order events", () => {
  // START from pending_approval is a no-op.
  assert.equal(reduce(initialContext(), { type: "START" }).state, "pending_approval");
  // COMMIT_SAVE from executing is a no-op (no bypassing the gate).
  const executing = run([{ type: "APPROVE" }, { type: "START" }]);
  const bypass = reduce(executing, { type: "COMMIT_SAVE" });
  assert.equal(bypass.state, "executing");
  assert.equal(bypass.bio, DEMO_OLD_BIO);
});

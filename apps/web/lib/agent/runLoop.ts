// lib/agent/runLoop.ts — the operator agent LOOP engine (stage 1, §1).
//
// plan -> pick step -> (risk=mutation => approval gate, loop pauses) -> call
// tool -> verify -> record -> RE-EVALUATE -> next step, until succeeded /
// max-steps / timeout / cancel / stuck.
//
// Hard guarantees encoded here:
//   * hard maxSteps AND a wall-clock run timeout
//   * repeated-step detection (anti-loop)
//   * every step row is persisted BEFORE execution and updated AFTER
//   * a tool error does NOT silently kill the run — it is recorded and the
//     planner re-evaluates (retry / alternative / honest stop)
//   * mutations are NEVER executed here; the loop pauses at waiting_approval
//   * cancellation is checked between steps and right after each tool call; an
//     already-executed external effect is recorded truthfully, never rolled back
//
// Pure orchestration over injected ports (RunStore, ToolRegistry, Planner,
// Clock) so it is fully unit-testable with fakes.

import type {
  AgentRun,
  AgentRunStatus,
  AgentStep,
  AgentStepInput,
  AgentStepResult,
  Clock,
  LoopDeps,
  ToolCallOutcome,
  ToolContext
} from "./types.ts";
import { REPEAT_LIMIT } from "./types.ts";
import { deriveStepStatus } from "./verify.ts";

const realClock: Clock = { now: () => Date.now() };

function iso(clock: Clock): string {
  return new Date(clock.now()).toISOString();
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Canonical, order-stable signature of a step for loop detection.
export function stepSignature(input: { tool: string; args: Record<string, unknown> }): string {
  return `${input.tool}:${stableStringify(input.args ?? {})}`;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

function planToSteps(inputs: AgentStepInput[], runId: string): AgentStep[] {
  return inputs.map((s, i) => ({
    id: `${runId}.p${i}`,
    index: i,
    tool: s.tool,
    args: s.args ?? {},
    intent: s.intent,
    risk: s.risk
  }));
}

function newStepResult(run: AgentRun, input: AgentStepInput, index: number, attempt: number, clock: Clock): AgentStepResult {
  return {
    id: `${run.id}.s${index}.a${attempt}`,
    runId: run.id,
    stepId: `${run.id}.s${index}`,
    index,
    tool: input.tool,
    intent: input.intent,
    risk: input.risk,
    args: input.args ?? {},
    attempt,
    startedAt: iso(clock),
    finishedAt: null,
    claimed: "",
    verified: null,
    status: "running",
    error: null
  };
}

function finish(run: AgentRun, status: AgentRunStatus, reason: string, clock: Clock): void {
  run.status = status;
  run.reason = reason;
  run.finishedAt = iso(clock);
}

// Success unless a step is in a hard-failed state. The planner only says `done`
// when the goal is met; per-step nuance (partial / unverified) survives in the
// step rows, but a failed step means the run did not cleanly succeed.
function terminalRunStatus(run: AgentRun): AgentRunStatus {
  const anyFailed = run.steps.some((s) => s.status === "failed");
  return anyFailed ? "failed" : "succeeded";
}

export async function runAgentLoop(run: AgentRun, deps: LoopDeps): Promise<AgentRun> {
  const { store, tools, planner } = deps;
  const clock = deps.clock ?? realClock;
  const startMs = clock.now();

  run.status = "planning";
  run.startedAt = iso(clock);
  await store.saveRun(run);

  // Initial plan is a preview only; execution is driven by planner.next().
  try {
    const preview = await planner.plan(run);
    run.plan = planToSteps(preview, run.id);
  } catch {
    run.plan = [];
  }

  run.status = "running";
  await store.saveRun(run);

  const sigCounts = new Map<string, number>();
  let index = run.steps.length;

  // Guard against a runaway loop even if a port misbehaves: the while(true) is
  // bounded by maxSteps + timeout checks at the top of every iteration.
  while (true) {
    // 1. Terminal guards, checked BEFORE choosing/doing anything.
    if (run.cancelRequested || (await store.isCancelRequested(run.id))) {
      finish(run, "cancelled", "cancelled_by_user", clock);
      break;
    }
    if (clock.now() - startMs > run.timeoutMs) {
      finish(run, "failed", "timeout", clock);
      break;
    }
    if (run.steps.length >= run.maxSteps) {
      finish(run, "failed", "max_steps_exceeded", clock);
      break;
    }

    // 2. Re-evaluate: pick the next action from the full run so far.
    let decision;
    try {
      decision = await planner.next(run);
    } catch (e) {
      finish(run, "failed", `planner_error:${errMsg(e)}`, clock);
      break;
    }
    if (decision.kind === "done") {
      finish(run, terminalRunStatus(run), decision.summary || "done", clock);
      break;
    }
    if (decision.kind === "stop") {
      finish(run, "failed", decision.reason || "stopped", clock);
      break;
    }

    const input = decision.step;

    // 3. Loop detection — the same action repeated too often is a stuck agent.
    const sig = stepSignature(input);
    const seen = (sigCounts.get(sig) ?? 0) + 1;
    sigCounts.set(sig, seen);
    if (seen > REPEAT_LIMIT + 1) {
      finish(run, "failed", `repeated_step:${input.tool}`, clock);
      break;
    }

    // 4. Persist the step row BEFORE executing it.
    const result = newStepResult(run, input, index, 1, clock);
    run.steps.push(result);
    await store.upsertStep(result);

    const tool = tools.get(input.tool);
    if (!tool) {
      result.status = "failed";
      result.error = "unknown_tool";
      result.claimed = `Инструмент "${input.tool}" не зарегистрирован.`;
      result.finishedAt = iso(clock);
      await store.upsertStep(result);
      await store.saveRun(run);
      index += 1;
      continue; // let the planner see the failure and re-evaluate
    }

    // 5. Mutation gate — NEVER executed inside the loop. Pause for the existing
    //    prepare->confirm->execute approval gate (which itself enforces
    //    telegramMutationsEnabled()). No bypass, no hardcoded approval.
    if (input.risk === "mutation" || tool.risk === "mutation") {
      result.status = "awaiting_approval";
      result.claimed = "Мутация требует подтверждения через approval-гейт (prepare→confirm→execute).";
      result.finishedAt = iso(clock);
      await store.upsertStep(result);
      finish(run, "waiting_approval", `awaiting_approval:${input.tool}`, clock);
      break;
    }

    const ctx: ToolContext = {
      run,
      isCancelled: async () => run.cancelRequested || (await store.isCancelRequested(run.id))
    };

    // 6. Execute (read/draft). A throw becomes a recorded failure, not a crash.
    let outcome: ToolCallOutcome;
    try {
      outcome = await tool.call(input.args, ctx);
    } catch (e) {
      outcome = { ok: false, claimed: "", error: `tool_threw:${errMsg(e)}` };
    }
    result.claimed = outcome.claimed || "";

    // 6a. A cancel that arrived DURING the call: record this step truthfully
    //     (incl. any external effect that already happened) then stop.
    if (await ctx.isCancelled()) {
      let verified = null;
      if (outcome.ok) {
        try {
          verified = await tool.verify(input.args, outcome, ctx);
        } catch {
          verified = null;
        }
      }
      result.verified = verified;
      result.status = deriveStepStatus(input.risk, outcome, verified);
      result.error = outcome.ok ? null : outcome.error ?? "error";
      result.finishedAt = iso(clock);
      await store.upsertStep(result);
      const note = outcome.externalEffect
        ? "cancelled_by_user; внешнее действие уже выполнено и НЕ откатывается"
        : "cancelled_by_user";
      finish(run, "cancelled", note, clock);
      break;
    }

    // 7. Verify the effect independently.
    let verified = null;
    if (outcome.ok) {
      try {
        verified = await tool.verify(input.args, outcome, ctx);
      } catch (e) {
        verified = null;
        result.error = `verify_threw:${errMsg(e)}`;
      }
    }
    result.verified = verified;
    result.status = deriveStepStatus(input.risk, outcome, verified);
    if (!outcome.ok) result.error = outcome.error ?? "error";
    result.finishedAt = iso(clock);

    // 8. Persist the step row AFTER, and snapshot the run.
    await store.upsertStep(result);
    await store.saveRun(run);

    index += 1;
    // loop continues; planner.next() now sees this result and re-evaluates.
  }

  await store.saveRun(run);
  return run;
}

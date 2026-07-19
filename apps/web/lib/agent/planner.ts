// lib/agent/planner.ts — deterministic (heuristic) planner for stage 1.
//
// This is a REAL planner, not a mock: it decomposes a goal into ordered stages,
// then re-evaluates after every step using the actual recorded results (a failed
// or empty read genuinely changes what it does next). It is deterministic so the
// loop is testable without an LLM; an LLM-backed Planner can drop in later behind
// the same port. It never fabricates success — it emits `stop` honestly when a
// stage cannot be satisfied.
//
// Pure + type-only imports so it loads under Node type-stripping in tests.

import type {
  AgentRun,
  AgentStepInput,
  AgentStepResult,
  PlanDecision,
  Planner,
  StepRisk
} from "./types.ts";

type Stage = {
  tool: string;
  risk: StepRisk;
  intent: string;
  // Whether this stage feeds the next one; if it produced nothing usable, the
  // planner stops rather than working on emptiness.
  feedsNext?: boolean;
  args?: (run: AgentRun) => Record<string, unknown>;
};

// How many times a stage may be retried after a failed result before the planner
// gives up and stops honestly.
const MAX_STAGE_RETRIES = 1;

function lc(s: string): string {
  return (s || "").toLowerCase();
}

function wantsPublish(goal: string): boolean {
  const s = lc(goal);
  return /опубликов|публикац|отправ|запост|post it|publish|send it|разошли/.test(s);
}

// Build the stage list from the goal. The canonical demo ("собери последние
// сообщения канала, проанализируй, подготовь черновик поста") decomposes into
// collect -> analyze -> draft -> review, plus an optional gated publish stage
// only when the goal explicitly asks to publish/send.
export function deriveStages(run: AgentRun): Stage[] {
  const goal = run.goal;
  const chatArgs = (r: AgentRun) => ({
    chatId: r.context?.chatId ?? null,
    chatTitle: r.context?.chatTitle ?? null
  });

  const stages: Stage[] = [
    {
      tool: "get_last_messages",
      risk: "read",
      intent: "Собрать последние сообщения выбранного чата/канала",
      feedsNext: true,
      args: chatArgs
    },
    {
      tool: "summarize_chat",
      risk: "draft",
      intent: "Проанализировать собранные сообщения и выделить главное",
      feedsNext: true,
      args: chatArgs
    },
    {
      tool: "prepare_post",
      risk: "draft",
      intent: "Подготовить черновик поста на основе анализа",
      feedsNext: true,
      args: chatArgs
    },
    {
      tool: "review_draft",
      risk: "read",
      intent: "Проверить черновик на полноту и связность перед отправкой",
      args: chatArgs
    }
  ];

  if (wantsPublish(goal)) {
    stages.push({
      tool: "publish_post",
      risk: "mutation",
      intent: "Опубликовать пост (требует подтверждения через approval-гейт)",
      args: chatArgs
    });
  }

  return stages;
}

function resultsForTool(run: AgentRun, tool: string): AgentStepResult[] {
  return run.steps.filter((s) => s.tool === tool);
}

function isProgress(status: string): boolean {
  // A stage counts as progressed (move on) when it succeeded, partially
  // succeeded, or — for non-mutations — could not be verified but did run.
  return status === "success" || status === "partial" || status === "unverified";
}

export function createHeuristicPlanner(customStages?: (run: AgentRun) => Stage[]): Planner {
  const stagesOf = customStages ?? deriveStages;

  const toInput = (run: AgentRun, stage: Stage): AgentStepInput => ({
    tool: stage.tool,
    args: typeof stage.args === "function" ? stage.args(run) : {},
    intent: stage.intent,
    risk: stage.risk
  });

  return {
    async plan(run: AgentRun): Promise<AgentStepInput[]> {
      return stagesOf(run).map((s) => toInput(run, s));
    },

    async next(run: AgentRun): Promise<PlanDecision> {
      const stages = stagesOf(run);

      for (const stage of stages) {
        const results = resultsForTool(run, stage.tool);
        const progressed = results.some((r) => isProgress(r.status));
        if (progressed) {
          // This stage is done. If it feeds the next stage but produced nothing
          // usable, stop honestly instead of building on emptiness.
          const best = results.find((r) => isProgress(r.status));
          if (stage.feedsNext && best && best.verified && best.verified.passed === false) {
            return { kind: "stop", reason: `empty_result:${stage.tool}` };
          }
          continue;
        }

        // Not progressed yet. If it has failed before, decide retry vs. stop.
        const failures = results.filter((r) => r.status === "failed").length;
        if (failures > 0) {
          if (failures <= MAX_STAGE_RETRIES) {
            return { kind: "step", step: toInput(run, stage) }; // retry
          }
          return { kind: "stop", reason: `stage_failed:${stage.tool}` };
        }

        // Fresh stage — run it.
        return { kind: "step", step: toInput(run, stage) };
      }

      // Every stage progressed.
      return { kind: "done", summary: describeOutcome(run) };
    }
  };
}

function describeOutcome(run: AgentRun): string {
  const total = run.steps.length;
  const ok = run.steps.filter((s) => s.status === "success").length;
  const soft = run.steps.filter((s) => s.status === "partial" || s.status === "unverified").length;
  return `Готово: ${ok}/${total} шагов подтверждены${soft ? `, ${soft} без полной верификации` : ""}.`;
}

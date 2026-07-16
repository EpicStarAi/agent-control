// Visual Executor — approval-gated, UI-only, local-demo state machine.
//
// This module is intentionally framework-agnostic and side-effect-free (except
// the optional localStorage helpers at the bottom, which are SSR-guarded). The
// React layer (TelegramNativeProfile / VisualExecutorCursor) drives it, and the
// node:test suite exercises the exact same reducer the UI runs — no parallel
// re-implementation.
//
// SAFETY INVARIANTS enforced here:
//   * TELEGRAM_MUTATION is ALWAYS false. There is no code path that flips it.
//   * EXECUTION_MODE is ALWAYS "local_demo".
//   * Targeting is restricted to an allowlist of data-epic-target IDs. No text
//     search, no arbitrary CSS selectors, no eval, no LLM-generated JS.
//   * The final irreversible-looking action (save) requires a *separate* second
//     confirmation (COMMIT_SAVE); reaching awaiting_final_confirmation never
//     saves on its own.

export type ExecutionState =
  | "idle"
  | "pending_approval"
  | "approved"
  | "executing"
  | "paused"
  | "awaiting_final_confirmation"
  | "completed"
  | "cancelled"
  | "failed";

export type StepAction = "navigate" | "highlight" | "click" | "fill" | "wait" | "confirm";
export type StepStatus = "pending" | "active" | "completed" | "cancelled" | "failed";

// Visual phase → colour mapping (used by the highlight overlay / cursor).
export type ExecutionPhase =
  | "analysis" // violet
  | "navigation" // cyan
  | "safe_execution" // emerald
  | "awaiting_confirmation" // gold
  | "error"; // red (error / cancel)

export type ExecutionStep = {
  id: string;
  label: string;
  targetId?: TargetId;
  action: StepAction;
  phase: ExecutionPhase;
  status: StepStatus;
  requiresFinalConfirmation?: boolean;
};

export type AuditEventType =
  | "approved"
  | "step_started"
  | "step_completed"
  | "paused"
  | "resumed"
  | "final_confirmation_requested"
  | "cancelled"
  | "completed"
  | "failed";

export type AuditEvent = {
  id: string;
  timestamp: string;
  actionId: string;
  event: AuditEventType;
  stepId?: string;
  targetId?: string;
  result?: string;
};

// ---------------------------------------------------------------------------
// DOM targeting allowlist. The executor may ONLY resolve targets whose
// data-epic-target value appears here. Anything else is rejected.
// ---------------------------------------------------------------------------
export const TARGET_IDS = [
  "profile-card",
  "profile-edit-button",
  "profile-bio-field",
  "profile-save-button",
] as const;

export type TargetId = (typeof TARGET_IDS)[number];

export function isAllowedTarget(id: string): id is TargetId {
  return (TARGET_IDS as readonly string[]).includes(id);
}

// Build a single, allowlisted attribute selector. Returns null for anything not
// on the allowlist so callers can never query an arbitrary selector.
export function resolveTargetSelector(id: string): string | null {
  if (!isAllowedTarget(id)) return null;
  return `[data-epic-target="${id}"]`;
}

// ---------------------------------------------------------------------------
// Demo scenario constants.
// ---------------------------------------------------------------------------
export const DEMO_OLD_BIO = "TOP SECRET";
export const DEMO_NEW_BIO = "TOP SECRET // AI MODE";
export const DEFAULT_ACTION_ID = "act-bio-demo";
export const EXECUTION_MODE = "local_demo" as const;

// The four progress steps shown in the "Выполнение задачи" panel. Cursor
// movement and highlight transitions are presentation details layered on top of
// these canonical steps by the React driver.
export function createDemoSteps(): ExecutionStep[] {
  return [
    {
      id: "step-open-profile",
      label: "Открываю профиль",
      targetId: "profile-card",
      action: "highlight",
      phase: "analysis",
      status: "pending",
    },
    {
      id: "step-choose-edit",
      label: "Выбираю «Изменить»",
      targetId: "profile-edit-button",
      action: "navigate",
      phase: "navigation",
      status: "pending",
    },
    {
      id: "step-fill-bio",
      label: "Заполняю Bio",
      targetId: "profile-bio-field",
      action: "fill",
      phase: "safe_execution",
      status: "pending",
    },
    {
      id: "step-await-save",
      label: "Ожидаю подтверждения сохранения",
      targetId: "profile-save-button",
      action: "confirm",
      phase: "awaiting_confirmation",
      status: "pending",
      requiresFinalConfirmation: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Execution context + reducer.
// ---------------------------------------------------------------------------
export type ExecContext = {
  actionId: string;
  state: ExecutionState;
  steps: ExecutionStep[];
  currentStepIndex: number; // -1 until execution starts
  bio: string; // committed local-demo profile bio
  draftBio: string; // text staged in local state, NOT yet saved
  formOpen: boolean; // simulated edit-form open flag
  audit: AuditEvent[];
};

export type ExecEvent =
  | { type: "REQUEST_APPROVAL" }
  | { type: "READ_ONLY_MESSAGE" }
  | { type: "DENY"; at?: string }
  | { type: "APPROVE"; at?: string }
  | { type: "START"; at?: string }
  | { type: "ADVANCE"; at?: string }
  | { type: "PAUSE"; at?: string }
  | { type: "RESUME"; at?: string }
  | { type: "BACK"; at?: string }
  | { type: "CANCEL"; at?: string }
  | { type: "COMMIT_SAVE"; at?: string }
  | { type: "FAIL"; at?: string; reason?: string };

export function initialContext(actionId: string = DEFAULT_ACTION_ID): ExecContext {
  return {
    actionId,
    state: "pending_approval",
    steps: createDemoSteps(),
    currentStepIndex: -1,
    bio: DEMO_OLD_BIO,
    draftBio: DEMO_OLD_BIO,
    formOpen: false,
    audit: [],
  };
}

// States from which an in-flight execution can be cancelled.
const CANCELLABLE: ExecutionState[] = [
  "pending_approval",
  "approved",
  "executing",
  "paused",
  "awaiting_final_confirmation",
];

function makeAudit(
  ctx: ExecContext,
  event: AuditEventType,
  extra: Partial<Pick<AuditEvent, "stepId" | "targetId" | "result">> = {},
  at?: string,
): AuditEvent {
  return {
    // Deterministic, unique-within-run id. The server audit API can replace it.
    id: `${ctx.actionId}:${ctx.audit.length}:${event}`,
    timestamp: at ?? "",
    actionId: ctx.actionId,
    event,
    ...extra,
  };
}

function withAudit(ctx: ExecContext, evt: AuditEvent): AuditEvent[] {
  return [...ctx.audit, evt];
}

function markStep(steps: ExecutionStep[], index: number, status: StepStatus): ExecutionStep[] {
  return steps.map((step, i) => (i === index ? { ...step, status } : step));
}

// Mark every not-yet-finished step with a terminal status (used on cancel/fail).
function terminateSteps(steps: ExecutionStep[], status: StepStatus): ExecutionStep[] {
  return steps.map((step) =>
    step.status === "completed" ? step : { ...step, status },
  );
}

export function reduce(ctx: ExecContext, event: ExecEvent): ExecContext {
  switch (event.type) {
    // A plain chat / read-only request must NEVER start or mutate the executor.
    case "READ_ONLY_MESSAGE":
      return ctx;

    case "REQUEST_APPROVAL":
      if (ctx.state !== "idle") return ctx;
      return { ...ctx, state: "pending_approval" };

    case "DENY": {
      if (ctx.state !== "pending_approval") return ctx;
      return {
        ...ctx,
        state: "cancelled",
        steps: terminateSteps(ctx.steps, "cancelled"),
        audit: withAudit(ctx, makeAudit(ctx, "cancelled", { result: "denied" }, event.at)),
      };
    }

    case "APPROVE": {
      if (ctx.state !== "pending_approval") return ctx;
      return {
        ...ctx,
        state: "approved",
        audit: withAudit(ctx, makeAudit(ctx, "approved", {}, event.at)),
      };
    }

    case "START": {
      // Only a prior explicit approval may start execution.
      if (ctx.state !== "approved") return ctx;
      const steps = markStep(ctx.steps, 0, "active");
      const first = steps[0];
      return {
        ...ctx,
        state: "executing",
        currentStepIndex: 0,
        steps,
        audit: withAudit(
          ctx,
          makeAudit(ctx, "step_started", { stepId: first.id, targetId: first.targetId }, event.at),
        ),
      };
    }

    case "ADVANCE": {
      if (ctx.state !== "executing") return ctx; // paused / other states ignore ticks
      const idx = ctx.currentStepIndex;
      const current = ctx.steps[idx];
      if (!current) return ctx;

      // Reached the confirmation gate → stop and request a SEPARATE confirmation.
      // The step stays "active" (awaiting); it is only completed by COMMIT_SAVE.
      // Nothing is saved here.
      if (current.requiresFinalConfirmation) {
        return {
          ...ctx,
          state: "awaiting_final_confirmation",
          audit: withAudit(
            ctx,
            makeAudit(ctx, "final_confirmation_requested", { stepId: current.id, targetId: current.targetId }, event.at),
          ),
        };
      }

      // Side-effect of completing the "fill" step: stage the new bio into local
      // draft state only (no save, no mutation). "navigate" opens the sim form.
      const draftBio = current.action === "fill" ? DEMO_NEW_BIO : ctx.draftBio;
      const formOpen = current.action === "navigate" ? true : ctx.formOpen;

      let steps = markStep(ctx.steps, idx, "completed");
      let audit = withAudit(
        ctx,
        makeAudit(ctx, "step_completed", { stepId: current.id, targetId: current.targetId }, event.at),
      );

      const nextIdx = idx + 1;
      const next = ctx.steps[nextIdx];
      if (!next) {
        // No more steps and none required confirmation — nothing to save.
        return { ...ctx, steps, draftBio, formOpen, audit, currentStepIndex: idx };
      }
      steps = markStep(steps, nextIdx, "active");
      const ctx2 = { ...ctx, audit };
      audit = withAudit(
        ctx2,
        makeAudit(ctx2, "step_started", { stepId: next.id, targetId: next.targetId }, event.at),
      );
      return { ...ctx, state: "executing", currentStepIndex: nextIdx, steps, draftBio, formOpen, audit };
    }

    case "PAUSE": {
      if (ctx.state !== "executing") return ctx;
      return {
        ...ctx,
        state: "paused",
        audit: withAudit(ctx, makeAudit(ctx, "paused", { stepId: ctx.steps[ctx.currentStepIndex]?.id }, event.at)),
      };
    }

    case "RESUME": {
      if (ctx.state !== "paused") return ctx;
      return {
        ...ctx,
        state: "executing",
        audit: withAudit(ctx, makeAudit(ctx, "resumed", { stepId: ctx.steps[ctx.currentStepIndex]?.id }, event.at)),
      };
    }

    // Final-confirmation "Назад": return to the previous (paused) screen WITHOUT
    // mutating anything. The staged draft is discarded back to the committed bio.
    case "BACK": {
      if (ctx.state !== "awaiting_final_confirmation") return ctx;
      return {
        ...ctx,
        state: "paused",
        draftBio: ctx.bio,
      };
    }

    case "CANCEL": {
      if (!CANCELLABLE.includes(ctx.state)) return ctx;
      return {
        ...ctx,
        state: "cancelled",
        steps: terminateSteps(ctx.steps, "cancelled"),
        draftBio: ctx.bio, // discard any staged text
        audit: withAudit(ctx, makeAudit(ctx, "cancelled", {}, event.at)),
      };
    }

    // The ONLY path that mutates the local demo profile — and only after the
    // separate second confirmation. Still never touches Telegram.
    case "COMMIT_SAVE": {
      if (ctx.state !== "awaiting_final_confirmation") return ctx;
      const idx = ctx.currentStepIndex;
      return {
        ...ctx,
        state: "completed",
        bio: ctx.draftBio, // local-demo state only
        steps: markStep(ctx.steps, idx, "completed"),
        audit: withAudit(
          ctx,
          makeAudit(ctx, "completed", { stepId: ctx.steps[idx]?.id, result: EXECUTION_MODE }, event.at),
        ),
      };
    }

    case "FAIL": {
      if (!CANCELLABLE.includes(ctx.state)) return ctx;
      return {
        ...ctx,
        state: "failed",
        steps: terminateSteps(ctx.steps, "failed"),
        draftBio: ctx.bio,
        audit: withAudit(ctx, makeAudit(ctx, "failed", { result: event.reason }, event.at)),
      };
    }

    default:
      return ctx;
  }
}

// ---------------------------------------------------------------------------
// Selectors — single source of truth for the safety flags surfaced in the UI.
// ---------------------------------------------------------------------------

// Telegram mutation is NEVER enabled by this executor, in any state.
export function telegramMutation(_ctx: ExecContext): false {
  return false;
}

export function executionMode(): typeof EXECUTION_MODE {
  return EXECUTION_MODE;
}

// ACTION_CREATED becomes true once we leave idle (an action plan exists).
export function actionCreated(ctx: ExecContext): boolean {
  return ctx.state !== "idle";
}

export function isExecuting(ctx: ExecContext): boolean {
  return ctx.state === "executing";
}

export function isActive(ctx: ExecContext): boolean {
  return (
    ctx.state === "approved" ||
    ctx.state === "executing" ||
    ctx.state === "paused" ||
    ctx.state === "awaiting_final_confirmation"
  );
}

export function isTerminal(ctx: ExecContext): boolean {
  return ctx.state === "completed" || ctx.state === "cancelled" || ctx.state === "failed";
}

// ---------------------------------------------------------------------------
// Cursor geometry — keep the AI cursor / highlight inside the viewport and above
// the safe-area insets (mobile no-overlap requirement).
// ---------------------------------------------------------------------------
export type Point = { x: number; y: number };
export type ViewportBox = {
  width: number;
  height: number;
  safeTop?: number;
  safeBottom?: number;
  safeLeft?: number;
  safeRight?: number;
  margin?: number; // keep the cursor this far from every edge
};

export function clampToViewport(point: Point, box: ViewportBox): Point {
  const margin = box.margin ?? 12;
  const minX = margin + (box.safeLeft ?? 0);
  const maxX = box.width - margin - (box.safeRight ?? 0);
  const minY = margin + (box.safeTop ?? 0);
  const maxY = box.height - margin - (box.safeBottom ?? 0);
  return {
    x: Math.min(Math.max(point.x, minX), Math.max(minX, maxX)),
    y: Math.min(Math.max(point.y, minY), Math.max(minY, maxY)),
  };
}

// Phase → colour token (consumed by the overlay / cursor styling).
export function phaseColor(phase: ExecutionPhase): string {
  switch (phase) {
    case "analysis":
      return "#a855f7"; // violet
    case "navigation":
      return "#22d3ee"; // cyan
    case "safe_execution":
      return "#34d399"; // emerald
    case "awaiting_confirmation":
      return "#f59e0b"; // gold
    case "error":
      return "#f87171"; // red
    default:
      return "#a855f7";
  }
}

// ---------------------------------------------------------------------------
// Optional persistence — SSR-guarded, structured for a future server audit API.
// ---------------------------------------------------------------------------
export const AUDIT_STORAGE_KEY = "epicgram.tma.visualExecutor.audit.v1";

export function loadAudit(): AuditEvent[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuditEvent[]) : [];
  } catch {
    return [];
  }
}

export function saveAudit(audit: AuditEvent[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(audit));
  } catch {
    // Persistence is best-effort only.
  }
}

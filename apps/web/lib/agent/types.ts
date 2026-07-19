// lib/agent/types.ts — P-CLAW-AGENT-CORE stage 1.
//
// Types and ports for the operator agent LOOP. The operator used to be a single
// call ("talking head"): one command in, one answer out. This models the loop
// that replaces it — plan -> pick step -> (mutation => approval) -> call tool ->
// record result -> RE-EVALUATE -> next step, until succeeded / limit / cancel.
//
// Everything here is pure and Next-agnostic so the engine can be unit-tested
// under `node --test` with injected fakes. Only "erasable" TypeScript is used
// (no enum / namespace / parameter-properties) so Node's type-stripping can load
// these files directly from .mjs tests.

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

// Run lifecycle. `waiting_approval` is entered when the next required step is a
// mutation — the loop never performs mutations itself; they go through the
// existing prepare->confirm->execute approval gate out of band.
export type AgentRunStatus =
  | "planning"
  | "running"
  | "waiting_approval"
  | "waiting_input"
  | "succeeded"
  | "failed"
  | "cancelled";

// Risk drives the gate: read/draft run without approval; mutation is gated.
export type StepRisk = "read" | "draft" | "mutation";

// Per-step outcome. The four spec statuses (success | partial | failed |
// unverified) plus operational states the loop needs to persist a row BEFORE it
// runs (`running`) and to mark a gated mutation (`awaiting_approval`).
export type StepStatus =
  | "running"
  | "success"
  | "partial"
  | "failed"
  | "unverified"
  | "awaiting_approval";

// A planned action, human-readable `intent` included so the UI can show what
// each step is for in plain language.
export type AgentStep = {
  id: string;
  index: number;
  tool: string;
  args: Record<string, unknown>;
  intent: string;
  risk: StepRisk;
};

// The state-verification record. `null` means "could not verify" — which is an
// honest, first-class outcome, never silently upgraded to success.
export type Verification = {
  method: string; // e.g. "readback_count", "message_id_present", "nonempty_result"
  passed: boolean;
  evidence: string; // short, secret-free proof string
};

// The record written for every executed step. `claimed` is what the tool SAYS
// it did; `verified` is whether reality agrees. A step is never `success` just
// because the call did not throw — see deriveStepStatus in verify.ts.
export type AgentStepResult = {
  id: string;
  runId: string;
  stepId: string;
  index: number;
  tool: string;
  intent: string;
  risk: StepRisk;
  args: Record<string, unknown>;
  attempt: number;
  startedAt: string;
  finishedAt: string | null;
  claimed: string;
  verified: Verification | null;
  status: StepStatus;
  error: string | null;
};

export type AgentRun = {
  id: string;
  userId: string;
  workspaceId: string;
  // Bound Telegram account slot, resolved SERVER-SIDE. Never taken from client.
  accountId: string | null;
  goal: string;
  // Optional context the caller may attach (selected chat, etc.). Never trusted
  // for authorization — only used to parameterize read/draft tools.
  context: Record<string, unknown>;
  plan: AgentStep[];
  steps: AgentStepResult[];
  status: AgentRunStatus;
  maxSteps: number;
  timeoutMs: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  // Cooperative cancellation flag; the loop checks it between steps.
  cancelRequested: boolean;
  // Human-readable terminal reason (timeout / max_steps_exceeded / cancelled /
  // repeated_step / planner summary, ...). Never a secret.
  reason: string | null;
};

// ---------------------------------------------------------------------------
// Engine defaults / limits
// ---------------------------------------------------------------------------

export const MAX_STEPS_DEFAULT = 12;
export const RUN_TIMEOUT_MS_DEFAULT = 90_000;
// A step signature (tool + canonical args) may appear at most this many times
// before the loop aborts as stuck. The (limit+1)-th occurrence trips it.
export const REPEAT_LIMIT = 2;

// ---------------------------------------------------------------------------
// Tool port
// ---------------------------------------------------------------------------

// What a tool reports back. `ok` only means the call itself completed — it is
// deliberately NOT the same as "the effect happened" (that is verify()).
export type ToolCallOutcome = {
  ok: boolean;
  claimed: string; // human-readable claim, even when unverified
  data?: unknown; // structured payload for planner + verifier
  error?: string | null; // error code when ok=false
  partial?: boolean; // the tool itself signals an incomplete effect
  // True when the call attempted a real, irreversible external action (a send).
  // Used so a cancelled/failed run can honestly report "already executed".
  externalEffect?: boolean;
  messageId?: string | null; // telegram message id when a send claims success
};

export type ToolContext = {
  run: AgentRun;
  // Read-only view; the loop owns cancellation, tools may cooperatively bail.
  isCancelled: () => Promise<boolean>;
};

export type ToolDef = {
  name: string;
  risk: StepRisk;
  call: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolCallOutcome>;
  // Independent state check. Returns null when no verification is possible.
  verify: (
    args: Record<string, unknown>,
    outcome: ToolCallOutcome,
    ctx: ToolContext
  ) => Promise<Verification | null>;
};

export type ToolRegistry = {
  get: (name: string) => ToolDef | null;
};

// ---------------------------------------------------------------------------
// Planner port
// ---------------------------------------------------------------------------

export type AgentStepInput = {
  tool: string;
  args: Record<string, unknown>;
  intent: string;
  risk: StepRisk;
};

// The planner's re-evaluation output each iteration. `done` ends the run
// successfully; `stop` ends it as a failure with an honest reason.
export type PlanDecision =
  | { kind: "step"; step: AgentStepInput }
  | { kind: "done"; summary: string }
  | { kind: "stop"; reason: string };

export type Planner = {
  // Best-effort initial plan for visibility. May be empty; the loop is driven by
  // next(), so the plan is a preview, not a script.
  plan: (run: AgentRun) => Promise<AgentStepInput[]>;
  // Choose the next action given the full run so far — including every prior
  // result and its verification. THIS is the re-evaluation the spec requires.
  next: (run: AgentRun) => Promise<PlanDecision>;
};

// ---------------------------------------------------------------------------
// Persistence port
// ---------------------------------------------------------------------------

// The loop persists a step row BEFORE execution and updates it AFTER, and reads
// the cancel flag between steps. Implemented by agentRunsStore (fs) /
// agentRunsDb (pg). Kept minimal so fakes are trivial in tests.
export type RunStore = {
  createRun: (run: AgentRun) => Promise<void>;
  saveRun: (run: AgentRun) => Promise<void>;
  getRun: (id: string) => Promise<AgentRun | null>;
  upsertStep: (result: AgentStepResult) => Promise<void>;
  isCancelRequested: (id: string) => Promise<boolean>;
  requestCancel: (id: string) => Promise<void>;
};

export type Clock = { now: () => number };

export type LoopDeps = {
  store: RunStore;
  tools: ToolRegistry;
  planner: Planner;
  clock?: Clock;
};

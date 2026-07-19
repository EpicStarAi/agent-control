// tests/helpers/agentHarness.mjs — in-memory fakes for the agent loop engine.
// No Next, no DB, no network. Loaded by the .test.mjs suites; the engine itself
// is imported straight from TypeScript via Node's type-stripping.

// A minimal RunStore that records every write so tests can assert the
// before/after per-step persistence discipline.
export function makeStore() {
  const runs = new Map();
  const events = [];
  return {
    runs,
    events,
    async createRun(run) {
      runs.set(run.id, structuredClone(run));
      events.push({ kind: "create", id: run.id });
    },
    async saveRun(run) {
      const prev = runs.get(run.id);
      const clone = structuredClone(run);
      // Preserve a cancel requested concurrently after the caller read the run.
      clone.cancelRequested = Boolean(prev?.cancelRequested) || Boolean(run.cancelRequested);
      runs.set(run.id, clone);
      events.push({ kind: "save", id: run.id, status: run.status });
    },
    async getRun(id) {
      const r = runs.get(id);
      return r ? structuredClone(r) : null;
    },
    async upsertStep(result) {
      const r = runs.get(result.runId);
      if (!r) return;
      const i = r.steps.findIndex((s) => s.id === result.id);
      if (i >= 0) r.steps[i] = structuredClone(result);
      else r.steps.push(structuredClone(result));
      events.push({ kind: "step", id: result.id, index: result.index, status: result.status });
    },
    async isCancelRequested(id) {
      return Boolean(runs.get(id)?.cancelRequested);
    },
    async requestCancel(id) {
      const r = runs.get(id);
      if (r) r.cancelRequested = true;
    }
  };
}

// A registry over a plain { name: toolDef } map.
export function makeRegistry(map) {
  return { get: (name) => map[name] ?? null };
}

let runSeq = 0;

// Build a plain AgentRun object (no crypto / Next imports).
export function makeRun(overrides = {}) {
  const now = new Date(0).toISOString();
  return {
    id: `test_run_${runSeq++}`,
    userId: "u1",
    workspaceId: "w1",
    accountId: null,
    goal: "test goal",
    context: {},
    plan: [],
    steps: [],
    status: "planning",
    maxSteps: 12,
    timeoutMs: 90_000,
    createdAt: now,
    startedAt: null,
    finishedAt: null,
    cancelRequested: false,
    reason: null,
    ...overrides
  };
}

// A read/draft tool that returns a non-empty result (verify passes -> success).
export function okTool(name, risk = "read") {
  return {
    name,
    risk,
    call: async () => ({ ok: true, claimed: `${name} done`, data: { items: [1, 2, 3], text: `${name} output` } }),
    verify: async (_a, outcome) => ({
      method: "nonempty_result",
      passed: Boolean(outcome.data && Array.isArray(outcome.data.items) && outcome.data.items.length > 0),
      evidence: "items>0"
    })
  };
}

// A tool that CLAIMS success but has no real effect: verify contradicts it.
export function brokenTool(name, risk = "read") {
  return {
    name,
    risk,
    call: async () => ({ ok: true, claimed: `${name} claims success`, data: { items: [] } }),
    verify: async () => ({ method: "readback_count", passed: false, evidence: "observed=0" })
  };
}

// A tool that succeeds but cannot be verified (verify returns null -> unverified).
export function unverifiableTool(name, risk = "read") {
  return {
    name,
    risk,
    call: async () => ({ ok: true, claimed: `${name} ran`, data: { items: [1] } }),
    verify: async () => null
  };
}

// A tool whose call fails (ok:false).
export function failingTool(name, risk = "read") {
  return {
    name,
    risk,
    call: async () => ({ ok: false, claimed: "", error: "boom" }),
    verify: async () => null
  };
}

// A mutation tool with a call spy — the loop must NEVER invoke it.
export function spyMutationTool(name = "publish_post") {
  const spy = { calls: 0 };
  return {
    spy,
    tool: {
      name,
      risk: "mutation",
      call: async () => {
        spy.calls += 1;
        return { ok: true, claimed: "SENT", messageId: "should_never_happen" };
      },
      verify: async (_a, outcome) => ({
        method: "message_id_present",
        passed: Boolean(outcome.messageId),
        evidence: "id"
      })
    }
  };
}

// Planner that always proposes the same step — for loop-detection tests.
export function stuckPlanner(step) {
  return {
    async plan() {
      return [step];
    },
    async next() {
      return { kind: "step", step };
    }
  };
}

// Planner that proposes N distinct steps then done — for maxSteps/timeout tests.
export function countingPlanner(tool, risk = "read") {
  let i = 0;
  return {
    async plan() {
      return [];
    },
    async next() {
      const step = { tool, args: { i: i++ }, intent: `step ${i}`, risk };
      return { kind: "step", step };
    }
  };
}

// A controllable clock; tools can advance `t` to simulate elapsed time.
export function makeClock(start = 0) {
  const state = { t: start };
  return { state, clock: { now: () => state.t } };
}

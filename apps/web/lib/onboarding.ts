// Onboarding state — per-workspace first-run progress.
//
// Scoped to a workspace_id resolved from the session cookie, exactly like the
// workspace profile (see lib/profile.ts). This is the ONLY place onboarding
// progress lives: it is persisted server-side in Postgres (with an fs fallback),
// NEVER in the browser's localStorage. That keeps the "passed / not passed"
// status durable across devices and honest about real state.

// The ordered steps of the forced first-run flow. `step` stores the index of the
// furthest screen the user has reached; it is advisory (resume hint) only — the
// authoritative gate is `completed` / `skipped`.
export const ONBOARDING_STEPS = [
  "intro-what",       // What EPIC GRAM is (a workplace, not a Telegram client)
  "intro-operator",   // The AI operator does the routine, sends nothing without you
  "approval-gate",    // What the Approval Gate is and how approve/reject works
  "connect",          // Connect a Telegram account (required for the system to act)
  "map",              // Where the operator / chats / missions live
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export const ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length;

export interface OnboardingState {
  workspaceId: string;
  step: number;        // furthest step index reached (0..ONBOARDING_STEP_COUNT-1)
  completed: boolean;  // finished the whole flow
  skipped: boolean;    // dismissed without completing (status stays "not passed")
  updatedAt: string;
}

export function emptyOnboarding(workspaceId: string): OnboardingState {
  return { workspaceId, step: 0, completed: false, skipped: false, updatedAt: new Date().toISOString() };
}

function clampStep(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(Math.trunc(n), 0), ONBOARDING_STEP_COUNT - 1);
}

export function normalizeOnboarding(workspaceId: string, i: Partial<OnboardingState>): OnboardingState {
  const completed = Boolean(i.completed);
  return {
    workspaceId,
    step: completed ? ONBOARDING_STEP_COUNT - 1 : clampStep(i.step),
    completed,
    // Completing clears the "skipped" flag; a completed run is never "skipped".
    skipped: completed ? false : Boolean(i.skipped),
    updatedAt: new Date().toISOString(),
  };
}

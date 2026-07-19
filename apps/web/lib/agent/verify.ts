// lib/agent/verify.ts — verification discipline for the agent loop.
//
// THE central rule of stage 1: a step is not `success` just because the tool
// call returned without throwing. Reality has to agree. This module maps a
// (risk, tool outcome, independent state check) triple to a step status, and
// provides small reusable verifiers.
//
// Pure + type-only imports so it loads under Node type-stripping in tests.

import type { StepRisk, StepStatus, ToolCallOutcome, Verification } from "./types.ts";

// Decide the honest status of an executed step.
//
//   - call failed (ok=false)            -> failed
//   - call ok, no verification possible -> unverified   (honest "couldn't check")
//   - call ok, verification contradicts -> failed        (state proves no effect)
//   - call ok, verification passes,
//       tool flagged partial            -> partial
//   - call ok, verification passes       -> success
//
// A mutation therefore can NEVER be `success` without a passing verification:
// if verify() returns null it is `unverified`, if it returns passed=false it is
// `failed`. A "broken" tool that returns ok with no real effect lands on
// unverified or failed — never a green check.
export function deriveStepStatus(
  risk: StepRisk,
  outcome: ToolCallOutcome,
  verified: Verification | null
): StepStatus {
  if (!outcome.ok) return "failed";
  if (verified == null) return "unverified";
  if (!verified.passed) return "failed";
  if (outcome.partial) return "partial";
  return "success";
}

// A mutation with no verification is a hard integrity error, not a soft
// "unverified". The loop uses this to refuse to treat unverifiable mutations as
// anything other than a problem. (Read/draft may legitimately be unverified.)
export function isAcceptableTerminalStatus(risk: StepRisk, status: StepStatus): boolean {
  if (status === "success") return true;
  if (status === "partial") return true;
  // unverified is acceptable ONLY for non-mutations.
  if (status === "unverified") return risk !== "mutation";
  return false;
}

// ---------------------------------------------------------------------------
// Reusable verifiers
// ---------------------------------------------------------------------------

// A read/draft tool that produced a non-empty result has, at minimum, verifiably
// done work. Absence of a result is reported honestly (passed=false).
export function verifyNonEmptyResult(data: unknown, label = "result"): Verification {
  const count = countItems(data);
  return {
    method: "nonempty_result",
    passed: count > 0,
    evidence: `${label}: ${count} item(s)`
  };
}

// A send is only verified when the runtime returned a concrete telegram message
// id. A claim without an id is unverifiable (returns passed=false so the loop
// records `failed` rather than a fake success).
export function verifyMessageId(outcome: ToolCallOutcome): Verification {
  const id = outcome.messageId;
  const ok = typeof id === "string" && id.length > 0;
  return {
    method: "message_id_present",
    passed: ok,
    evidence: ok ? `telegramMessageId=${id}` : "no telegramMessageId returned"
  };
}

// Compare an expected vs an observed count from an independent read-back
// (e.g. re-GET a chat's message count after an action).
export function verifyCount(expected: number, observed: number): Verification {
  return {
    method: "readback_count",
    passed: observed >= expected,
    evidence: `expected>=${expected} observed=${observed}`
  };
}

export function countItems(data: unknown): number {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    const items = (data as Record<string, unknown>).items;
    if (Array.isArray(items)) return items.length;
    const text = (data as Record<string, unknown>).text;
    if (typeof text === "string") return text.trim().length > 0 ? 1 : 0;
  }
  if (typeof data === "string") return data.trim().length > 0 ? 1 : 0;
  return 0;
}

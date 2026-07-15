# EPIC AI OS v4 — P-A Implementation

Status: active implementation specification.
Branch: `feature/epic-ai-os-v4-pa`.

## Objective

Replace the fixed operator intent switch with the first safe Director vertical slice:

`dialogue -> plan -> approval -> risk re-check -> tool execution -> verification -> audit`

P-A is deliberately limited to two Telegram tools:

1. `telegram.list_chats` — read-only proof of the execution pipeline.
2. `telegram.publish_post` — supervised write action with immutable approval snapshot.

## Safety invariants

- Production remains untouched until branch build and smoke tests pass.
- The LLM never executes arbitrary shell commands.
- Every executable action is selected from a typed tool registry.
- Approval binds to a frozen request hash; changed arguments invalidate approval.
- Risk policy is checked again immediately before execution.
- `deploy`, `money`, destructive account actions and channel deletion always require manual approval.
- All state transitions are written to `operator/audit`.

## P-A deliverables

- Runtime types and execution state machine.
- Typed tool registry.
- Autonomy/approval policy.
- Risk-gate contract.
- Read-only manifest endpoint for UI integration.
- Claude-like chat shell and inline Allow/Deny card.
- OpenRouter Director adapter behind the existing AI route layer.
- Real TDLib adapter wiring for list chats, then supervised publish.

## Acceptance test

User request: `Покажи последние Telegram-чаты NOVIKOVA`.

Expected flow:

1. Director emits a structured plan.
2. Director proposes `telegram.list_chats` with frozen arguments.
3. Co-pilot mode renders an inline approval card.
4. Allow triggers server-side revalidation and risk check.
5. TDLib returns real chats.
6. Result is shown in the chat.
7. Audit records every state transition.

No autonomous publishing is enabled in P-A.

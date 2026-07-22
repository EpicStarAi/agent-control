# epicgram-review-and-approval

## Description
Human-in-the-loop approval layer for EPICGRAM. The AI proposes; the operator decides. This skill defines the exact presentation format for proposals, the approval/rejection flow, and how to handle timeouts, edits, and partial approvals.

## When to use
Load this skill whenever the agent has produced a draft action (content, message, schedule, workflow trigger) that requires operator sign-off before execution.  
Always used **after** `epicgram-safe-mode` classifies an action as ORANGE or RED.

## Proposal Format

Every approval card must include:

```
╔══════════════════════════════════════════╗
║  📋 EPICGRAM — Approval Required         ║
╠══════════════════════════════════════════╣
║  Action:    <one-line description>       ║
║  Platform:  <Telegram / Instagram / ...> ║
║  Target:    <channel name / @handle>     ║
║  Scheduled: <datetime or "now">          ║
║  Safety:    ORANGE / RED                 ║
╠══════════════════════════════════════════╣
║  Preview:                                ║
║  <content draft or action summary>       ║
╠══════════════════════════════════════════╣
║  [ ✅ Approve ]  [ ✏️ Edit ]  [ ❌ Reject ] ║
╚══════════════════════════════════════════╝
```

Never use plain text confirmations ("type YES to confirm"). Always use structured cards with buttons.

## Approval Flow

1. **Present card** — show the proposal card with preview.
2. **Wait** — do not execute anything. Do not time out silently.
3. **On Approve** — pass to the appropriate platform skill for execution. Log approval.
4. **On Edit** — re-open the content/action for modification, then re-present the card.
5. **On Reject** — discard the action. Log rejection with reason if provided.
6. **Timeout policy** — if no response after 24 hours (or a shorter operator-configured window), mark as `EXPIRED` and do not execute. Notify the operator.

## Partial Approval (batch actions)

When a scheduler proposes multiple actions at once:
- Show a summary list with per-item approve/reject toggles.
- Execute only the approved subset.
- Rejected items move to `DRAFT` status, not deleted.

## Audit trail

After every approval decision, write:
```json
{
  "event": "approval_decision",
  "action_id": "<uuid>",
  "decision": "approved | rejected | edited | expired",
  "operator": "<account>",
  "timestamp": "<ISO 8601>",
  "notes": "<optional>"
}
```
POST to `/api/v1/audit` or log locally with `[EPICGRAM-APPROVAL]` prefix.

## Integration points

- Requires: `epicgram-safe-mode` (must run first)
- Calls: `epicgram-multiposting-scheduler` (on approval of posting actions)
- Called by: `epicgram-script-writer`, `epicgram-caption-hashtags`, `epicgram-n8n-orchestrator`

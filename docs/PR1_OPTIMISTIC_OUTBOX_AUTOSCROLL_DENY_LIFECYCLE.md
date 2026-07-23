# PR 1 — Optimistic Outbox, Chat Autoscroll, Deny Lifecycle

Branch: `feat/pr1-optimistic-outbox-autoscroll-deny-lifecycle`

Tracks:
- #9 Production verification of operator safety guard
- #10 Optimistic outgoing bubble with TDLib deduplication
- #11 Telegram chat autoscroll and detached reader mode
- #12 Deny → CANCELLED lifecycle

## Safety invariants

1. Read-only requests never create executable actions.
2. Prepare-send may create only a pending proposal.
3. Only explicit Allow may reach Telegram send.
4. Deny is terminal and cannot be revived from UI state or localStorage.
5. One Allow produces at most one Telegram message.

## Optimistic outbox contract

```ts
type OptimisticMessageStatus = "sending" | "sent" | "failed";

type OptimisticMessage = {
  id: string;
  clientRequestId: string;
  chatId: string;
  content: string;
  createdAt: string;
  isOutgoing: true;
  status: OptimisticMessageStatus;
  serverMessageId?: string;
};
```

Flow:
1. Generate `clientRequestId = crypto.randomUUID()`.
2. Insert local right-side bubble with `status="sending"`.
3. Call the approved send endpoint.
4. On `sent=true`, mark local bubble `sent` and bind `serverMessageId` when returned.
5. Refresh TDLib messages.
6. Deduplicate in this order: `clientRequestId`, `serverMessageId`, fallback `(chatId, normalized content, timestamp bucket)`.
7. On failure, retain the bubble with `status="failed"` and explicit retry/remove controls.

## Chat autoscroll contract

- First open or chat switch: jump to newest message without animation after DOM render.
- Manual approved send: smooth-scroll to newest bubble.
- Poll/incoming update: smooth-scroll only when distance from bottom is below 120px.
- Detached reader mode: preserve position and increment `newMessagesCount`.
- Show `↓ Новые сообщения` only while detached and new content exists.
- Never call scroll-to-bottom on every render.

Reference calculation:

```ts
const distanceFromBottom =
  element.scrollHeight - element.scrollTop - element.clientHeight;
const isNearBottom = distanceFromBottom < 120;
```

## Operator action lifecycle

```text
idle
→ pending_approval
→ approved
→ executing
→ completed | failed

pending_approval
→ cancelled
```

Rules:
- `cancelled` is terminal.
- Only `pending_approval` may transition to `approved`.
- Deny must not call confirm/send.
- Reload must not revive a cancelled payload.
- UI history may retain a non-executable `Отменено` record.

## Files expected to change

Primary:
- `apps/web/components/EpicGramShell.tsx`
- operator confirm/pending UI route or component used by `OperatorDock`

Potential API correlation support:
- Telegram send route and runtime response typing, only if needed to return `clientRequestId`/`messageId`

## QA gates

### Read-only
- No action card.
- No Allow/Deny.
- No confirm/send request.
- No Telegram mutation.

### Prepare send
- Exact chat and text.
- Pending card only.
- No send before Allow.

### Deny
- Final state `CANCELLED`.
- No mutation.
- Same action cannot be approved later.

### Allow/outbox
- Exactly one send request.
- Bubble appears immediately on the right.
- TDLib refresh does not duplicate it.
- Failure remains visible as `failed`.

### Scrolling
- New chat starts at newest message.
- Manual send scrolls down.
- Reading older messages is not interrupted.
- New-message button returns to bottom and clears its counter.

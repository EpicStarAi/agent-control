# epicgram-multiposting-scheduler

## Description
Manages the queue, scheduling, execution, and retry logic for publishing approved content across multiple platforms. Operates exclusively on operator-approved actions — never initiates publishing autonomously.

## When to use
Load when:
- An operator approves a caption/post and wants it scheduled or sent now.
- A batch of posts needs to be queued across platforms.
- A previously scheduled post failed and needs retry logic.
- The operator asks to see the publishing queue or reschedule items.

## Queue Item Schema

```json
{
  "queue_id": "<uuid>",
  "caption_id": "<from epicgram-caption-hashtags>",
  "brief_id": "<from epicgram-content-brief>",
  "platforms": [
    {
      "platform": "telegram | instagram | tiktok | youtube_shorts | facebook",
      "account_id": "<epicgram account id>",
      "channel_or_handle": "<target>",
      "scheduled_at": "<ISO 8601 or 'now'>",
      "status": "pending | approved | publishing | done | failed | expired",
      "attempts": 0,
      "last_error": null,
      "published_url": null
    }
  ],
  "approved_by": "<operator>",
  "approved_at": "<ISO 8601>",
  "safety_class": "ORANGE | RED"
}
```

## Scheduling Rules

1. **Approval required** — only add items with `status: approved`. Items that haven't passed `epicgram-review-and-approval` must not enter the queue.
2. **Minimum lead time** — for `scheduled_at` in the future, require at least 5 minutes lead time to allow operator to cancel.
3. **Cancellation window** — any scheduled (not `now`) item can be cancelled up to 1 minute before execution.
4. **Platform order** — if the same content goes to multiple platforms simultaneously, publish in this order: Telegram → Instagram → TikTok → YouTube Shorts → Facebook. (Adjust per brief if specified.)
5. **No silent retries** — failed items must surface an error to the operator before retrying. Maximum 3 automatic retries with exponential back-off (1min, 5min, 15min). After 3 failures, mark `failed` and alert.
6. **Idempotency** — if a publish call returns a duplicate error, mark as `done` (don't retry).

## Operator Queue View

```
📅 Publishing Queue
──────────────────────────────────────────
  #1  Telegram @mychannel   → now          [pending]
  #2  Instagram @myhandle   → 14:30 UTC    [approved]
  #3  TikTok @account       → 18:00 UTC    [approved]
  #4  YouTube Shorts        → 20:00 UTC    [approved]
──────────────────────────────────────────
[ ▶ Run now ]  [ ✏️ Edit schedule ]  [ ❌ Cancel all ]
```

## API Calls

- Enqueue: `POST /api/v1/scheduler/queue` — body: queue item schema
- List queue: `GET /api/v1/scheduler/queue?status=pending|approved`
- Cancel: `DELETE /api/v1/scheduler/queue/:queue_id`
- Status update: `PATCH /api/v1/scheduler/queue/:queue_id`
- Publish result stored in: `queue_item.platforms[n].published_url`

If these endpoints are unavailable, queue items in the operator's chat session as cards and execute them manually in sequence.

## Integration points

- Requires: `epicgram-safe-mode` (run before each platform publish call)
- Requires: `epicgram-review-and-approval` (all items must be pre-approved)
- Delegates to: `epicgram-telegram-client-ops`, `epicgram-instagram-graph`, `epicgram-tiktok-publisher`, etc.
- Consumes: `epicgram-caption-hashtags` output

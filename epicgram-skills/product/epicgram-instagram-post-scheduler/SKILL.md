---
name: epicgram-instagram-post-scheduler
description: Build an Instagram scheduling plan for Reels, Feed, Carousel, or Stories based on audience timing and content priority.
---

# epicgram-instagram-post-scheduler

## Summary
Plan when and in what sequence Instagram content should be published. Outputs a schedule plan with recommended slots and conflict detection. Execution is delegated to `epicgram-instagram-graph` after approval.

## When to use
- When the operator has approved content and needs to decide when to publish.
- When planning a content calendar for a campaign window.
- When multiple pieces of content need to be ordered by priority and timing.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `content_items` | array of `{ brief_id, format, caption_id, media_url }` | ✓ |
| `time_preferences` | `{ timezone, preferred_hours: [] }` | – |
| `campaign_window` | `{ start_date, end_date }` | – |

## Outputs
```json
{
  "schedule_plan": [
    {
      "item_id": "string",
      "format": "reel | feed_post | carousel | story_sequence",
      "recommended_slot": "ISO 8601",
      "priority": "high | medium | low",
      "status": "scheduled | pending_approval | conflict"
    }
  ],
  "recommended_slots": [],
  "priority_order": [],
  "conflicts": [
    {
      "item_id": "string",
      "reason": "string"
    }
  ]
}
```

## Scheduling rules
- Minimum gap between posts: 4 hours (configurable per account).
- Reels get priority slots (optimal: Tue–Thu, 11am–1pm or 7–9pm local time).
- Stories can stack on same-day as feed posts without conflict.
- Carousels: never schedule within 24h of another carousel.
- No scheduling without an `approval_token` from `epicgram-review-and-approval`.

## API
```
POST /api/skills/instagram/schedule
```

## Safety
- Scheduling only — no side effects, no publish calls.
- Must defer final execution to `epicgram-instagram-graph`.
- All scheduled items must have passed `epicgram-instagram-safe-mode` first.

## Integration points
- Requires: `epicgram-review-and-approval` (approval before slot assignment)
- Feeds into: `epicgram-instagram-graph` (executes scheduled items)
- Called by: `epicgram-multiposting-scheduler` (cross-platform coordinator)

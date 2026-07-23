---
name: epicgram-instagram-brief
description: Turn a raw idea or campaign goal into an Instagram-specific brief for Reels, Feed, Stories, or Carousel content.
---

# epicgram-instagram-brief

## Summary
Create a structured Instagram content brief from raw operator input, Telegram context, or campaign goals.

## When to use
- When the operator sends a raw idea for Instagram content.
- When a campaign needs Instagram-specific adaptation by format.
- When downstream Reels, caption, or carousel skills need a normalized input.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `project_id` | string | ✓ |
| `idea_text` | string | ✓ |
| `target_format` | enum: `reel \| feed_post \| carousel \| story_sequence` | ✓ |
| `campaign_goal` | string | – |
| `target_audience` | string | – |
| `tone` | string | – |
| `visual_direction` | string | – |

## Outputs
```json
{
  "brief_title": "string",
  "format": "reel | feed_post | carousel | story_sequence",
  "content_angle": "string",
  "visual_style": "string",
  "hook_direction": "string",
  "cta": "string",
  "audience_profile": "string",
  "constraints": [],
  "risk_flags": []
}
```

## Clarification protocol
If `target_format` is not specified, ask once. If `idea_text` is under 10 words, ask for the core message before proceeding. Never block on optional fields.

## API
```
POST /api/skills/instagram/brief
GET  /api/accounts/:account_id/identity
```

## Safety
- Must not publish content.
- Pass any `risk_flags` entries to `epicgram-instagram-safe-mode` before downstream skills proceed.

## Integration points
- Called by: operator or `epicgram-core-routing`
- Feeds into: `epicgram-instagram-reels-script`, `epicgram-instagram-feed-caption`, `epicgram-instagram-carousel-designer`, `epicgram-instagram-stories-flow`
- May pull account defaults from: `epicgram-account-identity` (Wave 2)

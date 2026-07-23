---
name: epicgram-instagram-stories-flow
description: Build a multi-story sequence with polls, stickers, prompts, and CTA flow for Instagram Stories.
---

# epicgram-instagram-stories-flow

## Summary
Design a story sequence that warms the audience, drives interaction, and leads to a target action. Each story slide has a clear role in the funnel.

## When to use
- After `epicgram-instagram-brief` with `format: story_sequence`.
- When promoting a product launch, event, or Reel through Stories.
- When building an engagement sequence (polls → results → CTA).

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object | ✓ |
| `account_identity` | object | ✓ |
| `story_count` | integer | – (default: 5, max: 10) |
| `objective` | enum: `awareness \| engagement \| conversion \| retention` | – |

## Outputs
```json
{
  "story_sequence": [
    {
      "story": 1,
      "role": "OPENER | CONTEXT | INTERACTION | BRIDGE | CTA",
      "visual_guidance": "string",
      "text_overlay": "string",
      "interaction_element": {
        "type": "poll | question | slider | quiz | link_sticker | none",
        "prompt": "string",
        "options": []
      },
      "duration_sec": 15
    }
  ],
  "cta_path": [
    {
      "story": 0,
      "action": "swipe_up | link_sticker | DM | profile_visit | highlight_add"
    }
  ]
}
```

## Story flow rules
| Story | Role | Element |
|---|---|---|
| 1 | OPENER | Bold visual or question — no text-heavy slides |
| 2 | CONTEXT | 1–2 sentence setup |
| 3 | INTERACTION | Poll, quiz, or question sticker |
| 4 | BRIDGE | Results tease or transition |
| 5 | CTA | Link sticker, DM, or swipe-up |

- Max 7 words per text overlay.
- Every sequence must have exactly one CTA story — no more.

## API
```
POST /api/skills/instagram/stories
```

## Safety
- Must not auto-send or publish stories.
- Flag manipulative or coercive interaction prompts (false urgency, misleading polls).

## Integration points
- Requires: `epicgram-instagram-brief`
- Feeds into: `epicgram-instagram-post-scheduler`
- Pass through: `epicgram-review-and-approval` before publishing

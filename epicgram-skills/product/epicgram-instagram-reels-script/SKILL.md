---
name: epicgram-instagram-reels-script
description: Generate a Reels-first short video script with hook, scenes, overlay text, transitions, and CTA.
---

# epicgram-instagram-reels-script

## Summary
Write a Reels-native script optimized for short attention, visual rhythm, and strong CTA. Output is scene-by-scene with voiceover and on-screen text blocks.

## When to use
- After `epicgram-instagram-brief` has produced an approved brief with `format: reel`.
- When the operator asks to create or rewrite a Reels script.
- When A/B variant scripts are needed for testing.

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object (from epicgram-instagram-brief) | ✓ |
| `account_identity` | object | ✓ |
| `variant_count` | integer | – (default: 1) |
| `max_duration_sec` | integer | – (default: 60) |
| `style_constraints` | array | – |

## Outputs
```json
{
  "script_variants": [
    {
      "variant_id": "string",
      "total_duration_sec": 60,
      "scene_list": [
        {
          "scene": 1,
          "label": "HOOK",
          "duration_sec": 5,
          "visual_direction": "string",
          "voiceover": "string",
          "overlay_text": "string"
        }
      ],
      "cta_options": [],
      "hook_score": 0.0
    }
  ]
}
```

## Scene structure (≤60s Reels)
| Scene | Label | Duration |
|---|---|---|
| 1 | HOOK — pattern interrupt, bold claim, or question | 3–5s |
| 2 | PROBLEM or TENSION | 8–12s |
| 3 | INSIGHT or SOLUTION | 15–25s |
| 4 | PROOF or EXAMPLE | 10–15s |
| 5 | CTA | 3–5s |

Hook must appear in first 3 seconds. Write it last, move it first.

## API
```
POST /api/skills/instagram/reels-script
GET  /api/accounts/:account_id/identity
```

## Safety
- Must flag harmful, illegal, or manipulative content and attach to `risk_flags`.
- Must not directly trigger publishing or pass to graph skill without review.

## Integration points
- Requires: `epicgram-instagram-brief` (approved brief)
- Feeds into: `epicgram-instagram-feed-caption`, `epicgram-instagram-post-scheduler`
- Pass output through: `epicgram-review-and-approval` before any publish action

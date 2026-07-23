---
name: epicgram-youtube-shorts-script
description: Generate a YouTube Shorts script with hook, punchline, overlay text, and CTA optimized for the Shorts feed.
---

# epicgram-youtube-shorts-script

## Summary
Write a Shorts-native script for YouTube's vertical feed. YouTube Shorts differ from TikTok in one important way: subscribers matter more, so CTAs should lean toward subscribe/watch-next rather than shares.

## When to use
- After `epicgram-youtube-brief` produces a brief with `format: shorts`.
- When repurposing a TikTok script for YouTube Shorts (requires hook re-optimization).
- When A/B variant scripts are needed.

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object (from `epicgram-youtube-brief`) | ✓ |
| `account_identity` | object | ✓ |
| `variant_count` | integer | – (default: 1) |
| `max_duration_sec` | integer | – (default: 60) |

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
          "duration_sec": 3,
          "visual_direction": "string",
          "voiceover": "string",
          "overlay_text": "string"
        }
      ],
      "cta_options": [],
      "voiceover_text": "string",
      "hook_score": 0.0
    }
  ],
  "overlay_texts": []
}
```

## Scene structure (≤60s Shorts)
| Scene | Label | Duration |
|---|---|---|
| 1 | HOOK | 2–3s — bold claim or question. No intro, no logo. |
| 2 | CONTEXT | 5–10s — setup the viewer needs |
| 3 | VALUE | 20–30s — the actual content |
| 4 | PAYOFF | 5–10s — resolution or punchline |
| 5 | CTA | 3–5s — "subscribe", "watch [video title]", or reply |

YouTube Shorts CTA note: "subscribe" CTAs outperform "share" on Shorts because the algorithm rewards subscriber conversion.

## API
```
POST /api/skills/youtube/shorts-script
```

## Safety
- Flag harmful or manipulative content — attach to `risk_flags`.
- Never directly trigger publishing.

## Integration points
- Requires: `epicgram-youtube-brief`
- Feeds into: `epicgram-youtube-title-optimizer`, `epicgram-youtube-thumbnail-concepts`, `epicgram-youtube-shorts-publisher`
- Pass through: `epicgram-review-and-approval` before any publish action

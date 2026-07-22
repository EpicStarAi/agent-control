---
name: epicgram-tiktok-script-writer
description: Generate a TikTok script with scene timing, hooks, transitions, overlays, and CTA from a TikTok brief.
---

# epicgram-tiktok-script-writer

## Summary
Write a TikTok-native script with tight scene pacing, hook-first structure, and high-retention flow. Outputs scene list, overlay texts, and voiceover — ready for `epicgram-tiktok-hook-optimizer` and `epicgram-tiktok-video-assembly`.

## When to use
- After `epicgram-tiktok-brief` produces an approved brief.
- When the operator asks to write or rewrite a TikTok script.
- When multiple variants are needed for testing.

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object (from `epicgram-tiktok-brief`) | ✓ |
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
      "hook_lines": ["string"],
      "scene_list": [
        {
          "scene": 1,
          "label": "HOOK",
          "duration_sec": 3,
          "action": "string",
          "voiceover": "string",
          "overlay_text": "string",
          "transition": "cut | zoom | slide | none"
        }
      ],
      "cta_options": [],
      "voiceover_text": "string"
    }
  ]
}
```

## Scene structure by duration
| Duration | Scenes | Hook window |
|---|---|---|
| 15s | 3 (hook, value, CTA) | 0–2s |
| 30s | 4 (hook, setup, value, CTA) | 0–2s |
| 45s | 5 | 0–3s |
| 60s | 5–6 | 0–3s |

TikTok hook must be in first 2–3 seconds. Write aggressive, pattern-interrupt hooks: bold statement, counterintuitive claim, visual surprise.

## Voiceover rules
- Match `account_identity.tone` exactly.
- Active voice, short sentences (max 12 words per sentence).
- Voiceover and overlay text must NOT repeat identically — they complement.

## API
```
POST /api/skills/tiktok/script
```

## Safety
- Flag harmful or manipulative scripts (false urgency, misleading claims).
- Never auto-approve for publishing — output must go through `epicgram-review-and-approval`.

## Integration points
- Requires: `epicgram-tiktok-brief`
- Feeds into: `epicgram-tiktok-hook-optimizer`, `epicgram-tiktok-caption-hashtags`, `epicgram-tiktok-video-assembly`

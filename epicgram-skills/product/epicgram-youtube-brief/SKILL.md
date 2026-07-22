---
name: epicgram-youtube-brief
description: Turn a raw idea into a YouTube-specific brief, distinguishing between Shorts and long-form video needs.
---

# epicgram-youtube-brief

## Summary
Create a structured YouTube content brief from raw operator input. Outputs differ significantly between `shorts` and `longform` formats — Shorts need hook-first scene pacing, longform needs chapter structure and narrative arc.

## When to use
- When the operator sends a raw idea for YouTube content.
- When repurposing Telegram, TikTok, or Instagram content for YouTube.
- When downstream skills (`epicgram-youtube-shorts-script`, `epicgram-youtube-longform-outline`) need normalized input.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `project_id` | string | ✓ |
| `idea_text` | string | ✓ |
| `target_format` | enum: `shorts \| longform` | ✓ |
| `campaign_goal` | string | – |
| `target_audience` | string | – |
| `tone` | string | – |

## Outputs
```json
{
  "brief_title": "string",
  "format": "shorts | longform",
  "content_angle": "string",
  "hook_direction": "string",
  "cta": "string",
  "audience_profile": "string",
  "seo_angle": "string",
  "constraints": [],
  "risk_flags": []
}
```

## Format guidance
| Format | Key difference from brief |
|---|---|
| `shorts` | Hook in first 2s, no chapter structure needed, CTA = subscribe or watch next |
| `longform` | Needs `seo_angle` (keyword target), chapter structure, end-screen CTA plan |

For `longform`, always ask for `target_keywords` if not provided — YouTube SEO depends on it.

## API
```
POST /api/skills/youtube/brief
GET  /api/accounts/:account_id/identity
```

## Safety
- Must not publish content.
- Pass non-empty `risk_flags` to `epicgram-youtube-safe-mode` before downstream skills proceed.
- Flag any topic touching copyright music, made-for-kids content, or health claims.

## Integration points
- Feeds into: `epicgram-youtube-shorts-script`, `epicgram-youtube-longform-outline`, `epicgram-youtube-title-optimizer`
- May pull account defaults from: `epicgram-account-identity` (Wave 2)

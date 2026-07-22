---
name: epicgram-tiktok-brief
description: Turn a raw Telegram or operator idea into a structured TikTok content brief with hook, format, CTA, tone, duration, and audience.
---

# epicgram-tiktok-brief

## Summary
Create a TikTok-first content brief from raw ideas, notes, messages, or campaign goals. TikTok briefs prioritize hook direction, video format archetype, and duration target — all of which differ from Instagram briefs.

## When to use
- When the operator sends a raw idea for TikTok content.
- When repurposing content from Telegram or another platform for TikTok.
- When downstream `epicgram-tiktok-script-writer` or `epicgram-tiktok-hook-optimizer` needs normalized input.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `project_id` | string | ✓ |
| `idea_text` | string | ✓ |
| `source_context` | string (e.g. "Telegram note", "n8n trigger") | – |
| `campaign_goal` | string | – |
| `target_audience` | string | – |
| `duration_target` | enum: `15s \| 30s \| 45s \| 60s` | – |
| `tone` | string | – |

## Outputs
```json
{
  "brief_title": "string",
  "content_angle": "string",
  "hook_direction": "string",
  "video_format": "talking_head | meme | tutorial | reaction | storytime | duet_like",
  "target_duration": "15s | 30s | 45s | 60s",
  "cta": "string",
  "audience_profile": "string",
  "constraints": [],
  "risk_flags": []
}
```

## Format archetypes
| Format | When to use |
|---|---|
| `talking_head` | Opinion, story, educational — creator on camera |
| `meme` | Trend-riding, humor, cultural commentary |
| `tutorial` | Step-by-step, how-to, product demo |
| `reaction` | Commentary on another video or topic |
| `storytime` | Personal narrative, case study, conflict-resolution arc |
| `duet_like` | Split-screen style or response format |

## API
```
POST /api/skills/tiktok/brief
GET  /api/accounts/:account_id/identity
```

## Safety
- Must not publish or schedule anything.
- Attach risk notes for sensitive topics to `risk_flags` — pass to `epicgram-tiktok-safe-mode` before proceeding.

## Integration points
- Feeds into: `epicgram-tiktok-script-writer`, `epicgram-tiktok-caption-hashtags`
- May pull account defaults from: `epicgram-account-identity` (Wave 2)

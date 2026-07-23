---
name: epicgram-facebook-brief
description: Turn a raw idea or campaign goal into a Facebook-specific brief for posts, links, events, or announcements.
---

# epicgram-facebook-brief

## Summary
Create a structured Facebook content brief from raw operator input. Facebook differs from other platforms: longer text is accepted and often rewarded, link previews are a first-class content format, and community/group dynamics matter alongside Page posts.

## When to use
- When the operator sends a raw idea for Facebook Page or Group content.
- When repurposing content from other platforms for Facebook (requires format adaptation).
- Before any downstream content skill: `epicgram-facebook-post-writer`, `epicgram-facebook-link-optimizer`, `epicgram-facebook-group-broadcaster`.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `project_id` | string | ✓ |
| `idea_text` | string | ✓ |
| `target_format` | enum: `text_post \| link_post \| event \| announcement \| video_post` | ✓ |
| `campaign_goal` | string | – |
| `target_audience` | string | – |
| `tone` | string | – |

## Outputs
```json
{
  "brief_title": "string",
  "format": "text_post | link_post | event | announcement | video_post",
  "content_angle": "string",
  "cta": "string",
  "audience_profile": "string",
  "fb_placement": "page | group | both",
  "optimal_length": "short_280 | medium_500 | long_1500+",
  "constraints": [],
  "risk_flags": []
}
```

## Format guidance
| Format | Key difference |
|---|---|
| `text_post` | Facebook rewards conversational, community-inviting text. End with a question or poll to drive comments. |
| `link_post` | Title and description in the link preview are editable — optimize separately with `epicgram-facebook-link-optimizer`. |
| `event` | Requires start/end datetime, location (optional), description. Events get separate distribution from posts. |
| `announcement` | Pinnable post, typically longer, authoritative tone, no engagement bait. |
| `video_post` | Native video (upload, not YouTube link) gets stronger reach. Need captions — 80% of Facebook video is watched muted. |

## Facebook-specific brief rules
- Facebook text posts with 1–3 paragraphs outperform single-sentence posts on Pages.
- Emoji usage: 1–3 per post max — more reads as spam to the algorithm.
- Never instruct the audience to "like, share, comment" in the same sentence — Facebook's spam filter penalizes "engagement bait".
- Political or divisive content → always set a `risk_flag`, regardless of content angle.

## API
```
POST /api/skills/facebook/brief
GET  /api/accounts/:account_id/identity
```

## Safety
- Must not publish content.
- Pass non-empty `risk_flags` to `epicgram-facebook-safe-mode` before any downstream skill proceeds.
- Flag content involving politics, religion, health claims, or financial advice.

## Integration points
- Feeds into: `epicgram-facebook-post-writer`, `epicgram-facebook-link-optimizer`, `epicgram-facebook-group-broadcaster`
- May pull account defaults from: `epicgram-account-identity`

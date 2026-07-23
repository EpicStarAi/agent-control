---
name: epicgram-facebook-post-writer
description: Generate Facebook post text including news updates, longer-form storytelling, announcements, and polls.
---

# epicgram-facebook-post-writer

## Summary
Write Facebook-native post copy optimized for Page or Group distribution. Facebook is the only major platform where longer, story-driven posts routinely outperform short captions — this skill knows the difference.

## When to use
- After `epicgram-facebook-brief` with `format: text_post | announcement | video_post`.
- When the operator needs post variants for A/B testing.
- When adapting content from other platforms to Facebook's longer-form style.

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object (from `epicgram-facebook-brief`) | ✓ |
| `account_identity` | object | ✓ |
| `post_style` | enum: `short \| storytelling \| news \| poll` | – (default: `short`) |

## Outputs
```json
{
  "post_variants": [
    {
      "variant_id": "string",
      "text": "string",
      "char_count": 0,
      "style": "short | storytelling | news | poll",
      "engagement_hook": "string",
      "cta": "string",
      "emoji_count": 0,
      "engagement_bait_risk": false
    }
  ],
  "cta_options": ["string"],
  "poll_options": [
    { "question": "string", "options": ["string"] }
  ]
}
```

## Post style guide

### `short` (≤280 chars)
Works for: quick reactions, updates, shares with commentary.
Structure: Hook → point → CTA.
CTA examples: "What do you think?", "Tag someone who needs this."

### `storytelling` (500–1500 chars)
Works for: brand stories, behind-the-scenes, personal narratives.
Structure: Open with tension → develop → resolve → invite response.
Facebook's algorithm rewards posts that get long comments, and stories provoke them.

### `news` (200–500 chars)
Works for: announcements, product launches, industry updates.
Structure: Headline → key fact → implication → link.
Keep authoritative tone, avoid exclamation marks.

### `poll`
Works for: community engagement, research, pre-launch interest checks.
- Question must be open (not leading)
- 2–4 options max
- No engagement bait ("Vote if you agree!")

## Engagement bait patterns to avoid
Facebook actively suppresses posts containing:
- "Like if…", "Share if…", "Comment YES if…"
- "Tag 3 friends to win"
- "Like this post to see the answer"
- Excessive use of "!!!" or "????"

## API
```
POST /api/skills/facebook/post-writer
```

## Safety
- Flag misleading claims or sensitive topics — attach to `risk_flags`.
- Never directly trigger publishing.
- `engagement_bait_risk: true` → must block before passing to `epicgram-facebook-page-publisher`.

## Integration points
- Requires: `epicgram-facebook-brief`
- Feeds into: `epicgram-facebook-safe-mode`, `epicgram-review-and-approval`, `epicgram-facebook-page-publisher`

---
name: epicgram-instagram-feed-caption
description: Generate Instagram feed captions with storytelling structure, CTA, emoji usage, and hashtag packs.
---

# epicgram-instagram-feed-caption

## Summary
Produce feed captions tailored to brand tone, audience, and post objective. Handles short hooks, storytelling, educational, and promo styles per brief.

## When to use
- After `epicgram-instagram-brief` produces a brief with `format: feed_post`.
- When a Reel or Carousel needs accompanying copy.
- When the operator requests caption variants for A/B testing.

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object | ✓ |
| `account_identity` | object | ✓ |
| `caption_style` | enum: `short \| storytelling \| educational \| promo` | – |
| `crosspromo_targets` | array of platform handles | – |

## Outputs
```json
{
  "caption_variants": [
    {
      "variant_id": "string",
      "hook_line": "string",
      "body": "string",
      "cta": "string",
      "total_chars": 0,
      "emoji_count": 0
    }
  ],
  "hashtag_sets": [
    {
      "set_id": "string",
      "tags": [],
      "tier": "niche | mid | broad",
      "count": 0
    }
  ],
  "cta_options": [],
  "crosspromo_snippets": []
}
```

## Caption specs
- **First 125 chars**: visible before "more" — lead with hook, not brand name.
- **Total length**: up to 2200 chars.
- **Hashtags**: 5–15, placed after a blank-line separator. Mix niche + mid-tier.
- **Emoji**: 3–5, placed naturally — not at line starts.
- **CTA**: one specific action (save, comment X, DM for Y) — never "follow for more".

## API
```
POST /api/skills/instagram/feed-caption
```

## Safety
- Must avoid spammy hashtag stuffing (no 30-tag dumps).
- Flag risky claims, regulated topics (finance, health, legal), or sensitive language.

## Integration points
- Requires: `epicgram-instagram-brief`
- Optional input: `epicgram-instagram-reels-script` (for Reels captions)
- Feeds into: `epicgram-instagram-post-scheduler`, `epicgram-instagram-graph`
- Pass through: `epicgram-review-and-approval` before publishing

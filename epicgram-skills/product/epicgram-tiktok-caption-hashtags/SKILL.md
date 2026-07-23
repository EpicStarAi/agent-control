---
name: epicgram-tiktok-caption-hashtags
description: Generate TikTok captions, hashtag packs, and cross-promo snippets from a TikTok script or brief.
---

# epicgram-tiktok-caption-hashtags

## Summary
Produce TikTok-optimized captions with first-100-char hooks, curated hashtag sets, comment-hook suggestions, and cross-platform promo snippets.

## When to use
- After `epicgram-tiktok-script-writer` (or `epicgram-tiktok-hook-optimizer`) produces an approved script.
- When the operator needs caption variants for the same video.
- When cross-promoting a TikTok to Instagram or Telegram.

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object | ✓ |
| `script_variant` | object | ✓ |
| `account_identity` | object | ✓ |
| `crosspromo_targets` | array: `["instagram", "telegram"]` | – |

## Outputs
```json
{
  "caption_variants": [
    {
      "variant_id": "string",
      "hook_100": "string",
      "full_caption": "string",
      "char_count": 0
    }
  ],
  "hashtag_sets": [
    {
      "set_id": "string",
      "tags": [],
      "strategy": "niche-first | trend-first | balanced",
      "count": 0
    }
  ],
  "comment_hook_suggestions": [
    "string"
  ],
  "crosspromo_snippets": {
    "instagram": "string",
    "telegram": "string"
  }
}
```

## TikTok caption specs
- **First 100 chars**: shown in feed without "more" — put the hook or key phrase here.
- **Total length**: max 2200 chars.
- **Hashtags**: 3–6 in the caption body (not below a separator — TikTok shows them inline).
- **Hashtag mix**: 1 trending (#fyp or niche trending), 2–3 mid-tier (100K–5M), 1–2 niche (< 100K).
- **Comment hook**: a question or prompt in the first comment to drive comment volume (TikTok algorithm signal).
- **No external URLs** in caption (TikTok doesn't allow clickable links except in bio/link-in-bio).

## API
```
POST /api/skills/tiktok/caption
```

## Safety
- Must avoid spammy hashtag stuffing (no #fyp #foryou #foryoupage all together — pick one).
- Flag risky claims, regulated topics, or manipulative caption styles.

## Integration points
- Requires: `epicgram-tiktok-brief`, `epicgram-tiktok-script-writer`
- Feeds into: `epicgram-tiktok-publisher`
- Cross-promo snippets feed into: `epicgram-caption-hashtags` (for cross-platform adaptation)

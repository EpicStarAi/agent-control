---
name: epicgram-youtube-title-optimizer
description: Generate and score YouTube titles for CTR based on keywords, emotion triggers, and length constraints.
---

# epicgram-youtube-title-optimizer

## Summary
Produce ranked YouTube title variants scored for expected CTR, keyword coverage, and emotional pull. YouTube titles are the primary SEO surface and the first thing a viewer reads — getting this right is as important as the hook.

## When to use
- After `epicgram-youtube-shorts-script` or `epicgram-youtube-longform-outline` is approved.
- When the operator asks to improve an existing title.
- When A/B testing title variants for an uploaded video.

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object | ✓ |
| `script_or_outline` | object | ✓ |
| `target_keywords` | array of strings | – |

## Outputs
```json
{
  "title_variants": [
    {
      "variant_id": "string",
      "title": "string",
      "char_count": 0,
      "ctr_score": 0.0,
      "emotional_hook": "curiosity | urgency | social_proof | benefit | fear_of_missing_out | none",
      "keyword_hit": ["string"]
    }
  ],
  "ctr_score_estimates": [],
  "keyword_coverage": [
    { "keyword": "string", "covered_in": ["variant_id"] }
  ],
  "recommended_title": "string"
}
```

## Title writing rules
- **Length**: 50–70 characters (shows fully in most surfaces). Hard max: 100 chars.
- **Keywords**: primary keyword in first 3 words when possible.
- **Emotion**: every title needs one of — curiosity gap, specific number, strong benefit, or social proof.
- **No ALL CAPS words** — looks spammy, reduces CTR.
- **Forbidden patterns**: "You Won't Believe…", "This Changed Everything", vague superlatives.
- **Shorts titles**: shorter is better (40–60 chars), because Shorts surface truncates more aggressively.

## CTR scoring heuristics (0.0–1.0)
| Factor | Weight |
|---|---|
| Primary keyword in first 5 words | 20% |
| Specific number or data point included | 20% |
| Clear emotional trigger | 25% |
| Under 70 chars | 15% |
| No policy-flagged patterns | 20% |

## API
```
POST /api/skills/youtube/title-optimize
```

## Safety
- Must avoid clickbait titles that misrepresent the video content — YouTube penalizes high impression / low watch-time ratios caused by misleading titles.
- Flag titles containing unverifiable claims ("guaranteed", "100%", "scientifically proven").

## Integration points
- Requires: `epicgram-youtube-brief`, `epicgram-youtube-shorts-script` or `epicgram-youtube-longform-outline`
- Feeds into: `epicgram-youtube-thumbnail-concepts`, `epicgram-youtube-shorts-publisher`, `epicgram-youtube-video-publisher`

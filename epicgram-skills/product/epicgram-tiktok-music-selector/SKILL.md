---
name: epicgram-tiktok-music-selector
description: Select TikTok-compatible music direction or track candidates based on mood, trend, region, and content type.
---

# epicgram-tiktok-music-selector

## Summary
Recommend music direction or specific TikTok-licensed track candidates for a video, accounting for regional licensing, content mood, and trend alignment. Does not stream or download tracks — outputs guidance and candidates for the editor.

## When to use
- After `epicgram-tiktok-script-writer` produces a script with a defined `mood`.
- When building the `epicgram-tiktok-video-assembly` render plan (music field required).
- When the operator asks "what music should we use for this video".

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object | ✓ |
| `region` | string (ISO country code, e.g. "US", "RU", "DE") | – |
| `mood` | enum: `energetic \| calm \| funny \| inspiring \| tense \| nostalgic` | – |
| `content_type` | enum: `tutorial \| storytime \| meme \| talking_head \| b_roll` | – |

## Outputs
```json
{
  "music_candidates": [
    {
      "track_name": "string",
      "artist": "string",
      "mood": "string",
      "trend_score": 0.0,
      "license_status": "tiktok_commercial | tiktok_original | use_original_audio | avoid",
      "use_case": "string"
    }
  ],
  "selection_reasoning": [
    "string"
  ],
  "region_restrictions": [
    {
      "region": "string",
      "restriction": "string"
    }
  ],
  "fallback_music_direction": "string"
}
```

## Licensing rules
| License type | Usage |
|---|---|
| `tiktok_commercial` | Safe for brand/business accounts |
| `tiktok_original` | Creator accounts only — NOT for commercial use |
| `use_original_audio` | Record your own or use royalty-free source |
| `avoid` | Track flagged for disputes or regional blocks |

**Never recommend `tiktok_original` tracks for business/brand accounts** — they will be muted on publish.

## Trend guidance
- Trending tracks boost FYP reach but decay fast (2–3 week shelf life).
- Evergreen royalty-free tracks: slower discovery, longer longevity.
- If `trend_score` > 0.8 and track is < 2 weeks old → recommend for hook-aligned formats.

## API
```
POST /api/skills/tiktok/music
```

## Safety
- Must not select disallowed or unlicensed music sources.
- Must not recommend tracks that are flagged for copyright disputes in the target region.
- `avoid` status tracks: include in output with a clear warning, never as primary recommendation.

## Integration points
- Requires: `epicgram-tiktok-brief`
- Feeds into: `epicgram-tiktok-video-assembly`

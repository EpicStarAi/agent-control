---
name: epicgram-youtube-longform-outline
description: Build a chaptered outline for a long-form YouTube video, including narrative arc, timestamps, and key talking points.
---

# epicgram-youtube-longform-outline

## Summary
Produce a chapter-by-chapter outline for a long-form YouTube video with a clear narrative arc, timestamp plan, and talking-point depth per section. Designed so a creator can read this outline and record without additional scripting.

## When to use
- After `epicgram-youtube-brief` with `format: longform`.
- When planning a video essay, tutorial, case study, or vlog-style video.
- When a full script isn't needed but structure is (outline → record → edit).

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object | ✓ |
| `account_identity` | object | ✓ |
| `target_length_min` | integer | – (default: 10) |

## Outputs
```json
{
  "chapter_list": [
    {
      "chapter": 1,
      "title": "string",
      "timestamp": "00:00",
      "duration_min": 2,
      "role": "HOOK | INTRO | BODY | TRANSITION | CLIMAX | CTA | OUTRO",
      "talking_points": ["string"],
      "b_roll_suggestions": ["string"]
    }
  ],
  "narrative_arc": "problem_solution | hero_journey | listicle | debate | tutorial | case_study",
  "timestamp_plan": [
    { "chapter": 1, "timestamp": "00:00", "label": "string" }
  ],
  "key_talking_points": ["string"],
  "end_screen_plan": {
    "video_suggestion": "string",
    "subscribe_prompt": "string",
    "duration_sec": 20
  }
}
```

## Chapter structure rules
| Role | Guidance |
|---|---|
| HOOK | First 30s. Must give viewers a reason to stay. No cold opens. |
| INTRO | 1–2 min max. Preview what they'll learn, not what the video is about. |
| BODY | Main content in logical steps or arguments. 3–7 chapters. |
| TRANSITION | 1–2 sentences bridging sections. Keeps watch time up. |
| CLIMAX | The most valuable insight or payoff. Place at 75% mark. |
| CTA | Like / subscribe / comment ask. Place before OUTRO. |
| OUTRO | End screen + channel teaser. Max 20s. |

- YouTube's algorithm rewards watch time at 30%, 50%, and 100% marks. Place value peaks there.
- `talking_points` per chapter: 3–5 bullets, specific enough to speak to without further prep.

## API
```
POST /api/skills/youtube/longform-outline
```

## Safety
- Planning only — no publishing side effects.
- Flag chapters touching health, finance, or legal claims for `epicgram-youtube-safe-mode` review.

## Integration points
- Requires: `epicgram-youtube-brief` (`format: longform`)
- Feeds into: `epicgram-youtube-title-optimizer`, `epicgram-youtube-thumbnail-concepts`, `epicgram-youtube-video-publisher`

---
name: epicgram-instagram-carousel-designer
description: Plan an Instagram carousel structure with slide-by-slide narrative, copy blocks, and visual cues.
---

# epicgram-instagram-carousel-designer

## Summary
Create a slide sequence for Instagram carousels with narrative progression and per-slide messaging. Output is a structured slide plan ready for design and publishing.

## When to use
- After `epicgram-instagram-brief` produces a brief with `format: carousel`.
- When the operator wants a multi-slide educational or listicle post.
- When repurposing long-form content into a swipeable carousel.

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object | ✓ |
| `account_identity` | object | ✓ |
| `slide_count` | integer | – (default: 7, max: 10) |
| `objective` | string | – |

## Outputs
```json
{
  "carousel_outline": [
    {
      "slide": 1,
      "role": "COVER | BODY | TRANSITION | CTA",
      "headline": "string",
      "body_copy": "string",
      "visual_cue": "string",
      "swipe_prompt": "string"
    }
  ],
  "ending_cta": "string",
  "cover_hook": "string",
  "save_prompt": "string"
}
```

## Slide structure rules
| Slide | Role | Purpose |
|---|---|---|
| 1 | COVER | Hook — bold promise or question. Must compel swipe. |
| 2–N-1 | BODY | One idea per slide. Use contrast, lists, or steps. |
| N-1 | TRANSITION | Tease the final slide. "And the most important thing is…" |
| N | CTA | Save, share, DM, or comment. Never multiple CTAs on one slide. |

- Max 30 words per slide body.
- Visual cue must be specific: not "nice background" but "dark background, white bold text, no stock photos".

## API
```
POST /api/skills/instagram/carousel
```

## Safety
- Advisory and planning only — does not produce image files.
- Flag policy-risk slides (misleading health/finance claims, comparison attacks).

## Integration points
- Requires: `epicgram-instagram-brief`
- Feeds into: `epicgram-instagram-feed-caption` (for cover caption), `epicgram-instagram-graph` (carousel publish)
- Pass through: `epicgram-review-and-approval` before passing to graph skill

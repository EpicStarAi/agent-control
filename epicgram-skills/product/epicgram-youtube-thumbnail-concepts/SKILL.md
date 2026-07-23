---
name: epicgram-youtube-thumbnail-concepts
description: Generate thumbnail concept descriptions including composition, text overlay, color, and emotion cues.
---

# epicgram-youtube-thumbnail-concepts

## Summary
Produce detailed thumbnail concepts — composition notes, overlay text options, facial expression direction, background treatment, and color guidance — ready for a designer or AI image tool. Does not generate image files.

## When to use
- After `epicgram-youtube-title-optimizer` produces a `recommended_title`.
- When the operator needs to brief a designer on thumbnail direction.
- When A/B testing thumbnail concepts for an uploaded video.

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object | ✓ |
| `recommended_title` | string (from `epicgram-youtube-title-optimizer`) | ✓ |
| `brand_style` | `{ primary_color, secondary_color, font_style, logo_usage }` | – |

## Outputs
```json
{
  "thumbnail_concepts": [
    {
      "concept_id": "string",
      "composition": "string",
      "foreground_element": "string",
      "background_treatment": "string",
      "facial_expression": "surprise | curiosity | authority | excitement | none",
      "contrast_strategy": "string",
      "emotion_cue": "string"
    }
  ],
  "overlay_text_options": [
    {
      "text": "string",
      "placement": "top_left | top_right | bottom | center | none",
      "style": "bold_knockout | outline | gradient | minimal"
    }
  ],
  "composition_notes": ["string"],
  "color_direction": "string"
}
```

## Thumbnail rules (YouTube best practices)
- **Rule of thirds**: main subject on a third line, not centered.
- **Text max**: 3–4 words. Text should complement the title, not repeat it.
- **Faces work**: human faces with strong expressions increase CTR 20–40% on average.
- **Contrast**: thumbnail must be readable at 168×94px (mobile grid) and 480×270px (desktop).
- **Brand consistency**: if `brand_style` is provided, primary color must appear in every concept.
- **No misleading imagery**: thumbnail must represent what actually happens in the video.
- **Shorts**: vertical crop (9:16) — design for center 4:3 crop to work in both Shorts and suggested feeds.

## Text overlay constraints
- Max 25 characters for overlay text (or it becomes unreadable at small sizes).
- Must not duplicate the title exactly — create a complementary phrase.
- High-contrast knockout preferred: white text on dark, or dark text on light-colored background element.

## API
```
POST /api/skills/youtube/thumbnail-concepts
```

## Safety
- Concept generation only — no image publishing.
- Flag misleading, shocking, or sexually suggestive imagery directions.
- Must not suggest thumbnails that misrepresent the video content (YouTube Community Guidelines §misleading metadata).

## Integration points
- Requires: `epicgram-youtube-brief`, `epicgram-youtube-title-optimizer`
- Feeds into: `epicgram-youtube-shorts-publisher`, `epicgram-youtube-video-publisher` (thumbnail_url field)

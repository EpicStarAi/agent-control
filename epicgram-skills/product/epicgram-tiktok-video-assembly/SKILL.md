---
name: epicgram-tiktok-video-assembly
description: Build a render plan for TikTok videos including scenes, overlays, timing, subtitles, effects, and audio cues.
---

# epicgram-tiktok-video-assembly

## Summary
Produce a complete render plan for a TikTok video — a structured document that an editor (human or automated video pipeline) can execute to produce the final video file. Does not render video directly.

## When to use
- After `epicgram-tiktok-script-writer` and `epicgram-tiktok-hook-optimizer` have produced an approved script.
- After `epicgram-tiktok-music-selector` has produced music candidates.
- When preparing assets for upload through `epicgram-tiktok-publisher`.

## Inputs
| Field | Type | Required |
|---|---|---|
| `script_variant` | object | ✓ |
| `overlay_texts` | array (from script writer) | ✓ |
| `voiceover_text` | string | ✓ |
| `music_candidate` | object (from `epicgram-tiktok-music-selector`) | ✓ |
| `media_assets` | array of `{ asset_id, type, url }` | – |

## Outputs
```json
{
  "render_plan": {
    "total_duration_sec": 60,
    "aspect_ratio": "9:16",
    "resolution": "1080x1920",
    "fps": 30
  },
  "timeline_blocks": [
    {
      "block_id": "string",
      "start_sec": 0,
      "end_sec": 3,
      "layer": "video | overlay | audio | subtitle",
      "content": "string",
      "effect": "zoom_in | fade | cut | slide | none",
      "opacity": 1.0
    }
  ],
  "subtitle_plan": [
    {
      "start_sec": 0,
      "end_sec": 2,
      "text": "string",
      "style": "bold_center | caption_bottom | none"
    }
  ],
  "effects_plan": [
    {
      "effect_name": "string",
      "start_sec": 0,
      "duration_sec": 2,
      "intensity": "low | medium | high"
    }
  ],
  "asset_requirements": [
    {
      "asset_type": "b_roll | talking_head | product_shot | graphic",
      "duration_sec": 0,
      "description": "string",
      "status": "provided | required"
    }
  ]
}
```

## Render rules
- Aspect ratio: always 9:16 (1080×1920).
- Subtitles: required for all voiceover segments — TikTok auto-captions are inaccurate; always provide a subtitle plan.
- Hook overlay: must appear within first 2 seconds, full-frame, high contrast.
- Music: fade in at 0.5s, fade out at last 1.5s.
- Effects: max 1 transition effect per scene cut — no effect stacking.

## API
```
POST /api/skills/tiktok/video-assembly
POST /api/media/render-plan
```

## Safety
- Must not trigger live publication.
- Asset URLs must be verified accessible before including in render plan.
- Flag any `asset_requirements` with `status: required` as a blocker — cannot publish without them.

## Integration points
- Requires: `epicgram-tiktok-script-writer`, `epicgram-tiktok-hook-optimizer`, `epicgram-tiktok-music-selector`
- Feeds into: `epicgram-tiktok-publisher` (after operator approves render plan)
- Pass through: `epicgram-review-and-approval` before handing to publisher

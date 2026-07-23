# epicgram-script-writer

## Description
Converts a structured content brief into a full scene-by-scene script with hook, scenes, voiceover blocks, on-screen text cues, and a CTA. Output is directly usable by `epicgram-video-assembly` and `epicgram-caption-hashtags`.

## When to use
Load after `epicgram-content-brief` has produced an approved brief and the format is one of:
`short_video`, `long_video`, `youtube_shorts`, `reels`, `tiktok`

For `text_post`, `carousel`, or `static_image` — use `epicgram-caption-hashtags` directly instead.

## Script Output Format

```json
{
  "script_id": "<uuid>",
  "brief_id": "<from content-brief>",
  "platform": "telegram | instagram | tiktok | youtube_shorts",
  "total_duration_seconds": 60,
  "scenes": [
    {
      "scene": 1,
      "label": "HOOK",
      "duration_seconds": 5,
      "visual_direction": "<what the camera/screen shows>",
      "voiceover": "<exact spoken words>",
      "on_screen_text": "<text overlay if any>",
      "notes": "<direction for editor>"
    }
  ],
  "cta": {
    "type": "subscribe | link | reply | share | poll",
    "text": "<exact CTA wording>",
    "placement": "end_card | lower_third | verbal_only"
  }
}
```

## Scene Structure by Format

### Short video / TikTok / Reels (≤60s)
| Scene | Label | Duration |
|---|---|---|
| 1 | HOOK — pattern interrupt | 3–5s |
| 2 | PROBLEM or TENSION | 8–12s |
| 3 | INSIGHT or SOLUTION | 15–25s |
| 4 | PROOF or EXAMPLE | 10–15s |
| 5 | CTA | 3–5s |

### YouTube Shorts (≤60s)
Same as above. Hook must be a direct question or bold claim in first 2s.

### Telegram channel video (any length)
No rigid structure — write as a narrative. Keep hook in first 5s. End with reply/share CTA.

## Writing Rules

1. **Hook first** — the first 3 seconds determine retention. Write it last, then move it first.
2. **Voiceover vs. on-screen** — voiceover carries the message; on-screen text reinforces key words only.
3. **No jargon** — unless the brief specifies a technical audience.
4. **Active voice** — always.
5. **CTA specificity** — "follow for more" is weak. Prefer "comment your biggest X below".
6. **Tone match** — inherit tone from the brief. Do not override.
7. **Never fabricate statistics** — if the brief doesn't include a data point, leave it out or ask.

## Operator Preview

After generating, present the script as a readable outline (not raw JSON):

```
🎬 Script — <topic> (<total_duration_seconds>s)
─────────────────────────────────────────────
[HOOK 0:00–0:05]
  Visual: <direction>
  VO:     "<spoken text>"

[PROBLEM 0:05–0:17]
  ...

[CTA 0:55–1:00]
  "<CTA text>"
─────────────────────────────────────────────
[ ✅ Approve & continue ]  [ ✏️ Edit scenes ]  [ 🔄 Regenerate ]
```

Pass to `epicgram-review-and-approval` before storing or using downstream.

## Integration points

- Requires: `epicgram-content-brief` (approved brief as input)
- Feeds into: `epicgram-caption-hashtags`, `epicgram-video-assembly`
- Safety: pass any controversial content through `epicgram-safe-mode` GREEN check

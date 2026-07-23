# epicgram-caption-hashtags

## Description
Generates platform-adapted captions, hashtag sets, and cross-promo blocks from an approved brief or script. Each platform gets its own variant — character limits, tone, hashtag strategy, and CTA style differ per platform.

## When to use
Load when:
- An approved brief or script is ready and needs written copy for posting.
- The operator asks for a caption, post text, or description.
- A platform skill (`epicgram-instagram-graph`, `epicgram-telegram-client-ops`, etc.) requires text before publishing.

## Per-Platform Specifications

### Telegram (channel post)
- **Length**: 200–1000 chars (no hard limit, but keep scannable)
- **Formatting**: Markdown supported — `**bold**`, `_italic_`, `[links](url)`
- **Hashtags**: 3–8, placed at end
- **CTA**: reply, forward, or poll. No external link unless brief specifies.
- **Emoji**: yes, sparingly (max 1 per paragraph)

### Instagram
- **Caption length**: 125 chars visible before "more" — lead with the hook
- **Total length**: up to 2200 chars
- **Hashtags**: 5–15, placed after a line break separator
- **CTA**: save, comment, DM, or link in bio
- **Emoji**: yes, 3–5 natural placements

### TikTok
- **Caption length**: max 2200 chars, but first 100 chars shown in feed
- **Hashtags**: 3–6 (mix trending + niche), in caption body
- **CTA**: "follow", "duet this", "comment your X"
- **Stitch/Duet flag**: include if brief suggests collaborative format

### YouTube Shorts
- **Title**: max 100 chars — strong keyword + emotion
- **Description**: 150–300 chars + hashtags at end
- **Hashtags**: 3–5, placed as `#tag` in description
- **CTA**: subscribe, comment, watch next

### Facebook Page
- **Length**: 40–80 chars for highest reach on mobile; up to 500 acceptable
- **Hashtags**: 1–3 only
- **CTA**: share, comment, react

## Output Format

```json
{
  "caption_id": "<uuid>",
  "brief_id": "<from content-brief>",
  "script_id": "<optional>",
  "variants": {
    "telegram": { "text": "...", "hashtags": [], "cta": "..." },
    "instagram": { "caption": "...", "hashtags": [], "cta": "..." },
    "tiktok": { "caption": "...", "hashtags": [], "cta": "..." },
    "youtube_shorts": { "title": "...", "description": "...", "hashtags": [] },
    "facebook": { "text": "...", "hashtags": [], "cta": "..." }
  }
}
```

Only produce variants for platforms specified in the brief.

## Rules

1. **Never repeat the same caption verbatim** across platforms — adapt, don't copy-paste.
2. **Core message must survive all adaptations** — verify each variant still delivers the brief's `core_message`.
3. **No fabricated mentions** — don't tag accounts unless operator provides them.
4. **Hashtag research** — use brief's topic and audience to pick hashtags. Prefer mid-tier (100K–2M posts) over mega-viral for discoverability.
5. **Cross-promo block** (optional): if brief.platforms has ≥2 entries, offer a "follow us on X" cross-promo line per platform.

## Operator Preview Card

```
✍️ Captions — <topic>
─────────────────────────────
📱 Telegram:
<first 120 chars of telegram.text>...
#tag1 #tag2 #tag3

📸 Instagram:
<first 125 chars>...
─────────────────────────────
[ ✅ Approve all ]  [ 👁 Review each ]  [ 🔄 Regenerate ]
```

Pass to `epicgram-review-and-approval` before any platform skill uses the text.

## Integration points

- Requires: `epicgram-content-brief` (brief_id) or `epicgram-script-writer` (script_id)
- Consumed by: `epicgram-telegram-client-ops`, `epicgram-instagram-graph`, `epicgram-tiktok-publisher`, etc.
- Stored at: `POST /api/v1/operator/captions` if available

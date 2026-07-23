# epicgram-content-brief

## Description
Transforms a raw idea, topic, or goal into a structured content brief that downstream skills (script-writer, caption-hashtags, video-assembly) can consume. Acts as the top of the content pipeline.

## When to use
Load when:
- The operator types or pastes a raw idea, topic, URL, or voice note transcript.
- The AI receives a content goal ("make a post about X for our Telegram channel").
- An automated trigger (n8n, scheduler) delivers a content task without a structured brief.

## Brief Structure

A completed brief is a JSON object (also displayable as a card):

```json
{
  "brief_id": "<uuid>",
  "created_at": "<ISO 8601>",
  "raw_input": "<original operator text>",
  "goal": "awareness | engagement | conversion | retention | announcement",
  "topic": "<clean topic title>",
  "core_message": "<one sentence: what the audience should take away>",
  "audience": "<description of target audience>",
  "tone": "professional | casual | humorous | urgent | inspirational",
  "platforms": ["telegram", "instagram", "tiktok", "youtube_shorts", "facebook"],
  "format": "short_video | long_video | static_image | carousel | text_post | poll",
  "duration_seconds": null,
  "references": [],
  "constraints": [],
  "account_id": "<epicgram account id>"
}
```

## Generation Rules

1. **Never invent the core message** — derive it from the raw input or ask the operator if ambiguous.
2. **Platform selection** — if not specified, ask. Never assume all platforms.
3. **Tone** — default to the account's configured tone from `epicgram-account-identity` if available; otherwise ask.
4. **Duration** — required for video formats. Ask if not specified.
5. **Constraints** — include any operator-specified no-go topics, words, or competitor names.
6. **Output** — always produce a brief card the operator can review before passing downstream.

## Clarification Protocol

If the raw input is insufficient for any required field, ask ONE clarifying question per turn. Do not ask multiple questions at once. Prioritize:
1. Goal
2. Platforms
3. Core message

## Operator Preview Card

```
📝 Content Brief — <topic>
─────────────────────────────
Goal:       <goal>
Platforms:  <list>
Format:     <format>
Tone:       <tone>
Core msg:   <core_message>
─────────────────────────────
[ ✅ Use this brief ]  [ ✏️ Edit ]
```

## Integration points

- Feeds into: `epicgram-script-writer`, `epicgram-caption-hashtags`, `epicgram-video-assembly`
- May pull account defaults from: `epicgram-account-identity` (Wave 2)
- Brief stored at: `POST /api/v1/operator/briefs` if available

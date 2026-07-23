---
name: epicgram-youtube-comments-engager
description: Draft suggested replies, pinned comment ideas, and engagement follow-ups for YouTube comments.
---

# epicgram-youtube-comments-engager

## Summary
Support YouTube engagement workflows by suggesting tone-aligned replies, pinned comment candidates, and moderation actions for comment threads. Never auto-replies — all suggestions require operator approval.

## When to use
- When the operator wants to respond to comments on a published video.
- When deciding what to pin as the top comment (channel comments drive watch time).
- When a comment thread needs moderation or escalation.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_identity` | object | ✓ |
| `comment_thread` | `{ video_id, comments: [{ id, text, author, like_count, is_reply }] }` | ✓ |
| `engagement_goal` | enum: `build_community \| drive_watch_next \| surface_questions \| neutralize_negative` | – |

## Outputs
```json
{
  "reply_suggestions": [
    {
      "comment_id": "string",
      "suggested_reply": "string",
      "action": "reply | heart | pin | hide | report | ignore",
      "rationale": "string"
    }
  ],
  "pin_candidate": {
    "comment_id": "string",
    "text": "string",
    "pin_rationale": "string"
  },
  "followup_content_ideas": ["string"],
  "moderation_flags": [
    {
      "comment_id": "string",
      "flag_type": "spam | hate | copyright_claim | impersonation | misleading",
      "recommended_action": "hide | report | delete"
    }
  ]
}
```

## YouTube engagement rules
- **Pin strategy**: pin a comment that asks a question (drives replies) or showcases community (drives watch time). Don't pin your own comment unless it adds navigation value ("Timestamps 👇").
- **Heart-only comments**: use for positive but brief comments that don't need a text reply — it shows engagement without cluttering the thread.
- **Reply length**: 1–3 sentences max. YouTube comment threads are not forums.
- **Never argue**: neutral disengagement beats any argument in comment threads.
- **Copyright comments**: any comment claiming the video uses their music/content → flag as `copyright_claim` and escalate immediately.

## API
```
POST /api/skills/youtube/comments
```

## Safety
- Must not auto-reply without operator approval.
- Escalate: hate speech, copyright claims, threats, or personal data exposure immediately.
- Comments containing URLs → flag as potential spam regardless of content.

## Integration points
- Requires: `epicgram-review-and-approval` (before any reply is posted)
- Calls: `epicgram-youtube-safe-mode` for any `reply` or `report` action
- Feeds into: `epicgram-youtube-analytics` (engagement patterns)

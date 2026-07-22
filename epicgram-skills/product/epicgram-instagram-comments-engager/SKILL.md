---
name: epicgram-instagram-comments-engager
description: Draft suggested replies, moderation actions, and engagement prompts for Instagram comments and interactions.
---

# epicgram-instagram-comments-engager

## Summary
Support engagement workflows by suggesting safe, tone-aligned replies and moderation actions for Instagram comment threads. Never auto-replies — all suggestions go through approval.

## When to use
- When the operator wants to respond to comments on a published post.
- When a comment thread needs moderation or escalation.
- When follow-up content ideas should be surfaced from audience responses.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_identity` | object | ✓ |
| `comment_thread` | `{ post_id, comments: [{ id, text, author, is_reply }] }` | ✓ |
| `engagement_goal` | enum: `build_community \| drive_saves \| drive_DMs \| neutralize_negative` | – |

## Outputs
```json
{
  "reply_suggestions": [
    {
      "comment_id": "string",
      "suggested_reply": "string",
      "tone_match_score": 0.0,
      "action": "reply | hide | delete | escalate | ignore"
    }
  ],
  "moderation_flags": [
    {
      "comment_id": "string",
      "flag_type": "spam | abusive | policy_risk | competitor_attack",
      "recommended_action": "string"
    }
  ],
  "followup_content_ideas": []
}
```

## Reply rules
- Max 3 sentences per reply.
- Always match `account_identity.tone` — never break character.
- No external URLs in replies.
- Never reply to escalated threads without operator confirmation.
- Abusive comments: suggest `hide` or `delete` — never engage.

## API
```
POST /api/skills/instagram/comments
```

## Safety
- Must not auto-reply without approval — all suggestions require operator confirmation.
- Block or escalate abusive, legally risky, or policy-sensitive threads immediately.
- Comments containing personal data, phone numbers, or emails → flag as `policy_risk`.

## Integration points
- Requires: `epicgram-review-and-approval` (before any reply is sent)
- Feeds into: `epicgram-instagram-analytics` (engagement patterns)
- Calls: `epicgram-instagram-safe-mode` for any `reply` action

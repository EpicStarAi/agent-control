---
name: epicgram-facebook-comments-engager
description: Draft suggested replies and moderation actions for Facebook Page comments and mentions.
---

# epicgram-facebook-comments-engager

## Summary
Support Facebook engagement workflows by suggesting tone-aligned replies, moderation actions, and follow-up content ideas from comment analysis. All suggestions require operator approval before posting.

## When to use
- When the operator wants to respond to comments on a published Page post.
- When a post receives high comment volume and needs triage.
- When detecting spam, policy violations, or PR-sensitive threads.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_identity` | object | ✓ |
| `comment_thread` | `{ post_id, comments: [{ id, text, author_name, like_count, is_reply, is_hidden }] }` | ✓ |
| `engagement_goal` | enum: `build_community \| handle_complaints \| drive_cta \| neutralize_negative` | – |

## Outputs
```json
{
  "reply_suggestions": [
    {
      "comment_id": "string",
      "suggested_reply": "string",
      "action": "reply | like | hide | delete | report | ignore",
      "priority": "high | medium | low",
      "rationale": "string"
    }
  ],
  "moderation_flags": [
    {
      "comment_id": "string",
      "flag_type": "spam | hate | harassment | misinformation | competitor_mention | legal_risk",
      "recommended_action": "hide | delete | report",
      "urgency": "immediate | within_1h | within_24h"
    }
  ],
  "followup_content_ideas": ["string"]
}
```

## Facebook comment engagement rules

- **Complaint comments**: never delete unless policy-violating — hiding only makes complaints more visible to the person who wrote them. Respond publicly with empathy, then move to DM for resolution.
- **Competitor mentions**: don't engage — hide or ignore. Responding draws attention.
- **Like-only engagement**: liking a comment (without replying) is valid for positive but brief comments. Facebook Pages can like comments.
- **Reply length**: 2–4 sentences max — long replies on Facebook feel corporate and performative.
- **Timing**: responding within 1 hour significantly increases the chance the original commenter replies back (algorithm rewards reply chains).
- **Legal risk**: any comment making factual claims about the brand that could be defamatory, or customer complaints that hint at legal action → flag as `legal_risk`, escalate immediately.

## Action mapping
| Action | When |
|---|---|
| `reply` | Substantive comment that deserves a response |
| `like` | Positive comment, brief, no response needed |
| `hide` | Spam, offensive, or off-topic — visible to author but not public |
| `delete` | Hate speech, platform policy violation, customer data exposed |
| `report` | Hate speech or illegal content — report to Facebook + delete |
| `ignore` | Neutral, no action value |

## API
```
POST /api/skills/facebook/comments
```

## Safety
- Must not auto-reply without operator approval.
- Escalate immediately: hate speech, legal claims, customer data exposure, verified threats.
- Comments with external links → flag as potential spam regardless of content.
- Do not engage with clearly automated/bot comments — flag and hide.

## Integration points
- Requires before reply: `epicgram-review-and-approval`, `epicgram-facebook-safe-mode`
- Feeds into: `epicgram-facebook-analytics` (engagement pattern tracking)
- Called by: operator or engagement dashboard

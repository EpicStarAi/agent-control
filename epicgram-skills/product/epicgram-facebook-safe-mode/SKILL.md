---
name: epicgram-facebook-safe-mode
description: Evaluate Facebook actions for policy, spam detection, political-sensitivity, Group rules, approval, and operational risk before publication.
---

# epicgram-facebook-safe-mode

## Summary
Facebook-specific safety gate. Must be called before any write action — Page publish, Group post, comment reply, bulk operation. Facebook has unique risk vectors: political content restrictions on Pages, engagement bait detection, spam signals from bulk posting, and Group-specific rules.

## When to use
- Before every call to `epicgram-facebook-page-publisher`.
- Before every Group post via `epicgram-facebook-group-broadcaster`.
- Before any comment reply via `epicgram-facebook-comments-engager`.
- Before any batch Facebook operation.

## Inputs
| Field | Type | Required |
|---|---|---|
| `action_type` | enum: `publish \| schedule \| edit \| delete \| bulk_publish \| bulk_edit \| group_post \| reply` | ✓ |
| `account_id` | string | ✓ |
| `content_payload` | `{ message, link_url?, media_urls?, scheduled_time?, target: "page" \| "group" }` | ✓ |
| `operator_role` | string | ✓ |
| `requested_volume` | integer | – (required for `bulk_*`) |

## Outputs
```json
{
  "decision": "allow | needs_approval | block",
  "risk_score": 0.0,
  "policy_flags": [
    {
      "flag": "string",
      "severity": "low | medium | high | critical",
      "policy_ref": "string",
      "recommended_action": "string"
    }
  ],
  "required_approvals": [],
  "reasoning": []
}
```

## Decision rules

| Condition | Decision |
|---|---|
| Single publish, approved content, valid token, no flags | `allow` |
| Missing `approval_token` | `needs_approval` |
| `bulk_publish` with `requested_volume` > 5/day | `needs_approval` |
| `requested_volume` > 25/day (daily Page limit) | `block` |
| `policy_flags` with severity `high` or `critical` | `block` |
| Group post without `group_rules` compliance check | `needs_approval` |
| Political or election-related content | `needs_approval` (always) |
| Content flagged as `engagement_bait_risk: true` | `block` |

## Facebook-specific policy risk categories

| Category | Severity | Notes |
|---|---|---|
| Engagement bait ("like if…", "share if…") | high | Facebook algorithm penalizes — suppression |
| Political content on non-political Pages | high | Risk of restrictions under Pages Policy §5 |
| Health misinformation | critical | Removal + Page strike |
| Spam-like bulk posting | high | Account-level suppression |
| Hate speech or harassment | critical | Content removal + Page strike |
| Misleading link preview (title ≠ destination) | high | Metadata policy violation |
| Cross-posting identical content to multiple Groups | high | Cross-group spam flag |
| Financial advice without disclosure | medium | Platform policy risk |
| Self-promotion in non-promotional Groups | medium | Removal from Group |
| Missing paid partnership disclosure | medium | Required by Facebook policy |

## Political content handling
Facebook has applied increased restrictions to political content distribution since 2023. For any content that mentions:
- Elections, candidates, political parties, legislation
- Social controversies (abortion, gun control, immigration)
- Government policy

→ Always return `needs_approval`, even if content is factually accurate and balanced.

## Bulk posting safety
- Max safe: **5 posts/day** per Page (above this, needs_approval)
- Hard block: **25 posts/day** (Facebook's own limit)
- Group posting: max **1 post/day** per account per Group

## API
```
POST /api/skills/facebook/safe-mode
POST /api/moderation/check
GET  /api/accounts/:account_id/rate-limits
```

## Safety
- This skill IS the safety layer for Facebook — must run before any publisher call.
- A `block` decision is final — do not retry the same payload without operator modification.
- Run in addition to (not instead of) `epicgram-safe-mode` (global gate — run both in sequence).

## Integration points
- Called by: `epicgram-facebook-page-publisher`, `epicgram-facebook-group-broadcaster`, `epicgram-facebook-comments-engager`
- Complements: `epicgram-safe-mode` (global gate)
- Logs to: `POST /api/v1/audit`

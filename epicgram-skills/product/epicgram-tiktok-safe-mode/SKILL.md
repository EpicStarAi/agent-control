---
name: epicgram-tiktok-safe-mode
description: Evaluate TikTok actions for policy, abuse, approval, rate limit, and operational risk before publication or automation.
---

# epicgram-tiktok-safe-mode

## Summary
TikTok-specific safety gate. Must be called before any write action to TikTok — publish, schedule, edit, delete, or bulk operation. Returns a binding `decision` that `epicgram-tiktok-publisher` must obey before proceeding.

## When to use
- Before every call to `epicgram-tiktok-publisher`.
- Before `epicgram-multiposting-scheduler` finalizes a TikTok slot.
- Before any bulk TikTok operation.
- When content `risk_flags` from the brief are non-empty.

## Inputs
| Field | Type | Required |
|---|---|---|
| `action_type` | enum: `publish \| schedule \| edit \| delete \| bulk_publish \| bulk_edit` | ✓ |
| `account_id` | string | ✓ |
| `content_payload` | object (caption, media_url, hashtags, privacy_setting) | ✓ |
| `operator_role` | string | ✓ |
| `requested_volume` | integer | – (required if `bulk_*`) |

## Outputs
```json
{
  "decision": "allow | needs_approval | block",
  "risk_score": 0.0,
  "policy_flags": [
    {
      "flag": "string",
      "severity": "low | medium | high | critical",
      "guideline_ref": "string"
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
| `bulk_publish` with `requested_volume` > 3/day | `needs_approval` |
| `policy_flags` with severity `high` or `critical` | `block` |
| TikTok account rate limit reached | `block` |
| Account flagged (`spam.risk_too_high`) | `block` |
| `privacy_setting` is `SELF_ONLY` (test publish) | `allow` |

## TikTok policy risk categories
| Category | Severity |
|---|---|
| Dangerous or illegal activities | critical |
| Hate speech or discrimination | critical |
| Misinformation about health or public safety | high |
| Spam-like hashtag patterns | medium |
| Commercial music on business account | high |
| Missing content disclosure (paid partnership) | medium |

## Rate limit check
```
GET /api/accounts/:account_id/rate-limits
POST /api/moderation/check
```

## API
```
POST /api/skills/tiktok/safe-mode
POST /api/moderation/check
GET  /api/accounts/:account_id/rate-limits
```

## Safety
- This skill IS the safety layer for TikTok — it must run before any publisher call.
- Bulk actions default to `needs_approval` unless operator has explicitly configured auto-approve.
- A `block` decision is final — do not retry without operator modification and re-submission.
- Run this skill in addition to (not instead of) `epicgram-safe-mode` (global gate).

## Integration points
- Called by: `epicgram-tiktok-publisher`, `epicgram-multiposting-scheduler`
- Complements: `epicgram-safe-mode` (run both — global gate first, then this)
- Logs to: `POST /api/v1/audit`

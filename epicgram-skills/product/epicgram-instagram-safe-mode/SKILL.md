---
name: epicgram-instagram-safe-mode
description: Evaluate Instagram actions for policy, abuse, permissions, approval, and operational risk before publication or automation.
---

# epicgram-instagram-safe-mode

## Summary
Instagram-specific safety gate. Must be called before any write action to Instagram — publish, schedule, edit, delete, bulk operation, or automated reply. Returns a `decision` that downstream skills must obey.

## When to use
- Before every call to `epicgram-instagram-graph`.
- Before `epicgram-instagram-post-scheduler` finalizes a slot.
- Before `epicgram-instagram-comments-engager` sends any reply.
- Before any bulk or batch Instagram operation.

## Inputs
| Field | Type | Required |
|---|---|---|
| `action_type` | enum: `publish \| schedule \| edit \| delete \| bulk_publish \| bulk_edit \| reply` | ✓ |
| `account_id` | string | ✓ |
| `content_payload` | object (caption, media_url, format, etc.) | ✓ |
| `operator_role` | string | ✓ |
| `requested_volume` | integer | – (required if `bulk_*` action) |

## Outputs
```json
{
  "decision": "allow | needs_approval | block",
  "risk_score": 0.0,
  "policy_flags": [
    {
      "flag": "string",
      "severity": "low | medium | high | critical",
      "guideline": "string"
    }
  ],
  "required_approvals": [],
  "reasoning": []
}
```

## Decision rules

| Condition | Decision |
|---|---|
| Single publish, approved content, valid token | `allow` |
| Missing `approval_token` | `needs_approval` |
| `bulk_publish` with `requested_volume` > 5 | `needs_approval` |
| `policy_flags` with severity `high` or `critical` | `block` |
| Account rate limit exceeded | `block` |
| Account lacks `instagram_content_publish` permission | `block` |

## Rate limit check
```
GET /api/accounts/:account_id/rate-limits
GET /api/accounts/:account_id/platform-permissions
```
If rate limit data is unavailable, default to `needs_approval`.

## API
```
POST /api/skills/instagram/safe-mode
POST /api/moderation/check
GET  /api/accounts/:account_id/rate-limits
GET  /api/accounts/:account_id/platform-permissions
```

## Safety
- This skill IS the safety layer. It must be called before any side effect.
- Bulk or reply automation defaults to `needs_approval` unless operator has explicitly configured auto-approve for that action type in account settings.
- A `block` decision is final — do not retry the same payload without operator modification.

## Integration points
- Called by: `epicgram-instagram-graph`, `epicgram-instagram-post-scheduler`, `epicgram-instagram-comments-engager`
- Complements: `epicgram-safe-mode` (global gate — run BOTH for Instagram actions)
- Logs to: `POST /api/v1/audit`

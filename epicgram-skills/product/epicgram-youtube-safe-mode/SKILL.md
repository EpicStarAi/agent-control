---
name: epicgram-youtube-safe-mode
description: Evaluate YouTube actions for policy, copyright, children's content rules, approval, and operational risk before publication.
---

# epicgram-youtube-safe-mode

## Summary
YouTube-specific safety gate. Must be called before any write action to YouTube — publish, schedule, edit, delete, or bulk operation. YouTube has unique risk vectors compared to other platforms: copyright, made-for-kids (COPPA), and ad-suitability policy that require platform-specific checks.

## When to use
- Before every call to `epicgram-youtube-shorts-publisher` or `epicgram-youtube-video-publisher`.
- Before any batch YouTube operation.
- When content `risk_flags` from the brief are non-empty.
- Before commenting or replying on any video.

## Inputs
| Field | Type | Required |
|---|---|---|
| `action_type` | enum: `publish \| schedule \| edit \| delete \| bulk_publish \| bulk_edit \| reply` | ✓ |
| `account_id` | string | ✓ |
| `content_payload` | `{ title, description, tags, thumbnail_url, video_url, made_for_kids }` | ✓ |
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
      "guideline_ref": "string",
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
| `bulk_publish` with `requested_volume` > 2/day | `needs_approval` |
| `policy_flags` with severity `high` or `critical` | `block` |
| `made_for_kids` not specified | `needs_approval` |
| Video > 15 min and account not verified | `block` |
| Copyright risk detected in music/clips | `block` |

## YouTube-specific policy risk categories
| Category | Severity | Notes |
|---|---|---|
| Copyright music without license | critical | Blocked or claimed immediately |
| Made-for-kids misclassification | high | COPPA violation risk |
| Dangerous or harmful content | critical | Immediate strike risk |
| Misleading thumbnail vs. content | high | Metadata policy violation |
| Age-restricted content without flag | high | Requires content rating |
| Hate speech or harassment | critical | Channel strike or termination |
| Health/medical misinformation | high | Limited distribution or removal |
| Spam-like tag stuffing | medium | Suppressed in search |
| Missing paid promotion disclosure | medium | Required by YouTube policy |

## COPPA / Made-for-Kids check
For any content that could appeal to children, always ask:
- Is this content directed at children?
- Does it feature cartoons, animations, or child characters?
- Does it use simple language and bright colors targeting children?

If YES to any → set `made_for_kids: true` and flag as `needs_approval`.

## API
```
POST /api/skills/youtube/safe-mode
POST /api/moderation/check
GET  /api/accounts/:account_id/rate-limits
```

## Safety
- This skill IS the safety layer for YouTube — must run before any publisher call.
- Bulk actions default to `needs_approval` unless operator has explicitly enabled auto-approve.
- A `block` decision is final — do not retry the same payload without operator modification.
- Run in addition to (not instead of) `epicgram-safe-mode` (global gate — run that first).

## Integration points
- Called by: `epicgram-youtube-shorts-publisher`, `epicgram-youtube-video-publisher`, `epicgram-youtube-comments-engager`
- Complements: `epicgram-safe-mode` (global gate — run both)
- Logs to: `POST /api/v1/audit`

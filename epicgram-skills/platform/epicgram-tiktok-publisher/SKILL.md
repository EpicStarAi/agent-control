---
name: epicgram-tiktok-publisher
description: Publish or schedule a TikTok video using approved assets, captions, hashtags, privacy, and account settings.
---

# epicgram-tiktok-publisher

## Summary
Execute a TikTok publish or schedule action using the TikTok Content Posting API. Only operates on operator-approved content with a valid `approval_token`. Handles direct post and scheduled post flows.

## When to use
- After `epicgram-tiktok-safe-mode` returns `allow`.
- After `epicgram-review-and-approval` returns an `approval_token`.
- When `epicgram-multiposting-scheduler` delegates a TikTok publish action.

## Authentication

```
TIKTOK_ACCESS_TOKEN=<secret>
TIKTOK_CLIENT_KEY=<secret>
```

Required scopes: `video.publish`, `video.list`

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `approved_media_url` | string (public CDN URL, .mp4) | ✓ |
| `approved_caption` | string (from `epicgram-tiktok-caption-hashtags`) | ✓ |
| `approved_hashtags` | array | ✓ |
| `privacy_setting` | enum: `PUBLIC_TO_EVERYONE \| MUTUAL_FOLLOW_FRIENDS \| SELF_ONLY` | ✓ |
| `scheduled_time` | ISO 8601 datetime | – |
| `approval_token` | string | ✓ |

## Outputs
```json
{
  "publish_status": "scheduled | published | failed",
  "platform_post_id": "string",
  "platform_url": "string",
  "error_details": {
    "code": "string",
    "message": "string"
  }
}
```

## Publish Flow (TikTok Content Posting API v2)

### Step 1 — Initialize upload
```
POST https://open.tiktokapis.com/v2/post/publish/video/init/
Headers: Authorization: Bearer {TIKTOK_ACCESS_TOKEN}
Body: {
  "post_info": {
    "title": "<caption first 150 chars>",
    "privacy_level": "<privacy_setting>",
    "disable_duet": false,
    "disable_stitch": false
  },
  "source_info": {
    "source": "PULL_FROM_URL",
    "video_url": "<approved_media_url>"
  }
}
```
Returns: `{ publish_id: "..." }`

### Step 2 — Poll status
```
POST https://open.tiktokapis.com/v2/post/publish/status/fetch/
Body: { "publish_id": "<from step 1>" }
```
Poll every 5s. States: `PROCESSING_UPLOAD → PROCESSING_DOWNLOAD → SUCCESS | FAILED`

### Step 3 — Confirm and log
On `SUCCESS`: store `platform_post_id`, construct `platform_url`, log audit event.
On `FAILED`: surface `error_code` to operator, do not retry automatically.

## Scheduling
Pass `scheduled_time` as Unix timestamp in `post_info.schedule_time` (≥10 minutes from now, ≤10 days out).

## Error Handling
| Error code | Meaning | Action |
|---|---|---|
| `access_token.invalid` | Token expired | Alert operator to re-authenticate |
| `spam.risk_too_high` | Account flagged | Block publish, alert operator |
| `video.not_downloadable` | CDN URL inaccessible | Verify media URL before retry |
| `quota.reach` | Daily post limit hit | Schedule for next available slot |

## Safety
- Must verify `approval_token` against `epicgram-review-and-approval` before any side effect.
- Must call `epicgram-tiktok-safe-mode` first — refuse if decision is not `allow`.
- Must log audit event for every publish attempt (success or failure).
- Bulk publish (`requested_volume` > 1): must pass RED-class approval.

## Integration points
- Called by: `epicgram-multiposting-scheduler`
- Requires (before calling): `epicgram-tiktok-safe-mode`, `epicgram-review-and-approval`
- Receives from: `epicgram-tiktok-caption-hashtags`, `epicgram-tiktok-video-assembly`
- Logs to: `POST /api/v1/audit`

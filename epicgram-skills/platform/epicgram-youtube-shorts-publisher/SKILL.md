---
name: epicgram-youtube-shorts-publisher
description: Publish or schedule a YouTube Short using approved media, title, description, and tags via YouTube Data API v3.
---

# epicgram-youtube-shorts-publisher

## Summary
Execute a YouTube Shorts publish or schedule action using the YouTube Data API v3. Handles video upload, metadata assignment, and privacy configuration. Requires valid `approval_token` from `epicgram-review-and-approval`.

## When to use
- After `epicgram-youtube-safe-mode` returns `allow`.
- After `epicgram-review-and-approval` returns an `approval_token`.
- When `epicgram-multiposting-scheduler` delegates a YouTube Shorts publish action.

## Authentication
```
YOUTUBE_ACCESS_TOKEN=<secret>
YOUTUBE_CLIENT_ID=<secret>
YOUTUBE_CLIENT_SECRET=<secret>
```
Required scopes: `https://www.googleapis.com/auth/youtube.upload`

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `approved_media_url` | string (public .mp4, vertical 9:16) | ✓ |
| `approved_title` | string (from `epicgram-youtube-title-optimizer`) | ✓ |
| `approved_description` | string | ✓ |
| `tags` | array of strings (max 500 chars total) | ✓ |
| `privacy_status` | enum: `public \| unlisted \| private` | ✓ |
| `thumbnail_url` | string (public image URL) | – |
| `scheduled_time` | ISO 8601 datetime | – |
| `approval_token` | string | ✓ |

## Outputs
```json
{
  "publish_status": "scheduled | published | failed",
  "youtube_video_id": "string",
  "video_url": "https://youtube.com/shorts/{youtube_video_id}",
  "error_details": {
    "code": "string",
    "message": "string"
  }
}
```

## Publish flow (YouTube Data API v3)

### Step 1 — Insert video
```
POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
Headers: Authorization: Bearer {YOUTUBE_ACCESS_TOKEN}
Body snippet: {
  "title": "<approved_title>",
  "description": "<approved_description>",
  "tags": [],
  "categoryId": "22"
}
Body status: {
  "privacyStatus": "<privacy_status>",
  "publishAt": "<scheduled_time or omit for immediate>"
}
```

### Step 2 — Upload binary (resumable upload)
Use the `Location` header from Step 1. Upload the video file in chunks (256KB minimum chunk size).

### Step 3 — Set thumbnail (optional)
```
POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId={youtube_video_id}
Headers: Authorization: Bearer {YOUTUBE_ACCESS_TOKEN}
Body: <image binary>
```

### Step 4 — Mark as Short
YouTube auto-classifies videos ≤60s with 9:16 ratio as Shorts. No explicit API flag needed — just ensure the video meets spec.

## Shorts video specs
- Duration: ≤60 seconds
- Aspect ratio: 9:16 (1080×1920)
- Format: .mp4, H.264, AAC audio

## Error handling
| Error | Meaning | Action |
|---|---|---|
| `quotaExceeded` | Daily upload quota hit | Alert operator, retry tomorrow |
| `forbidden` | Token lacks upload scope | Re-authenticate |
| `uploadLimitExceeded` | Account upload limit hit | Alert operator |
| `invalidVideoFile` | Video doesn't meet specs | Alert with spec requirements |

## Safety
- Must verify `approval_token` before any upload.
- Must call `epicgram-youtube-safe-mode` first — refuse if decision ≠ `allow`.
- Log audit event for every publish attempt: `{ event: "youtube_shorts_publish", video_id, status, operator, timestamp }`.

## Integration points
- Called by: `epicgram-multiposting-scheduler`
- Requires before calling: `epicgram-youtube-safe-mode`, `epicgram-review-and-approval`
- Receives: title from `epicgram-youtube-title-optimizer`, thumbnail from `epicgram-youtube-thumbnail-concepts`
- Logs to: `POST /api/v1/audit`

---
name: epicgram-youtube-video-publisher
description: Publish or schedule a standard long-form YouTube video with metadata, playlist assignment, chapters, and privacy settings.
---

# epicgram-youtube-video-publisher

## Summary
Execute a long-form YouTube video publish or schedule action. Same API as Shorts publisher but with additional fields: playlist assignment, chapter timestamps in description, end screen configuration. All publishes require prior approval.

## When to use
- After `epicgram-youtube-safe-mode` returns `allow` for a longform action.
- After `epicgram-review-and-approval` returns an `approval_token`.
- When `epicgram-multiposting-scheduler` delegates a long-form YouTube publish.

## Authentication
Same as `epicgram-youtube-shorts-publisher` — uses `YOUTUBE_ACCESS_TOKEN`.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `approved_media_url` | string (public .mp4) | ✓ |
| `approved_title` | string | ✓ |
| `approved_description` | string (with chapter timestamps embedded) | ✓ |
| `tags` | array of strings | ✓ |
| `playlist_id` | string | – |
| `privacy_status` | enum: `public \| unlisted \| private` | ✓ |
| `thumbnail_url` | string | – |
| `scheduled_time` | ISO 8601 datetime | – |
| `approval_token` | string | ✓ |

## Outputs
```json
{
  "publish_status": "scheduled | published | failed",
  "youtube_video_id": "string",
  "video_url": "https://youtube.com/watch?v={youtube_video_id}",
  "playlist_added": true,
  "error_details": null
}
```

## Chapter timestamps in description
YouTube auto-creates chapters if the description starts with a timestamp at 0:00:
```
0:00 Intro
1:30 The problem
4:00 Why this matters
8:15 The solution
12:00 Results
14:30 Wrap up
```
Pass the `chapter_list` from `epicgram-youtube-longform-outline` to auto-generate this block.

## Playlist assignment
```
POST https://www.googleapis.com/youtube/v3/playlistItems?part=snippet
Body: {
  "snippet": {
    "playlistId": "<playlist_id>",
    "resourceId": { "kind": "youtube#video", "videoId": "<youtube_video_id>" }
  }
}
```
Run after successful video insert.

## Scheduled publish
Set `status.publishAt` to the ISO 8601 datetime and `status.privacyStatus` to `private`. YouTube will auto-publish at the scheduled time. Minimum lead time: 15 minutes.

## Error handling
| Error | Meaning | Action |
|---|---|---|
| `quotaExceeded` | Daily API quota hit (10,000 units/day default) | Alert operator |
| `forbidden` | Missing upload scope | Re-authenticate |
| `playlistNotFound` | Invalid `playlist_id` | Alert operator, skip playlist step |
| `processingFailure` | YouTube rejected the video file | Alert with format requirements |

## Safety
- Must verify `approval_token` before any upload.
- Must refuse bulk publish if `epicgram-youtube-safe-mode` blocks it.
- Log audit event: `{ event: "youtube_video_publish", video_id, playlist_id, status, operator, timestamp }`.
- Flag any video > 15 minutes — YouTube requires verified account for uploads > 15 min.

## Integration points
- Called by: `epicgram-multiposting-scheduler`
- Requires before calling: `epicgram-youtube-safe-mode`, `epicgram-review-and-approval`
- Chapter data from: `epicgram-youtube-longform-outline`
- Title from: `epicgram-youtube-title-optimizer`
- Thumbnail from: `epicgram-youtube-thumbnail-concepts`
- Logs to: `POST /api/v1/audit`

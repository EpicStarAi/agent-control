# YouTube Data API v3 — Quota Tracker

Default daily quota: **10,000 units**. Resets at midnight Pacific Time.

## Unit costs by operation

| Operation | API method | Units |
|---|---|---|
| Upload video | `videos.insert` | 1600 |
| Set thumbnail | `thumbnails.set` | 50 |
| Add to playlist | `playlistItems.insert` | 50 |
| Update video metadata | `videos.update` | 50 |
| List channel videos | `videos.list` | 1 |
| Get video analytics | Analytics API | 1 |
| Reply to comment | `comments.insert` | 50 |
| Delete comment | `comments.delete` | 50 |

## Daily capacity at 10,000 units
- 6 full uploads (6 × 1600 = 9600) — leaves 400 units for thumbnails/playlists
- OR: 4 uploads + thumbnails + playlists (4×1600 + 4×50 + 4×50) = 7000 units

## Check current quota usage
1. Google Cloud Console → APIs & Services → YouTube Data API v3 → Quotas & System Limits
2. Or monitor via the API dashboard graph.

## Request quota increase
1. Cloud Console → YouTube Data API v3 → Quotas → click "Edit quotas"
2. Describe use case (content publishing platform, not scraping)
3. Google typically approves 50,000–100,000 units/day for legitimate publishing tools within 5–7 days.

## Quota-aware scheduling
If `epicgram-multiposting-scheduler` has > 6 YouTube uploads queued in a day, it should:
1. Space uploads across multiple days automatically.
2. Surface a quota warning to the operator before the queue is submitted.

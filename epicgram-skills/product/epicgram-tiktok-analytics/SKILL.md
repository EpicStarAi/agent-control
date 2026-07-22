---
name: epicgram-tiktok-analytics
description: Retrieve and analyze TikTok performance metrics for videos, campaigns, and account growth.
---

# epicgram-tiktok-analytics

## Summary
Collect TikTok video and account metrics via the TikTok Research API and convert them into actionable findings for content strategy. Read-only — never modifies content or publishing state.

## When to use
- After publishing a video and waiting ≥ 24h for data to stabilize.
- When the operator asks for performance data on specific videos or a time range.
- As input to `epicgram-tiktok-growth-strategist`.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `post_ids` | array of strings | – (if omitted, fetch last 30 days) |
| `time_range` | `{ start: ISO8601, end: ISO8601 }` | – |

## Outputs
```json
{
  "metrics_summary": {
    "total_views": 0,
    "avg_watch_time_sec": 0.0,
    "avg_completion_rate": 0.0,
    "total_likes": 0,
    "total_shares": 0,
    "total_comments": 0,
    "profile_visits": 0,
    "followers_gained": 0,
    "top_format": "string",
    "best_hook_style": "string"
  },
  "top_posts": [
    {
      "post_id": "string",
      "views": 0,
      "completion_rate": 0.0,
      "shares": 0,
      "hook_style": "string"
    }
  ],
  "retention_findings": [
    {
      "drop_off_point_sec": 0,
      "pattern": "string",
      "recommendation": "string"
    }
  ],
  "growth_recommendations": []
}
```

## Key TikTok metrics (priority order)
1. **Completion rate** — % who watch to end. > 50% is strong.
2. **Shares** — primary virality signal.
3. **Comments** — community engagement, algorithm boost.
4. **Watch time** — total and average.
5. **Saves** — intent signal.
6. **Likes** — weakest signal, do not over-index.

## API
```
GET /api/skills/tiktok/analytics
```

Proxied through EPICGRAM api-server to TikTok Research API:
```
POST https://open.tiktokapis.com/v2/video/list/
Headers: Authorization: Bearer {TIKTOK_ACCESS_TOKEN}
Body: { "fields": ["id", "view_count", "share_count", "comment_count", "like_count"] }
```

## Safety
- Read-only skill — must not modify content or publishing state.
- Must not expose raw access tokens in output.
- Data has 24–48h delay — surface this to operator to avoid premature optimization.

## Integration points
- Called after: `epicgram-tiktok-publisher` (post-publish cycle)
- Feeds into: `epicgram-tiktok-growth-strategist`
- Stores results at: `POST /api/analytics/store`

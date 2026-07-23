---
name: epicgram-youtube-analytics
description: Retrieve and analyze YouTube performance metrics including watch time, retention, CTR, RPM, and subscriber delta.
---

# epicgram-youtube-analytics

## Summary
Collect YouTube video and channel metrics via YouTube Analytics API and convert them into actionable findings. Emphasizes retention curve analysis and CTR — the two metrics that most directly drive YouTube algorithmic distribution.

## When to use
- After publishing a video and waiting ≥ 48h for data to stabilize.
- When the operator asks for performance data on specific videos or a time range.
- As input to `epicgram-youtube-growth-strategist`.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `video_ids` | array of strings | – (if omitted, fetch last 30 days) |
| `time_range` | `{ start: ISO8601, end: ISO8601 }` | – |

## Outputs
```json
{
  "metrics_summary": {
    "total_views": 0,
    "total_watch_time_hours": 0.0,
    "avg_view_duration_sec": 0.0,
    "avg_ctr": 0.0,
    "avg_retention_rate": 0.0,
    "subscribers_gained": 0,
    "subscribers_lost": 0,
    "avg_rpm": 0.0,
    "top_format": "shorts | longform",
    "best_posting_day": "string"
  },
  "top_videos": [
    {
      "video_id": "string",
      "title": "string",
      "views": 0,
      "ctr": 0.0,
      "avg_view_duration_sec": 0.0,
      "retention_rate": 0.0,
      "format": "shorts | longform"
    }
  ],
  "retention_findings": [
    {
      "video_id": "string",
      "drop_off_sec": 0,
      "drop_off_pct": 0.0,
      "pattern": "string",
      "recommendation": "string"
    }
  ],
  "growth_recommendations": []
}
```

## YouTube-specific metric benchmarks
| Metric | Weak | Good | Strong |
|---|---|---|---|
| CTR (impressions → clicks) | < 2% | 4–6% | > 8% |
| Average view duration | < 30% | 40–50% | > 55% |
| Retention at 30s | < 50% | 60–70% | > 80% |
| Subscriber conversion | < 0.5% | 1–2% | > 3% |

CTR and retention are the primary signals — optimize these before anything else.

## API
```
GET /api/skills/youtube/analytics
```

Proxied through EPICGRAM api-server to YouTube Analytics API:
```
GET https://youtubeanalytics.googleapis.com/v2/reports
  ?ids=channel==MINE
  &metrics=views,watchTime,averageViewDuration,annotationClickThroughRate,subscribersGained
  &dimensions=video
  &startDate=<start>
  &endDate=<end>
  &access_token={YOUTUBE_ACCESS_TOKEN}
```

## Safety
- Read-only skill — must not modify publishing state.
- Must not expose raw access tokens in output.
- Warn operator: data has 48–72h delay on YouTube Analytics — surface this to avoid premature optimization.

## Integration points
- Called after: `epicgram-youtube-shorts-publisher` or `epicgram-youtube-video-publisher`
- Feeds into: `epicgram-youtube-growth-strategist`
- Stores results at: `POST /api/analytics/store`

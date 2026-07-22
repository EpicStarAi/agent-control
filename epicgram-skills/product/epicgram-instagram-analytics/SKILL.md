---
name: epicgram-instagram-analytics
description: Retrieve and analyze Instagram metrics including reach, impressions, saves, shares, profile visits, and engagement patterns.
---

# epicgram-instagram-analytics

## Summary
Collect Instagram metrics via the Graph API and convert them into practical recommendations for future content. Read-only — never modifies publishing state.

## When to use
- When the operator asks for performance data on a post, campaign, or time range.
- After a publishing cycle to evaluate what worked.
- As input to `epicgram-instagram-growth-strategist`.

## Inputs
| Field | Type | Required |
|---|---|---|
| `account_id` | string | ✓ |
| `post_ids` | array of strings | – (if omitted, fetch last 30 days) |
| `time_range` | `{ start: ISO8601, end: ISO8601 }` | – |
| `campaign_id` | string | – |

## Outputs
```json
{
  "metrics_summary": {
    "total_reach": 0,
    "total_impressions": 0,
    "avg_engagement_rate": 0.0,
    "top_format": "reel | feed_post | carousel | story",
    "best_posting_time": "string"
  },
  "top_posts": [
    {
      "post_id": "string",
      "format": "string",
      "reach": 0,
      "saves": 0,
      "shares": 0,
      "engagement_rate": 0.0
    }
  ],
  "format_findings": [
    {
      "format": "string",
      "avg_reach": 0,
      "avg_saves": 0,
      "recommendation": "string"
    }
  ],
  "growth_recommendations": []
}
```

## API
```
GET /api/skills/instagram/analytics
POST /api/analytics/store
```

Proxied through EPICGRAM api-server to Instagram Graph API:
```
GET https://graph.facebook.com/v21.0/{post_id}/insights
  ?metric=impressions,reach,saved,shares,comments,likes
  &access_token={INSTAGRAM_ACCESS_TOKEN}
```

## Safety
- Read-only skill — must not modify publishing state.
- Must not expose raw access tokens in output.

## Integration points
- Called after: `epicgram-instagram-graph` (post-publish)
- Feeds into: `epicgram-instagram-growth-strategist`
- Stores results at: `POST /api/analytics/store` for historical tracking

---
name: epicgram-facebook-analytics
description: Retrieve and analyze Facebook Page metrics including reach, clicks, reactions, engagement rate, and audience insights.
---

# epicgram-facebook-analytics

## Summary
Collect and interpret Facebook Page Insights via the Graph API. Focuses on organic reach, engagement patterns, and best-performing content types to feed `epicgram-facebook-growth-strategist`.

## When to use
- After publishing posts (wait ≥ 48h for data to stabilize).
- When the operator asks for performance data on specific posts or a time range.
- As input to `epicgram-facebook-growth-strategist`.

## Inputs
| Field | Type | Required |
|---|---|---|
| `page_id` | string | ✓ |
| `post_ids` | array of strings | – (if omitted, fetch last 30 days) |
| `time_range` | `{ since: Unix timestamp, until: Unix timestamp }` | – |

## Outputs
```json
{
  "metrics_summary": {
    "total_reach": 0,
    "total_impressions": 0,
    "avg_engagement_rate": 0.0,
    "total_reactions": 0,
    "total_shares": 0,
    "total_comments": 0,
    "total_link_clicks": 0,
    "page_followers_gained": 0,
    "best_posting_day": "string",
    "best_posting_hour": 0,
    "top_content_type": "text | link | video | image"
  },
  "top_posts": [
    {
      "post_id": "string",
      "message_preview": "string",
      "reach": 0,
      "engagement_rate": 0.0,
      "reactions": 0,
      "shares": 0,
      "comments": 0,
      "type": "text | link | video | image",
      "published_at": "ISO8601"
    }
  ],
  "engagement_findings": ["string"],
  "growth_recommendations": []
}
```

## Facebook Insights API calls

```
GET https://graph.facebook.com/v21.0/{page_id}/insights
  ?metric=page_impressions,page_reach,page_engaged_users,page_fan_adds
  &period=day
  &since=<unix_timestamp>
  &until=<unix_timestamp>
  &access_token={FACEBOOK_PAGE_ACCESS_TOKEN}
```

For per-post metrics:
```
GET https://graph.facebook.com/v21.0/{post_id}/insights
  ?metric=post_impressions,post_reach,post_engaged_users,post_reactions_like_total,post_clicks
  &access_token={FACEBOOK_PAGE_ACCESS_TOKEN}
```

## Facebook-specific metric benchmarks

| Metric | Weak | Good | Strong |
|---|---|---|---|
| Organic reach / followers | < 1% | 3–6% | > 10% |
| Engagement rate (reactions+comments+shares / reach) | < 0.5% | 1–3% | > 5% |
| Link CTR (clicks / reach) | < 0.5% | 1–2% | > 3% |
| Video 3-second view rate | < 15% | 25–40% | > 50% |

Organic reach on Facebook Pages has been declining since 2012. A 2–4% reach rate is healthy for 2025+.

## Data lag
Facebook Insights data has a **24–48h delay**. Surface this to the operator to avoid premature optimization decisions.

## API
```
GET /api/skills/facebook/analytics
```

## Safety
- Read-only skill — must not modify any post or publishing state.
- Must not expose raw access tokens in output.

## Integration points
- Called after: `epicgram-facebook-page-publisher` (wait 48h)
- Feeds into: `epicgram-facebook-growth-strategist`
- Stores results at: `POST /api/analytics/store`

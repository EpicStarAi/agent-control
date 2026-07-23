---
name: epicgram-instagram-growth-strategist
description: Generate Instagram growth strategy based on content performance, audience behavior, and format-level insights.
---

# epicgram-instagram-growth-strategist

## Summary
Analyze historical performance and account identity to recommend improvements across Reels, Feed, Carousel, Stories, and cross-format strategy. Advisory only — produces recommendations, not actions.

## When to use
- After `epicgram-instagram-analytics` produces a `metrics_summary`.
- When the operator asks "what should we do next" or "why aren't we growing".
- When planning the next content sprint or campaign.

## Inputs
| Field | Type | Required |
|---|---|---|
| `analytics_summary` | object (from `epicgram-instagram-analytics`) | ✓ |
| `account_identity` | object | ✓ |
| `campaign_history` | array of past `{ brief_id, results }` | – |

## Outputs
```json
{
  "growth_hypotheses": [
    {
      "hypothesis": "string",
      "evidence": "string",
      "confidence": "high | medium | low"
    }
  ],
  "format_strategy": {
    "double_down": "reel | feed_post | carousel | story",
    "reduce": "string",
    "experiment": "string",
    "rationale": "string"
  },
  "experiment_plan": [
    {
      "experiment_id": "string",
      "variable": "hook_style | posting_time | caption_length | format",
      "variant_a": "string",
      "variant_b": "string",
      "success_metric": "string"
    }
  ],
  "next_content_recommendations": [
    {
      "topic": "string",
      "format": "string",
      "rationale": "string",
      "priority": "high | medium | low"
    }
  ]
}
```

## Strategy rules
- Never recommend posting frequency > 2x per day (algorithm penalty risk).
- Hypotheses must cite data from `analytics_summary` — no fabricated trends.
- Experiments: one variable per test, minimum 7-day run before conclusions.
- If `avg_engagement_rate` < 1%: recommend audience reset before format experiments.

## API
```
POST /api/skills/instagram/growth
```

## Safety
- Advisory only — must not directly publish, edit, or delete content.
- Must flag any recommendation that could violate platform guidelines.

## Integration points
- Requires: `epicgram-instagram-analytics` (analytics_summary)
- Outputs feed into: `epicgram-instagram-brief` (next content cycle)
- Called by: operator or `epicgram-core-routing` (Wave 2)

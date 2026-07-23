---
name: epicgram-facebook-growth-strategist
description: Generate Facebook growth strategy for Pages and Groups based on performance data, engagement patterns, and audience behavior.
---

# epicgram-facebook-growth-strategist

## Summary
Analyze Facebook performance data to produce actionable growth hypotheses, content strategy, and experiment plans. Facebook growth in 2025 is a different game than 2015: organic reach is low, but Groups, Reels, and consistent posting cadence can still build audiences from scratch.

## When to use
- After `epicgram-facebook-analytics` produces a `metrics_summary`.
- When the operator asks why the Page isn't growing or what to post next.
- When planning a new content series or community activation.

## Inputs
| Field | Type | Required |
|---|---|---|
| `analytics_summary` | object (from `epicgram-facebook-analytics`) | ✓ |
| `account_identity` | object | ✓ |
| `campaign_history` | array of `{ brief_id, post_id, results }` | – |

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
  "content_strategy": {
    "primary_format": "text | video | link | image",
    "group_strategy": "string",
    "reels_opportunity": "string",
    "posting_cadence": "X posts/week",
    "best_times": ["Day HH:MM"],
    "rationale": "string"
  },
  "experiment_plan": [
    {
      "experiment_id": "string",
      "variable": "post_length | format | posting_time | cta_style | topic_category",
      "variant_a": "string",
      "variant_b": "string",
      "success_metric": "reach | engagement_rate | link_clicks | follower_gain",
      "run_for_posts": 10
    }
  ],
  "next_content_recommendations": [
    {
      "topic": "string",
      "format": "text | link | video | poll",
      "fb_placement": "page | group | both",
      "priority": "high | medium | low",
      "rationale": "string"
    }
  ]
}
```

## Facebook-specific growth principles (2025)

- **Reels are the algorithm lever**: Facebook's algorithm currently over-indexes Reels distribution vs. static posts. Even one Reel/week can dramatically increase Page reach.
- **Groups amplify Pages**: owning or being active in a relevant Group is the most reliable organic reach strategy in 2025. Group posts reach 100% of members who visit, unlike Page posts (2–6%).
- **Consistency beats virality**: Pages posting 3–5 times/week outperform Pages posting once a week and going viral occasionally.
- **Text + question is underrated**: conversational posts that end with a genuine question drive comment chains — the algorithm reads comment count as quality signal.
- **Link posts are penalized**: Facebook actively suppresses posts that take users off-platform. If you must share links, share the image and put the URL in comments.
- **Never buy followers**: Fake followers dilute engagement rate, which kills organic reach permanently.

## Experiment sizing
Minimum 10 posts per variable before drawing conclusions. Facebook's algorithm doesn't stabilize distribution of a single post for 72h.

## API
```
POST /api/skills/facebook/growth
```

## Safety
- Advisory only — must not trigger publishing, editing, or deleting content.
- All hypotheses must cite data from `analytics_summary` — never fabricate trends.
- Flag any recommendation that could violate Facebook Pages Policy.

## Integration points
- Requires: `epicgram-facebook-analytics`
- Outputs feed into: `epicgram-facebook-brief` (next content cycle)

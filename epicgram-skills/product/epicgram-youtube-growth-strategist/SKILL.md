---
name: epicgram-youtube-growth-strategist
description: Generate YouTube growth strategy for topic selection, serialization, Shorts-to-longform funnel design, and CTR optimization.
---

# epicgram-youtube-growth-strategist

## Summary
Analyze YouTube performance data to produce growth hypotheses, content strategy, serialization plans, and A/B experiment recommendations. YouTube growth strategy differs significantly from TikTok/Instagram: focus is on topic authority, watch time, and Shorts-as-funnel for longform.

## When to use
- After `epicgram-youtube-analytics` produces a `metrics_summary`.
- When the operator asks why the channel isn't growing or what to make next.
- When planning a new content series or seasonal campaign.

## Inputs
| Field | Type | Required |
|---|---|---|
| `analytics_summary` | object (from `epicgram-youtube-analytics`) | ✓ |
| `account_identity` | object | ✓ |
| `campaign_history` | array of `{ brief_id, video_id, results }` | – |

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
    "topic_authority_focus": "string",
    "shorts_funnel_role": "string",
    "serialization_plan": "string",
    "posting_cadence": "X longform/week + Y Shorts/week",
    "rationale": "string"
  },
  "experiment_plan": [
    {
      "experiment_id": "string",
      "variable": "thumbnail | title_style | hook_duration | posting_time | topic_niche",
      "variant_a": "string",
      "variant_b": "string",
      "success_metric": "ctr | avg_view_duration | subscribers_gained",
      "run_for_videos": 8
    }
  ],
  "next_content_recommendations": [
    {
      "topic": "string",
      "format": "shorts | longform",
      "series_potential": true,
      "seo_angle": "string",
      "priority": "high | medium | low",
      "rationale": "string"
    }
  ]
}
```

## YouTube-specific growth rules
- **Topic authority beats variety**: 10 videos on one niche outperform 10 videos on 10 niches.
- **Shorts funnel**: Shorts drive subscriber discovery; longform drives watch time and RPM. Run both.
- **CTR first, retention second**: if CTR < 4%, fix thumbnail and title before touching content.
- **Serialization**: series (Part 1, 2, 3…) increase session watch time via auto-play.
- **Upload consistency**: YouTube's algorithm rewards regular cadence. Irregular posting breaks recommendation cycles.
- **Experiment size**: minimum 8 videos per variable (not days) for valid YouTube data.
- Do not recommend sub-buying, view bots, or engagement manipulation — these result in channel termination.

## API
```
POST /api/skills/youtube/growth
```

## Safety
- Advisory only — must not trigger publishing, editing, or deleting content.
- Flag any recommendation that could violate YouTube Community Guidelines or Terms of Service.
- Hypotheses must cite data from `analytics_summary` — never fabricate trends.

## Integration points
- Requires: `epicgram-youtube-analytics`
- Outputs feed into: `epicgram-youtube-brief` (next content cycle)
- Called by: operator or `epicgram-core-routing` (Wave 2)

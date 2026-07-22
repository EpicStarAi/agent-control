---
name: epicgram-tiktok-growth-strategist
description: Build TikTok growth recommendations based on performance patterns, audience response, and posting strategy.
---

# epicgram-tiktok-growth-strategist

## Summary
Analyze TikTok performance data to produce growth hypotheses, format strategy, and experiment plans. Advisory only — produces recommendations, not actions. Designed to feed back into the brief-creation cycle.

## When to use
- After `epicgram-tiktok-analytics` produces a `metrics_summary`.
- When the operator asks "why isn't this account growing" or "what should we post next".
- When planning the next content sprint or after a campaign ends.

## Inputs
| Field | Type | Required |
|---|---|---|
| `analytics_summary` | object (from `epicgram-tiktok-analytics`) | ✓ |
| `account_identity` | object | ✓ |
| `campaign_history` | array of `{ brief_id, results }` | – |

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
  "posting_strategy": {
    "frequency": "X posts per week",
    "optimal_days": [],
    "optimal_times": [],
    "format_mix": {
      "talking_head": "40%",
      "tutorial": "30%",
      "meme": "20%",
      "other": "10%"
    }
  },
  "experiment_plan": [
    {
      "experiment_id": "string",
      "variable": "hook_style | duration | posting_time | format | music_type",
      "variant_a": "string",
      "variant_b": "string",
      "success_metric": "completion_rate | shares | comments",
      "run_for_days": 14
    }
  ],
  "next_content_recommendations": [
    {
      "topic": "string",
      "format": "string",
      "hook_direction": "string",
      "priority": "high | medium | low",
      "rationale": "string"
    }
  ]
}
```

## TikTok growth rules
- **Posting frequency**: 1–4 posts/day is safe. > 4/day risks suppression.
- **Consistency beats virality**: regular posting schedule outperforms sporadic viral attempts.
- **Hook is the lever**: if `avg_completion_rate` < 30%, hook optimization beats format changes.
- **Niche before broad**: establish clear niche before experimenting with broad appeal formats.
- **Experiment duration**: minimum 14 videos per variant (not 14 days) for statistical validity.
- Do not recommend buying followers, engagement pods, or any gray-hat growth tactics.

## API
```
POST /api/skills/tiktok/growth
```

## Safety
- Advisory only — must not trigger publishing, editing, or deleting content.
- Flag any recommendation that could violate TikTok Community Guidelines.
- Do not fabricate trends — all hypotheses must cite data from `analytics_summary`.

## Integration points
- Requires: `epicgram-tiktok-analytics`
- Outputs feed into: `epicgram-tiktok-brief` (next content cycle)
- Called by: operator or `epicgram-core-routing` (Wave 2)

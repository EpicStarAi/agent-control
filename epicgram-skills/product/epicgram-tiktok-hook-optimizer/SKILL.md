---
name: epicgram-tiktok-hook-optimizer
description: Improve the first 1-3 seconds of a TikTok script by optimizing hook line, opening frame, and overlay text.
---

# epicgram-tiktok-hook-optimizer

## Summary
Focused optimization of the TikTok hook — the first 2–3 seconds that determine whether a viewer scrolls or stays. Takes an existing script variant and returns an improved hook with score and reasoning.

## When to use
- After `epicgram-tiktok-script-writer` produces a script.
- When `hook_score` from the script writer is below 0.7.
- When the operator asks to "make the hook stronger" or A/B test hook options.

## Inputs
| Field | Type | Required |
|---|---|---|
| `script_variant` | object (from `epicgram-tiktok-script-writer`) | ✓ |
| `target_emotion` | enum: `curiosity \| urgency \| surprise \| relatability \| aspiration` | – |
| `forbidden_patterns` | array of strings (patterns to avoid) | – |

## Outputs
```json
{
  "optimized_hook_line": "string",
  "opening_visual_cue": "string",
  "overlay_text": "string",
  "hook_score": 0.0,
  "hook_variants": [
    {
      "hook_line": "string",
      "score": 0.0,
      "emotion": "string"
    }
  ],
  "revision_notes": [
    {
      "issue": "string",
      "fix": "string"
    }
  ]
}
```

## Hook scoring criteria (0.0–1.0)
| Factor | Weight |
|---|---|
| Interrupts scroll pattern (visual or audio surprise) | 25% |
| Creates open loop or question (viewer needs resolution) | 25% |
| Matches target emotion clearly | 20% |
| Under 10 words / 3 seconds | 15% |
| No policy-risk patterns | 15% |

Score < 0.6: regenerate. Score 0.6–0.79: revise. Score ≥ 0.8: approve.

## Hook patterns (use as starting templates, not verbatim)
- **Counterintuitive claim**: "The thing everyone does wrong is actually correct."
- **Specific number**: "3 things I wish I knew before X."
- **Direct address**: "If you're a [audience], stop scrolling."
- **Unresolved tension**: "Here's what nobody tells you about X…"
- **Visual pattern break**: Silent open, then sudden voiceover.

## Forbidden patterns
- "This will change your life" — overused, credibility killer.
- Clickbait with no payoff in the video.
- Fake urgency ("only 10 minutes left").
- Any hook that requires deception to work.

## API
```
POST /api/skills/tiktok/hook-optimize
```

## Safety
- Must avoid deceptive, manipulative, or policy-risk hook patterns.
- Any `forbidden_patterns` match → auto-flag and exclude from output.

## Integration points
- Requires: `epicgram-tiktok-script-writer` output
- Feeds into: `epicgram-tiktok-video-assembly`, `epicgram-tiktok-caption-hashtags`

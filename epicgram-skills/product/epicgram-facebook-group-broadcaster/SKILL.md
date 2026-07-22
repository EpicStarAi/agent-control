---
name: epicgram-facebook-group-broadcaster
description: Plan and draft posts or polls for Facebook Groups, respecting group rules, posting cadence, and community dynamics.
---

# epicgram-facebook-group-broadcaster

## Summary
Generate posts and polls for Facebook Groups. Group posting is fundamentally different from Page posting: the audience is self-selected (already interested), group rules vary widely, and over-posting is penalized by members, not just the algorithm.

## When to use
- When the operator manages a brand-owned or partner Facebook Group.
- When cross-posting from a Page to a Group with community-adapted copy.
- When planning a community engagement series (weekly discussions, polls, challenges).

## Inputs
| Field | Type | Required |
|---|---|---|
| `group_id` | string | ✓ |
| `brief` | object (from `epicgram-facebook-brief`) | ✓ |
| `group_rules` | array of rule strings | – (pull via API if not provided) |

## Outputs
```json
{
  "group_post_draft": "string",
  "poll_draft": {
    "question": "string",
    "options": ["string"],
    "duration_days": 3
  },
  "rule_compliance_notes": ["string"],
  "cadence_recommendation": "string",
  "post_type_recommendation": "text | poll | question | link | announcement"
}
```

## Group vs Page content differences

| Dimension | Page post | Group post |
|---|---|---|
| Tone | Brand voice | Community peer voice |
| Length | Short–medium | Medium — Groups tolerate longer, value-dense posts |
| CTA | External (link, buy, sign up) | Internal (reply, share experience, vote) |
| Frequency | 1–3/day acceptable | 1–3/week max before members feel spammed |
| Personal pronouns | "We" / brand name | "I" / "We as a community" |

## Group rules compliance
Before drafting, check `group_rules` for:
- Self-promotion restrictions (many Groups ban promotional content entirely)
- Posting frequency limits (common: 1 post/day per member)
- Topic restrictions (stay on-niche)
- Link posting rules (often require pre-approval or specific days)

Flag any draft that could violate a rule as `rule_compliance_notes`.

## Poll best practices
- Question must be genuinely open and community-relevant (not promotional)
- 3–4 options: more than 4 leads to vote fragmentation
- Duration: 3–7 days (shorter = urgency but less data, longer = forgotten)
- Post the poll WITH context text — a standalone poll gets lower engagement than one framed with 2–3 sentences of why it matters
- Follow up when the poll ends: share the result as a post ("Here's what our community said…")

## API
```
POST /api/skills/facebook/group-broadcast
```

## Safety
- Must check against `group_rules` before drafting — promotional content in non-promotional groups gets the account removed.
- Must not auto-post to any Group; requires operator approval.
- Group posting via Graph API requires `groups_access_member_info` scope — verify this before attempting.
- Do not post identical content to multiple Groups simultaneously — Facebook detects cross-group spam.

## Integration points
- Requires: `epicgram-facebook-brief`
- Requires before posting: `epicgram-review-and-approval`, `epicgram-facebook-safe-mode`
- Note: Group posting via API requires specific app review approval from Meta (not available for all apps)

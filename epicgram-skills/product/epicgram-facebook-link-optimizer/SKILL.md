---
name: epicgram-facebook-link-optimizer
description: Optimize link-based Facebook posts including editable link preview title, description, and UTM parameter construction.
---

# epicgram-facebook-link-optimizer

## Summary
When posting a URL to Facebook, the link preview (title + description + image) is the most important visual element — users click the preview, not the post text. This skill optimizes all three editable fields and builds properly structured UTM URLs.

## When to use
- After `epicgram-facebook-brief` with `format: link_post`.
- When the operator wants to track link clicks by campaign in analytics.
- When repurposing a blog post, product page, or landing page to Facebook.

## Inputs
| Field | Type | Required |
|---|---|---|
| `brief` | object | ✓ |
| `target_url` | string | ✓ |
| `utm_campaign` | string | – |

## Outputs
```json
{
  "optimized_title": "string",
  "optimized_description": "string",
  "utm_url": "string",
  "utm_params": {
    "utm_source": "facebook",
    "utm_medium": "social",
    "utm_campaign": "string",
    "utm_content": "string"
  },
  "preview_notes": ["string"],
  "og_tag_warnings": ["string"]
}
```

## Link preview optimization rules

### Title (editable in Facebook post composer)
- Max 90 characters (truncated on mobile at ~70)
- Must match or closely relate to the actual page content
- Primary keyword at the start when possible
- No ALL CAPS, no excessive punctuation

### Description (editable in Facebook post composer)
- Max 300 characters (truncated at ~200 on mobile)
- Expand on the title — give one additional benefit or piece of information
- End with an implicit invitation (not "click here")

### OG tag warnings
Check if the target URL has correct Open Graph tags — if not, Facebook will pull random content for the preview. Common issues:
- Missing `og:title` → Facebook uses `<title>` tag (often generic)
- Missing `og:image` → Facebook picks a random page image
- `og:image` smaller than 1200×630px → shown as small thumbnail, not full-width preview
- `og:description` missing → Facebook truncates page body text

Report these as `og_tag_warnings` so the operator can fix the source page.

## UTM parameter structure
```
https://example.com/page
  ?utm_source=facebook
  &utm_medium=social
  &utm_campaign=<utm_campaign or brief.project_id>
  &utm_content=<variant_id>
```

Always use lowercase, no spaces (use underscores), consistent naming across campaigns.

## API
```
POST /api/skills/facebook/link-optimize
```

## Safety
- Must avoid clickbait or misleading link previews — title/description must accurately represent the destination.
- Flag if `target_url` domain differs from the account's known domain (potential phishing risk).
- Never shorten URLs with third-party shorteners that obscure the destination.

## Integration points
- Requires: `epicgram-facebook-brief` (`format: link_post`)
- Feeds into: `epicgram-facebook-page-publisher` (pass `optimized_title`, `optimized_description`, `utm_url`)

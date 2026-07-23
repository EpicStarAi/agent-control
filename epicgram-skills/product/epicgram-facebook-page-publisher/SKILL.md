---
name: epicgram-facebook-page-publisher
description: Publish or schedule an approved Facebook Page post including text, links, media, and events via the Graph API Pages endpoint.
---

# epicgram-facebook-page-publisher

## Summary
Execute a Facebook Page publish or schedule action using the Graph API. Handles text posts, link posts with custom preview overrides, native video uploads, and event creation. All actions require a prior `approval_token`.

## When to use
- After `epicgram-facebook-safe-mode` returns `allow`.
- After `epicgram-review-and-approval` returns an `approval_token`.
- When `epicgram-multiposting-scheduler` delegates a Facebook Page publish.

## Authentication
```
FACEBOOK_PAGE_ACCESS_TOKEN=<secret>   # Page-level token, not User token
FACEBOOK_PAGE_ID=<page numeric ID>
```

Page access tokens are obtained via `GET /{page-id}?fields=access_token` using a User token with `pages_manage_posts` scope.

## Inputs
| Field | Type | Required |
|---|---|---|
| `page_id` | string | ✓ |
| `approved_content` | string | ✓ |
| `media_urls` | array of strings (CDN URLs) | – |
| `link_url` | string (use `utm_url` from `epicgram-facebook-link-optimizer`) | – |
| `link_title_override` | string | – |
| `link_description_override` | string | – |
| `scheduled_time` | ISO 8601 datetime | – |
| `approval_token` | string | ✓ |

## Outputs
```json
{
  "publish_status": "scheduled | published | failed",
  "fb_post_id": "string",
  "post_url": "https://www.facebook.com/{page_id}/posts/{post_id}",
  "scheduled_at": "ISO8601 or null",
  "error_details": null
}
```

## Publish flows

### Text / link post
```
POST https://graph.facebook.com/v21.0/{page_id}/feed
Headers: Authorization: Bearer {FACEBOOK_PAGE_ACCESS_TOKEN}
Body: {
  "message": "<approved_content>",
  "link": "<link_url or omit>",
  "name": "<link_title_override or omit>",
  "description": "<link_description_override or omit>",
  "published": true,
  "scheduled_publish_time": <unix_timestamp or omit>
}
```

For scheduled posts: set `"published": false` and include `"scheduled_publish_time"` (Unix timestamp, minimum 10 minutes from now, maximum 30 days out).

### Native video post
```
POST https://graph-video.facebook.com/v21.0/{page_id}/videos
Body: {
  "file_url": "<CDN mp4 URL>",
  "description": "<approved_content>",
  "published": true,
  "scheduled_publish_time": <unix_timestamp or omit>
}
```
Returns `{ "id": "<video_id>" }`. Video undergoes processing (1–5 min) before appearing.

### Event creation
```
POST https://graph.facebook.com/v21.0/{page_id}/events
Body: {
  "name": "<event title>",
  "start_time": "<ISO8601>",
  "end_time": "<ISO8601 or omit>",
  "description": "<approved_content>",
  "location": "<optional>",
  "privacy_type": "OPEN | CLOSED | SECRET"
}
```

### Cross-post to linked Instagram Page
If Instagram is linked in Meta Business Suite:
```
Body addition: "instagram_feed_post": true
```
Publishes to both Facebook Page and linked Instagram feed in one call.

## Posting limits
- Max **25 posts/day** per Page — Facebook suppresses Pages that exceed this.
- Scheduled posts window: 10 minutes → 30 days from now.
- Video file: max 10GB, max 4 hours duration.

## Error handling
| Error code | Meaning | Action |
|---|---|---|
| `200` | Permissions missing | Re-check `pages_manage_posts` scope |
| `190` | Token expired or invalid | Refresh Page access token |
| `368` | Temporarily blocked (spam) | Wait 24h, review content for policy violations |
| `100` | Invalid parameter | Check `scheduled_publish_time` is valid Unix timestamp |
| `32` | Page request limit reached | Rate limit — wait before retrying |

## Safety
- Must verify `approval_token` before any write.
- Must call `epicgram-facebook-safe-mode` first — refuse if decision ≠ `allow`.
- Bulk publish default: `needs_approval` unless operator has explicitly enabled auto-approve.
- Log audit event: `{ event: "facebook_page_publish", post_id, page_id, status, operator, timestamp }`.

## Integration points
- Called by: `epicgram-multiposting-scheduler`
- Requires before calling: `epicgram-facebook-safe-mode`, `epicgram-review-and-approval`
- Link metadata from: `epicgram-facebook-link-optimizer`
- Content from: `epicgram-facebook-post-writer`
- Logs to: `POST /api/v1/audit`

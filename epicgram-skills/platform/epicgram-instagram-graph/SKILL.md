# epicgram-instagram-graph

## Description
Publishes content to Instagram (feed posts, reels, carousels, stories) and retrieves insights via the Instagram Graph API. Handles media upload, container creation, and publish confirmation. All publish calls are ORANGE-class and require prior approval.

## When to use
Load when:
- `epicgram-multiposting-scheduler` delegates an Instagram publish action.
- The operator asks to post to Instagram directly.
- Fetching Instagram account insights, reach, or post performance.

## Authentication

Requires a long-lived Instagram User Access Token stored as a secret:
```
INSTAGRAM_ACCESS_TOKEN=<secret>
INSTAGRAM_ACCOUNT_ID=<Instagram Business/Creator account ID>
```

Token must have scopes: `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`

## Publish Flow (Image or Reel)

### Step 1 — Create media container
```
POST https://graph.facebook.com/v21.0/{INSTAGRAM_ACCOUNT_ID}/media
Params:
  image_url OR video_url: <public CDN URL>
  caption: <from epicgram-caption-hashtags>
  media_type: IMAGE | REELS | CAROUSEL_ALBUM
  access_token: {INSTAGRAM_ACCESS_TOKEN}
```
Returns: `{ id: "<container_id>" }`

### Step 2 — Wait for container (video only)
For REELS: poll every 5s until `status_code` = `FINISHED`:
```
GET https://graph.facebook.com/v21.0/{container_id}?fields=status_code&access_token=...
```
Timeout: 10 minutes. If not FINISHED, mark as failed and alert.

### Step 3 — Publish container
```
POST https://graph.facebook.com/v21.0/{INSTAGRAM_ACCOUNT_ID}/media_publish
Params:
  creation_id: <container_id>
  access_token: {INSTAGRAM_ACCESS_TOKEN}
```
Returns: `{ id: "<post_id>" }` — store as `published_url` = `https://www.instagram.com/p/<shortcode>/`

## Carousel Publish

1. Create one container per image (repeat Step 1 for each child, add `is_carousel_item: true`).
2. Create parent container with `media_type: CAROUSEL_ALBUM` and `children: [id1, id2, ...]`.
3. Publish parent container.

## Insights

```
GET https://graph.facebook.com/v21.0/{post_id}/insights
Params:
  metric: impressions,reach,engagement,saved
  access_token: {INSTAGRAM_ACCESS_TOKEN}
```

## Error Handling

| Error code | Meaning | Action |
|---|---|---|
| 190 | Token expired | Alert operator to refresh token |
| 24 | No permission | Check required scopes |
| 9007 | Container not ready | Wait and retry (Step 2) |
| 2207019 | Video too long | Alert operator with duration limit |
| 2207026 | Aspect ratio error | Alert operator with required ratio |

## Safety

- All publish actions: **ORANGE class** via `epicgram-safe-mode`.
- Media URLs must be publicly accessible CDN URLs — not local file paths.
- Never post content that failed the brief's constraints check.
- Log every publish action to EPICGRAM audit trail.

## Integration points

- Called by: `epicgram-multiposting-scheduler`
- Receives captions from: `epicgram-caption-hashtags`
- Logs to: `POST /api/v1/audit`
- Publish result stored in: scheduler queue item `published_url`

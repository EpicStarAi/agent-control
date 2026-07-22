---
name: epicgram-facebook-connector
description: Hybrid connector for Facebook — Meta Marketing API MCP for ads, custom Graph API backend for organic Facebook Pages posting.
---

# epicgram-facebook-connector

## Summary
Facebook has two distinct API surfaces that require separate connectors: the **Marketing API** (for ad campaigns, boosted posts, ad sets) and the **Graph API Pages** endpoints (for organic page posts, comments, insights). A public MCP server covers the Marketing API; organic posting requires a custom backend module.

## Two connector modes

### Mode 1 — Ads (Meta Marketing API MCP)
**Ready to use**: `brijr/meta-ads-mcp`
- Repo: https://mcpservers.org/servers/brijr/meta-ads-mcp
- Covers: campaigns, ad sets, ad creatives, performance reports, audience insights
- Works for both Facebook and Instagram ad APIs

### Mode 2 — Organic Pages posting (custom backend)
**No public MCP** — build using Graph API Pages endpoints in `artifacts/api-server`.

## Setup — Meta Marketing API MCP (ads)

```bash
npx @brijr/meta-ads-mcp
```

ENV required:
| Variable | Source |
|---|---|
| `META_ACCESS_TOKEN` | Meta Business Suite → System User → access token |
| `META_AD_ACCOUNT_ID` | Business Manager → Ad Accounts (format: `act_XXXXXXXXXX`) |

MCP tools available:
| Tool | Description |
|---|---|
| `get_campaigns` | List all campaigns |
| `create_campaign` | Create a new campaign with objective |
| `get_ad_sets` | List ad sets in a campaign |
| `create_ad_creative` | Upload video/image creative |
| `get_performance_report` | Impressions, reach, clicks, CPM, ROAS |
| `get_audience_insights` | Age, gender, interest breakdown |

## Setup — Organic Pages posting (custom backend)

Add to `artifacts/api-server/src/routes/facebook.ts`:

```typescript
// POST a text + image/video to a Facebook Page
POST https://graph.facebook.com/v21.0/{PAGE_ID}/feed
Headers: Authorization: Bearer {PAGE_ACCESS_TOKEN}
Body: {
  message: "<caption from epicgram-caption-hashtags>",
  link?: "<optional URL>",
  scheduled_publish_time?: <unix timestamp>,
  published: false  // set true for immediate, false for scheduled
}
```

For video posts:
```typescript
// Step 1 — upload video
POST https://graph-video.facebook.com/v21.0/{PAGE_ID}/videos
Body: { file_url: "<CDN URL>", description: "<caption>", scheduled_publish_time?: <timestamp> }
// Returns: { id: "<video_id>" }
```

## ENV variables required (organic)
| Variable | Source |
|---|---|
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Meta Developer → Graph API Explorer → Page token |
| `FACEBOOK_PAGE_ID` | Page URL or Business Manager |

Page access tokens are long-lived (never expire if generated from a system user). For user-based tokens, exchange for long-lived using the same flow as Instagram (`fb_exchange_token`).

## EPICGRAM API endpoints (organic connector exposes these)

```
POST /api/facebook/post
  Body: { page_id, caption, media_url?, scheduled_time? }
  Returns: { post_id, permalink }

GET  /api/facebook/insights/:post_id
  Returns: { reach, impressions, engagement, shares }
```

## Skill → connector mapping

| EPICGRAM skill | Connector to use | Mode |
|---|---|---|
| `epicgram-facebook-pages` (organic post) | Custom backend → Graph API Pages | Organic |
| Facebook ad campaigns | Meta Marketing API MCP (brijr) | Ads |
| Cross-posting Instagram + Facebook | ig-mcp handles both via Graph API | Organic |

## Pro tip: cross-posting via Instagram Graph API
If you already have `epicgram-instagram-mcp` running, you can cross-post to a linked Facebook Page for free — Instagram Graph API supports `published_to_facebook: true` on feed posts when accounts are linked in Meta Business Suite. This avoids needing a separate Facebook connector for basic feed posts.

## Safety
- Organic posts: always pass through `epicgram-safe-mode` (ORANGE class) and `epicgram-review-and-approval`.
- Ad creation: always pass through `epicgram-safe-mode` (ORANGE/RED depending on budget) and operator approval.
- Page access tokens give full page admin access — treat as high-security secrets, rotate if any sign of compromise.
- Facebook has strict automated publishing policies — do not exceed 25 posts/day per page.

## Integration points
- Implements the "hands" for: `epicgram-facebook-pages`
- Ads mode used by: (future) `epicgram-facebook-ads` skill
- Backend lives in: `artifacts/api-server/src/routes/facebook.ts`
- Logs to: `POST /api/v1/audit`

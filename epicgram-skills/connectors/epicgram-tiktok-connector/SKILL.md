---
name: epicgram-tiktok-connector
description: Custom backend connector for TikTok organic publishing — no public MCP server exists for TikTok Content Posting API; this skill documents how to build and operate the EPICGRAM-native TikTok connector.
---

# epicgram-tiktok-connector

## Summary
TikTok does not have a reliable public MCP server for **organic content posting** (the Content Posting API is tightly gatekept). This connector skill documents the EPICGRAM-native approach: a backend module that calls TikTok's official APIs directly, wrapped as an internal service the `epicgram-tiktok-publisher` skill calls.

For **TikTok advertising analytics**, external MCP servers do exist and are documented in `references/ads-mcp.md`.

## TikTok API landscape

| API | Access | MCP available |
|---|---|---|
| Content Posting API (organic video) | Approved developers only, sandbox available | ❌ Build your own |
| Research API (public data, trends) | Application required | Partial (terrylinhaochen/tiktok_mcp) |
| Ads API (campaign, ad group, reports) | TikTok Business account | ✅ adsmcp/tiktok-ads-mcp-server |
| TikNeuron API (3rd party) | Paid subscription | ✅ seym0n/tiktok-mcp |

## Getting Content Posting API access

1. Go to [TikTok for Developers](https://developers.tiktok.com) → Apply for API Access
2. Select product: **Content Posting API**
3. Provide use case description (content management platform, not automation bot)
4. Approval: 1–4 weeks. Sandbox access granted immediately for testing.

Required scopes after approval: `video.publish`, `video.list`, `user.info.basic`

## EPICGRAM backend connector setup

The connector lives at `artifacts/api-server/src/routes/tiktok.ts` (or a new dedicated service).

### ENV variables
| Variable | Source |
|---|---|
| `TIKTOK_CLIENT_KEY` | TikTok Developer Portal → your app |
| `TIKTOK_CLIENT_SECRET` | TikTok Developer Portal → your app |
| `TIKTOK_ACCESS_TOKEN` | OAuth 2.0 PKCE flow (per-account) |
| `TIKTOK_REFRESH_TOKEN` | Same OAuth flow |

### OAuth 2.0 PKCE flow (one-time per account)

```bash
# Step 1 — authorization URL
https://www.tiktok.com/v2/auth/authorize/
  ?client_key={TIKTOK_CLIENT_KEY}
  &scope=video.publish,video.list,user.info.basic
  &response_type=code
  &redirect_uri=https://your-epicgram-server.com/auth/tiktok/callback
  &code_challenge={CODE_CHALLENGE}
  &code_challenge_method=S256
  &state={RANDOM_STATE}

# Step 2 — exchange code for tokens
POST https://open.tiktokapis.com/v2/oauth/token/
Body: {
  client_key, client_secret, code, grant_type: "authorization_code",
  redirect_uri, code_verifier
}
# Returns: access_token (expires in 24h), refresh_token (expires in 365 days)
```

### Token refresh (access token, every 24h)
```bash
POST https://open.tiktokapis.com/v2/oauth/token/
Body: { client_key, client_secret, grant_type: "refresh_token", refresh_token }
```

## EPICGRAM API endpoints (connector exposes these)

```
POST /api/tiktok/upload
  Body: { account_id, video_url, caption, hashtags[], privacy_setting, scheduled_time? }
  Returns: { publish_id, status }

GET  /api/tiktok/status/:publish_id
  Returns: { status: PROCESSING_UPLOAD|PROCESSING_DOWNLOAD|SUCCESS|FAILED }

GET  /api/tiktok/videos/:account_id
  Returns: { videos: [{ id, title, view_count, ... }] }
```

These are the endpoints `epicgram-tiktok-publisher` calls.

## Organic analytics (no Content Posting API needed)

For reading video metrics on published content, use TikTok's **Research API**:
```
POST https://open.tiktokapis.com/v2/video/list/
Headers: Authorization: Bearer {TIKTOK_ACCESS_TOKEN}
Body: { fields: ["id","view_count","like_count","share_count","comment_count"] }
```

Or use the `terrylinhaochen/tiktok_mcp` server for trend and hashtag data (no auth needed, uses scraping):
```bash
git clone https://github.com/terrylinhaochen/tiktok_mcp
cd tiktok_mcp && npm install && node server.js
# MCP tools: search_videos_by_hashtag, get_trending_hashtags, get_video_details
```

## Ads analytics (ready-to-use MCP)

For campaign performance data (if running TikTok Ads alongside organic):
- **TikTok Ads MCP Server**: https://mcpservers.org/servers/adsmcp/tiktok-ads-mcp-server
```bash
npx @adsmcp/tiktok-ads-mcp-server
# ENV: TIKTOK_APP_ID, TIKTOK_SECRET, TIKTOK_ACCESS_TOKEN (ads token)
```

## Safety
- Organic Content Posting API requires approved developer status — do not attempt to use without approval.
- Never use scraping-based approaches for posting (only for reading/analytics).
- Token rotation: access tokens expire in 24h — the connector must auto-refresh before each call.
- All publish calls must pass through `epicgram-tiktok-safe-mode` and `epicgram-review-and-approval`.

## Integration points
- Implements the "hands" for: `epicgram-tiktok-publisher`, `epicgram-tiktok-analytics`
- Backend lives in: `artifacts/api-server/src/routes/tiktok.ts`
- Reference: `epicgram-tiktok-publisher` (SKILL.md → API section)
- Logs to: `POST /api/v1/audit`

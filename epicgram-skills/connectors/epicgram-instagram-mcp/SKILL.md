---
name: epicgram-instagram-mcp
description: MCP connector for Instagram — bridges epicgram-instagram-graph and epicgram-instagram-comments-engager to a running ig-mcp or Instagram MCP Server instance.
---

# epicgram-instagram-mcp

## Summary
Sets up and routes Instagram operations through a real MCP server instead of direct HTTP calls. The MCP server handles Graph API auth, token refresh, and error mapping so the EPICGRAM skills only need to call MCP tools by name.

## Recommended MCP server

**Instagram MCP Server — aleemhaider** (24 tools, production-ready)
- Repo: https://github.com/aleemhaider/instagram-mcp
- Covers: publish, schedule, comments, DMs, insights, account management
- Alternative: **ig-mcp (jlbadano)** — https://github.com/jlbadano/ig-mcp

## Setup on VPS / Replit

```bash
# Clone and install
git clone https://github.com/aleemhaider/instagram-mcp
cd instagram-mcp
npm install

# Set env vars (never commit these)
export INSTAGRAM_ACCESS_TOKEN=<long-lived token>
export INSTAGRAM_ACCOUNT_ID=<Business/Creator account ID>

# Start MCP server
node server.js --port 3100
```

Or with Docker:
```bash
docker run -e INSTAGRAM_ACCESS_TOKEN=xxx -e INSTAGRAM_ACCOUNT_ID=yyy \
  -p 3100:3100 aleemhaider/instagram-mcp
```

## ENV variables required
| Variable | Source |
|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | Facebook Developer → Graph API Explorer → long-lived token |
| `INSTAGRAM_ACCOUNT_ID` | Instagram Business account numeric ID |

Required token scopes: `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `instagram_manage_comments`

Token lifetime: long-lived tokens last 60 days. Set up refresh via `GET /oauth/access_token?grant_type=ig_refresh_token`.

## MCP tool → EPICGRAM skill mapping

| EPICGRAM skill | MCP tool to call | Notes |
|---|---|---|
| `epicgram-instagram-graph` (publish image) | `publish_image` | Params: `image_url`, `caption` |
| `epicgram-instagram-graph` (publish reel) | `publish_reel` | Params: `video_url`, `caption`, `thumbnail_url` |
| `epicgram-instagram-graph` (publish carousel) | `publish_carousel` | Params: `media_urls[]`, `caption` |
| `epicgram-instagram-post-scheduler` | `schedule_post` | Params: `media_url`, `caption`, `scheduled_time` |
| `epicgram-instagram-analytics` | `get_insights` | Params: `post_id`, `metrics[]` |
| `epicgram-instagram-analytics` | `get_account_insights` | Params: `time_range` |
| `epicgram-instagram-comments-engager` | `get_comments` | Params: `post_id` |
| `epicgram-instagram-comments-engager` | `reply_to_comment` | Params: `comment_id`, `text` |
| `epicgram-instagram-comments-engager` | `delete_comment` | Params: `comment_id` |

## How to call from EPICGRAM skill chain

When `epicgram-instagram-graph` needs to publish, instead of calling the Graph API directly, call:

```
MCP server: http://localhost:3100 (or VPS URL)
Tool: publish_reel
Arguments: {
  "video_url": "<approved CDN URL>",
  "caption": "<from epicgram-instagram-feed-caption>",
  "thumbnail_url": "<optional>"
}
```

The MCP server handles the 3-step container flow (create → wait → publish) internally.

## Claude / Cursor / Gemini CLI integration

Add to your MCP client config:
```json
{
  "mcpServers": {
    "instagram": {
      "command": "node",
      "args": ["/path/to/instagram-mcp/server.js"],
      "env": {
        "INSTAGRAM_ACCESS_TOKEN": "<token>",
        "INSTAGRAM_ACCOUNT_ID": "<id>"
      }
    }
  }
}
```

## Safety
- All publish tool calls must be preceded by `epicgram-instagram-safe-mode` and `epicgram-review-and-approval`.
- Token value must never appear in logs, outputs, or skill responses — reference by env var name only.
- If MCP server returns a `403` or `invalid_token`, alert operator to refresh the token — do not retry with the same token.

## Integration points
- Implements the "hands" for: `epicgram-instagram-graph`, `epicgram-instagram-post-scheduler`, `epicgram-instagram-analytics`, `epicgram-instagram-comments-engager`
- Run alongside: main EPICGRAM API service
- Logs to: `POST /api/v1/audit` (wrap MCP responses before logging)

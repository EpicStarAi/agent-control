---
name: epicgram-instagram-mcp
description: MCP connector for Instagram — bridges epicgram-instagram-* skills to @mcpware/instagram-mcp (23 tools) via stdio transport. Configure once in .mcp.json, any MCP client (Claude Code, Cursor, Gemini CLI) spawns it automatically.
---

# epicgram-instagram-mcp

## Summary
Connects EPICGRAM Instagram skills to the real Instagram Graph API through `@mcpware/instagram-mcp` — a 23-tool MCP server installed at `node_modules/@mcpware/instagram-mcp`.

**Transport**: stdio (not HTTP). Each MCP client spawns the server as a child process and communicates via stdin/stdout. No separate port or service needed.

## Package

```
@mcpware/instagram-mcp@1.0.4  (installed at workspace root)
entry: node_modules/@mcpware/instagram-mcp/dist/index.js
```

## Project-level MCP config (`.mcp.json` at workspace root)

Already created. Content:
```json
{
  "mcpServers": {
    "instagram": {
      "command": "node",
      "args": ["node_modules/@mcpware/instagram-mcp/dist/index.js"],
      "env": {
        "INSTAGRAM_ACCESS_TOKEN": "${INSTAGRAM_ACCESS_TOKEN}",
        "INSTAGRAM_API_VERSION": "v21.0"
      }
    }
  }
}
```

Claude Code and Cursor read `.mcp.json` automatically from the project root — no additional setup needed in the IDE.

## ENV variables required

| Variable | Description | Where to get |
|---|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | 60-day Meta long-lived token | See `references/meta-setup-guide.md` |
| `INSTAGRAM_ACCOUNT_ID` | Instagram Business account numeric ID | Step 5 of setup guide |

Set both as Replit secrets (Settings → Secrets), never hard-code.

## 23 available MCP tools

### Publishing
| Tool | Description |
|---|---|
| `publish_image` | Publish a single image post |
| `publish_reel` | Publish a Reel (video ≤90s) |
| `publish_carousel` | Publish multi-image/video carousel |
| `schedule_post` | Schedule any post for a future time |
| `get_scheduled_posts` | List all scheduled posts |
| `delete_scheduled_post` | Cancel a scheduled post |

### Content & Account
| Tool | Description |
|---|---|
| `get_posts` | List published posts |
| `get_post_details` | Single post with metrics |
| `get_stories` | List active stories |
| `get_account_info` | Profile, followers, bio |
| `search_hashtag` | Hashtag metadata and post count |
| `get_hashtag_posts` | Top/recent posts for a hashtag |

### Comments & DMs
| Tool | Description |
|---|---|
| `get_comments` | List comments on a post |
| `reply_to_comment` | Reply to a comment |
| `delete_comment` | Delete a comment |
| `hide_comment` | Hide (not delete) a comment |
| `get_conversations` | List DM threads |
| `get_messages` | Messages in a thread |
| `send_message` | Send a DM |

### Analytics
| Tool | Description |
|---|---|
| `get_insights` | Post-level metrics (reach, impressions, saves, shares) |
| `get_account_insights` | Account-level metrics over a time range |
| `get_audience_demographics` | Age, gender, location breakdown |
| `get_top_posts` | Best-performing posts by metric |

## EPICGRAM skill → MCP tool mapping

| EPICGRAM skill | MCP tool | Required params |
|---|---|---|
| `epicgram-instagram-graph` (image) | `publish_image` | `image_url`, `caption` |
| `epicgram-instagram-graph` (reel) | `publish_reel` | `video_url`, `caption`, `thumbnail_url?` |
| `epicgram-instagram-graph` (carousel) | `publish_carousel` | `media_urls[]`, `caption` |
| `epicgram-instagram-post-scheduler` | `schedule_post` | `media_url`, `caption`, `scheduled_time` |
| `epicgram-instagram-analytics` | `get_insights` | `post_id`, `metrics[]` |
| `epicgram-instagram-analytics` | `get_account_insights` | `start_date`, `end_date` |
| `epicgram-instagram-comments-engager` | `get_comments` | `post_id` |
| `epicgram-instagram-comments-engager` | `reply_to_comment` | `comment_id`, `text` |
| `epicgram-instagram-comments-engager` | `delete_comment` | `comment_id` |
| `epicgram-instagram-comments-engager` | `hide_comment` | `comment_id` |

## How a skill calls an MCP tool

When `epicgram-instagram-graph` needs to publish a Reel, the calling agent does:

```
Use MCP tool: publish_reel
Arguments: {
  "video_url": "<approved CDN URL from epicgram-tiktok-video-assembly output>",
  "caption": "<text from epicgram-instagram-feed-caption>",
  "thumbnail_url": "<optional>"
}
```

The MCP server handles the 3-step Graph API flow (create container → wait → publish) internally and returns the published `media_id` and `permalink`.

## Token auto-refresh reminder

Long-lived tokens expire in **60 days**. Set a calendar reminder or cron job:
```bash
# Weekly check — runs every Monday at 9am
0 9 * * 1 curl -s "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=$INSTAGRAM_ACCESS_TOKEN" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); if(d.access_token) console.log('Token refreshed'); else console.error('Refresh failed:', d);"
```

Full refresh instructions: `references/token-refresh.md`

## Safety
- All publish tool calls must be preceded by `epicgram-instagram-safe-mode` (decision = `allow`) and `epicgram-review-and-approval`.
- Never log the token value — reference as `$INSTAGRAM_ACCESS_TOKEN` only.
- If any tool returns `190` (invalid token) → surface to operator, do not retry.

## Integration points
- Implements the "hands" for: `epicgram-instagram-graph`, `epicgram-instagram-post-scheduler`, `epicgram-instagram-analytics`, `epicgram-instagram-comments-engager`
- Config file: `.mcp.json` (workspace root)
- Setup guide: `references/meta-setup-guide.md`
- Token refresh: `references/token-refresh.md`

---
name: epicgram-youtube-mcp
description: MCP connector for YouTube — bridges epicgram-youtube-shorts-publisher, epicgram-youtube-video-publisher, and epicgram-youtube-analytics to a running youtube-mcp-server instance.
---

# epicgram-youtube-mcp

## Summary
Sets up and routes YouTube operations through an MCP server. Handles OAuth token management and Data API v3 calls for upload, metadata, analytics, and comments — so EPICGRAM skills call MCP tools by name, not raw HTTP.

## Recommended MCP server

**youtube-mcp-server — ZubeidHendricks** (Shorts, analytics, video management)
- Repo: https://github.com/ZubeidHendricks/youtube-mcp-server
- Covers: video upload, Shorts creation, playlist management, analytics, comments

**Alternative (data/analytics focus):**
- **youtube-mcp-server — dannySubsense** (14 functions): https://github.com/dannySubsense/youtube-mcp-server
- **YouTube Data API MCP — kirbah**: https://mcp.directory/servers/youtube-data-api

## Setup on VPS / Replit

```bash
# Clone and install
git clone https://github.com/ZubeidHendricks/youtube-mcp-server
cd youtube-mcp-server
npm install

# Set env vars
export YOUTUBE_CLIENT_ID=<OAuth 2.0 client ID>
export YOUTUBE_CLIENT_SECRET=<OAuth 2.0 client secret>
export YOUTUBE_REFRESH_TOKEN=<refresh token from OAuth flow>

# Start MCP server
node index.js --port 3101
```

## OAuth setup (one-time)

YouTube requires OAuth 2.0 with user consent (not a simple API key) for upload operations.

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (type: Web application)
3. Add redirect URI: `http://localhost:8080/callback` (for local consent flow)
4. Enable **YouTube Data API v3** in the project
5. Run the OAuth consent flow once to get a refresh token:

```bash
# Many MCP servers include an auth helper:
node auth.js
# Follow the browser prompt, paste the code, get refresh_token
```

Store the refresh token in your secrets manager — it doesn't expire unless revoked.

## ENV variables required
| Variable | Source |
|---|---|
| `YOUTUBE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 credentials |
| `YOUTUBE_CLIENT_SECRET` | Google Cloud Console → OAuth 2.0 credentials |
| `YOUTUBE_REFRESH_TOKEN` | One-time OAuth consent flow |

Required scopes: `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube`, `https://www.googleapis.com/auth/yt-analytics.readonly`

## MCP tool → EPICGRAM skill mapping

| EPICGRAM skill | MCP tool to call | Notes |
|---|---|---|
| `epicgram-youtube-shorts-publisher` | `upload_short` | Params: `video_url`, `title`, `description`, `tags[]` |
| `epicgram-youtube-video-publisher` | `upload_video` | Params: `video_url`, `title`, `description`, `tags[]`, `playlist_id` |
| `epicgram-youtube-video-publisher` | `set_thumbnail` | Params: `video_id`, `thumbnail_url` |
| `epicgram-youtube-video-publisher` | `add_to_playlist` | Params: `video_id`, `playlist_id` |
| `epicgram-youtube-analytics` | `get_video_analytics` | Params: `video_id`, `metrics[]`, `start_date`, `end_date` |
| `epicgram-youtube-analytics` | `get_channel_analytics` | Params: `time_range` |
| `epicgram-youtube-comments-engager` | `get_comments` | Params: `video_id` |
| `epicgram-youtube-comments-engager` | `reply_to_comment` | Params: `comment_id`, `text` |
| `epicgram-youtube-comments-engager` | `pin_comment` | Params: `comment_id` |

## Scheduled publish
The MCP server passes `publishAt` (ISO 8601) in the video status. YouTube auto-publishes at that time. Minimum: 15 minutes from now. Maximum: 7 days out.

## Quota management
YouTube Data API v3 has a **10,000 units/day** default quota.

| Operation | Cost |
|---|---|
| Video upload | 1600 units |
| Get video analytics | 1 unit |
| Set thumbnail | 50 units |
| Add to playlist | 50 units |
| List channel videos | 1 unit |

Daily budget at default quota: ~6 uploads/day. Request quota increase in Google Cloud Console if needed.

## Claude / Cursor / Gemini CLI integration

```json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["/path/to/youtube-mcp-server/index.js"],
      "env": {
        "YOUTUBE_CLIENT_ID": "<id>",
        "YOUTUBE_CLIENT_SECRET": "<secret>",
        "YOUTUBE_REFRESH_TOKEN": "<token>"
      }
    }
  }
}
```

## Safety
- All publish/upload calls must be preceded by `epicgram-youtube-safe-mode` and `epicgram-review-and-approval`.
- `made_for_kids` field must be explicitly set on every upload — if missing, `epicgram-youtube-safe-mode` must block.
- If MCP server returns quota errors, surface to operator immediately — do not retry within the same day.
- Refresh token must never appear in skill outputs or logs.

## Integration points
- Implements the "hands" for: `epicgram-youtube-shorts-publisher`, `epicgram-youtube-video-publisher`, `epicgram-youtube-analytics`, `epicgram-youtube-comments-engager`
- Logs to: `POST /api/v1/audit`

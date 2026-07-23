# TikTok Ads MCP Server — Setup & Tool Reference

Use this when running TikTok advertising campaigns alongside organic content.

## Server
- **adsmcp/tiktok-ads-mcp-server**: https://mcpservers.org/servers/adsmcp/tiktok-ads-mcp-server
- Run: `npx @adsmcp/tiktok-ads-mcp-server`

## Required ENV (Ads API, separate from organic)
```
TIKTOK_APP_ID=<from TikTok Business Center>
TIKTOK_SECRET=<from TikTok Business Center>
TIKTOK_ACCESS_TOKEN=<Ads Manager access token>
TIKTOK_ADVERTISER_ID=<advertiser ID>
```

## Available MCP tools
| Tool | Description |
|---|---|
| `get_campaigns` | List all ad campaigns |
| `create_campaign` | Create a new campaign |
| `get_ad_groups` | List ad groups in a campaign |
| `get_ad_performance` | Metrics: impressions, clicks, CTR, CPM, conversions |
| `get_audience_insights` | Demographics, interests, behaviors |
| `get_creative_report` | Performance by creative (video) |

## Organic vs Ads — key distinction

| | Organic | Ads |
|---|---|---|
| API | Content Posting API | Marketing API |
| Token | User access token (PKCE) | Advertiser access token |
| MCP available | ❌ custom needed | ✅ adsmcp |
| Publish | Upload video to profile | Upload as ad creative |

Do not mix tokens. Organic tokens cannot call Ads API endpoints and vice versa.

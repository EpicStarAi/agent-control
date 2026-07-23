# epicgram-telegram-client-ops

## Description
Handles all Telegram operations within EPICGRAM: sending messages and posts to channels/groups/DMs, reading chat lists, managing bots, scheduling Telegram-native content, and handling Telegram-specific formatting. Bridges EPICGRAM's AI operator to the TDLib-powered backend.

## When to use
Load when:
- `epicgram-multiposting-scheduler` delegates a Telegram publish action.
- The operator asks to send, schedule, or edit a Telegram message.
- Reading chats, accounts, or bot lists from the EPICGRAM API.
- Configuring a bot's commands or webhook.
- Any direct Telegram action from within the workspace.

## Safety Policy

| Action | Safety class |
|---|---|
| Read chats / list messages | GREEN |
| Send to a bot or personal chat (operator only) | YELLOW |
| Send to a channel or group | ORANGE |
| Bulk-send to multiple targets | RED |
| Delete messages in a channel | ORANGE |
| Edit published channel message | ORANGE |

Always call `epicgram-safe-mode` before any YELLOW/ORANGE/RED action.

## EPICGRAM API Endpoints

The EPICGRAM API runs at the URL configured in `api-server`. Prefix all calls with the API base URL.

### Accounts
```
GET  /api/v1/accounts                    — list all accounts
GET  /api/v1/accounts/:id                — account detail + TDLib status
```

### Chats
```
GET  /api/telegram/chats                 — list chats for active account
GET  /api/telegram/chats/:chatId/messages — recent messages
```

### Send message
```
POST /api/telegram/send
Body: {
  "account_id": "<id>",
  "chat_id":    "<numeric chat id or @username>",
  "text":       "<message text with Markdown>",
  "parse_mode": "Markdown | HTML | null",
  "schedule_date": "<unix timestamp or null>"
}
```

### Edit message
```
POST /api/telegram/edit
Body: { "account_id", "chat_id", "message_id", "text", "parse_mode" }
```

### Delete message
```
POST /api/telegram/delete
Body: { "account_id", "chat_id", "message_id" }
```

### Bots
```
GET  /api/v1/bots                        — list registered bots
POST /api/v1/bots                        — register a new bot token
```

## Telegram Formatting

Markdown (Telegram v1):
- `**bold**` → `*bold*`
- `_italic_`
- `` `code` ``
- `[link text](url)`

HTML mode (more reliable for nested formatting):
- `<b>bold</b>`, `<i>italic</i>`, `<code>code</code>`, `<a href="url">link</a>`

Do not mix Markdown and HTML in the same message.

## Channel Post Flow

1. Retrieve account list → confirm account with active TDLib session.
2. Confirm target chat ID (use numeric ID, not @username, for private channels).
3. Format message text using caption from `epicgram-caption-hashtags`.
4. Call `epicgram-safe-mode` → ORANGE classification.
5. Present approval card via `epicgram-review-and-approval`.
6. On approval: `POST /api/telegram/send`.
7. Confirm successful send (message_id returned). Store in scheduler queue.
8. Log to audit trail.

## Error Handling

| Error | Meaning | Action |
|---|---|---|
| `SESSION_NOT_FOUND` | TDLib session inactive | Prompt operator to reconnect account in ☠️ tab |
| `CHAT_WRITE_FORBIDDEN` | Bot/account lacks post permission | Alert operator |
| `FLOOD_WAIT_N` | Telegram rate limit | Wait N seconds, then retry once |
| `MESSAGE_TOO_LONG` | Text > 4096 chars | Truncate or split into parts |
| `PEER_ID_INVALID` | Wrong chat ID format | Ask operator to confirm chat ID |

## Scheduling (Telegram native)

Pass `schedule_date` as a Unix timestamp to Telegram's native scheduler (≥10 minutes in the future). Telegram shows the post in the channel's scheduled tab.

## Integration points

- Called by: `epicgram-multiposting-scheduler`
- Receives captions from: `epicgram-caption-hashtags`
- Requires: `epicgram-safe-mode`, `epicgram-review-and-approval`
- Backend: EPICGRAM API (TDLib-powered, `services/api/src/server.mjs`)
- Logs to: `POST /api/v1/audit`

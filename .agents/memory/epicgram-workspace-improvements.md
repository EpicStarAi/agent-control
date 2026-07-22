---
name: EPICGRAM workspace improvements
description: Real message history, direct send compose, AI persistent memory, new tools (search_chats, get_workspace_stats), audit log viewer — key constraints and decisions.
---

## Message history (TelegramWorkspace.tsx)
- GET `/telegram/messages?chatId=X&accountId=Y&limit=30` — TDLib returns newest-first; reverse array before rendering (oldest at top).
- `fromMessageId` param passed for "load more" pagination; endpoint may or may not support it — graceful fallback if not.
- Type: `TgMessage = { id, senderId, content, date }` — content is already plain text from tdlib-adapter (no raw entities).
- `/telegram/photo?accountId=X&fileId=Y` exists for photo rendering — not yet used in chat bubbles, ready for next iteration.

**Why:** The API already had the route; the workspace was just showing a placeholder saying history was read-only.

## Direct compose (TelegramWorkspace.tsx)
- `directSend()` calls POST `/telegram/send` with `operatorApproved: true` — same gate as AI-draft approval path.
- AI-draft approval UI takes over the compose panel when `draftState.text` is set; otherwise the direct textarea is shown.
- Enter = send, Shift+Enter = newline; sent messages append to `sentByChat` state for immediate visual feedback before re-fetch.

**Why:** The textarea was hardcoded-disabled; the send endpoint was already fully functional.

## AI persistent memory (operator-chat.ts + server.mjs)
- `conversationId: "ai_operator_main"` sent from `GlobalAIOperatorSidebar.tsx` in every request body.
- Memory fetched from `GET ${API_BASE}/ai/memory?conversationId=X&limit=12` before agent loop; injected as a block at the end of the system prompt.
- Memory saved via `POST ${API_BASE}/ai/memory` (newly added route in server.mjs) after final streamed response (fire-and-forget).
- `appendMemory` was already in `memory-store.mjs` but not exported from `server.mjs` — added to import and added POST handler.

**Why:** `memory-store.mjs` was used only by the legacy `operator-agent.mjs`; `operator-chat.ts` had zero cross-session memory.

## New AI tools (operator-chat.ts)
- `search_chats` — fetches all chats then filters by `.title` or `.username` containing the query; returns up to `limit` (default 15) results.
- `get_workspace_stats` — fetches `/telegram/status` + `/telegram/chats` to return total chats, unread count, by-category breakdown, accounts.
- Both added to `TOOL_LABELS` in `GlobalAIOperatorSidebar.tsx`.

## Audit log viewer (TelegramWorkspace.tsx CommandCenter)
- Added "audit" tab to `CC_TABS`; lazy-loads `/ai/audit?n=50` when tab first opened.
- Note: the audit endpoint param is `n`, NOT `limit` — fixed in `operator-chat.ts` `get_audit_log` tool call too.

# Event Bus (design — P19)

REST is fine for request/response, but clients and the AI operator need **push**. The Event Bus streams runtime changes so Web/Desktop/Android/AI-operator react instantly instead of polling.

## Transport
- **SSE** (`GET /api/v1/runtime/events`) — primary. Simple over the existing Node HTTP server, one-way server→client, auto-reconnect. `text/event-stream`, heartbeat every ~15s.
- **WebSocket** (`/api/v1/runtime/ws`) — later, for bidirectional (typing, live control).
- Capability flags: `capabilities.events.sse` / `.websocket` (see CAPABILITIES.md).

## Event envelope
```json
{ "id": "evt_...", "ts": "2026-07-01T13:00:00Z", "runtime": "telegram",
  "type": "message.new", "accountId": "account-...", "data": { } }
```

## Event catalog (v1)
```
session.changed        active slot / auth-state changed
account.updated        slot metadata changed (premium, storage, name)
dialog.updated         chat moved/read/pinned
message.new            new incoming message
message.sent           outgoing send confirmed
download.progress      file download %  (data: {fileId, pct})
upload.progress        file upload %
operator.started       operator action began
operator.blocked       action blocked by Approval Gate / Kill Switch
workflow.finished      automation/workflow completed
runtime.locked         Kill Switch engaged
```

## Server model
- `services/api/src/event-bus.mjs`: `subscribe(res)` registers an SSE client; `publish(event)` fans out to all subscribers. In-memory now; Redis pub/sub later for multi-process.
- Runtimes call `publish(...)` on state transitions (e.g. `selectAccountSlot` → `session.changed`).

## Client model
Open one SSE connection, dispatch by `type`. No polling loops. Filter by `runtime`/`accountId` client-side. On disconnect, browser auto-reconnects; server replays nothing (clients re-fetch state via REST on reconnect).

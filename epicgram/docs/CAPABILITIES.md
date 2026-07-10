# Capability API

Clients adapt the UI by **declared capability**, never by device string. No `if (android)` / `if (desktop)` / `if (telegram)`. The server tells the client what it can do; the client renders accordingly.

## Endpoint (live)
`GET /api/v1/system/capabilities`
```json
{
  "platform": "epic-gram",
  "apiVersion": "v1",
  "runtimes": { "telegram": true, "browser": false, "discord": false,
                "whatsapp": false, "signal": false, "localAi": false, "cloudAi": false },
  "capabilities": {
    "accounts": true, "multiAccount": true, "instantSwitch": true,
    "auth": { "qr": true, "phone": true, "twoFa": true },
    "telegram": { "dialogs": true, "messages": true, "send": true, "devices": true,
                  "storageStats": true, "folders": false, "voiceCalls": false, "stories": false },
    "ai": { "operator": true, "suggest": true, "memory": true, "publisher": true, "workflows": false },
    "events": { "sse": false, "websocket": false },
    "plugins": false
  }
}
```

## Rules
- A feature ships as `false` until it's real; flip to `true` when implemented + in `openapi.yaml`.
- Clients MUST hide/disable UI for `false` capabilities rather than erroring.
- New capabilities are additive (never remove/rename under v1 — see API.md freeze).
- Runtime availability (`runtimes.*`) and feature availability (`capabilities.*`) are separate axes.

## Why
One code path across Web/Desktop/Android/iOS/WebApp. Rolling a feature out = flip a flag server-side; every client picks it up with no release.

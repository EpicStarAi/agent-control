# Runtime Model

A **runtime** is a channel/engine EPIC GRAM can drive. Telegram is the first; browser, discord, whatsapp, local-ai, cloud-ai follow. Each runtime is isolated and exposed under a stable namespace.

## Namespace
```
/api/v1/runtime/telegram/*     ← canonical
/api/v1/runtime/browser/*
/api/v1/runtime/discord/*
/api/v1/runtime/whatsapp/*
/api/v1/runtime/local-ai/*
/api/v1/runtime/cloud-ai/*
```
`/api/v1/telegram/*` exists as a **pre-freeze alias** to `/api/v1/runtime/telegram/*` so no client breaks during migration.

## Telegram runtime (live)
- `services/api/src/telegram-runtime.mjs` — multi-account **slots**: create/select/remove, status, account detail. State in `.epicgram/telegram-runtime.json` (atomic writes, serialized via a state lock).
- `services/api/src/tdlib-adapter.mjs` — one TDLib client **per slot**, isolated session dir `%LOCALAPPDATA%/EPICGRAM/tdlib/accounts/<slot>`. Auth (qr/phone/code/2fa/reset), chats, messages, send, account detail (getMe/storage/devices/statistics).
- Adapter is `tdl` + `prebuilt-tdlib` (native tdjson).

## Contract a runtime must expose
```
status              ready / auth-state / active slot
accounts            list · {slot} · switch · logout · (backup/export/delete)
dialogs|messages    read
send                write (Approval-gated)
devices|storage|statistics   read-only introspection
events              emits to the Event Bus (see EVENTS.md)
```

## Adding a new runtime
1. Implement an adapter module `services/api/src/runtime-<name>.mjs` exposing the contract above.
2. Register routes under `/v1/runtime/<name>/*` in `server.mjs`.
3. Add its methods to `openapi.yaml`.
4. Flip its flag in `GET /v1/system/capabilities` → `runtimes.<name>`.
5. Emit runtime events to the Event Bus. No core/UI changes required — the UI adapts by capability.

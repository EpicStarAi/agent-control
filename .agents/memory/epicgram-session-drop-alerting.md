---
name: EPICGRAM Telegram session drop alerting
description: How unexpected TDLib auth-state drops are surfaced to the owner (backend + frontend), for future alerting/notification work.
---

Unexpected drop = previous authorizationState was `authorizationStateReady` and the
new state (from TDLib's own polling, not an owner-initiated logout) is anything else.
This distinction (background sync drop vs. explicit `removeAccountSlot`/logout action)
matters because the owner should not get alarmed by their own deliberate logout.

**Why:** real Telegram login went live tied to the owner's personal account; a silent
drop (remote logout/ban/expiry) previously surfaced only if the owner happened to check
the UI. There was no existing centralized notification system in the frontend to hook
into — component-local `toast`/`flash` states only.

**How to apply:** the SSE event bus (`event-bus.mjs`, `/v1/runtime/events`) is the
transport already used for account/session events — reuse it (extra `unexpectedDrop`
boolean field on `auth.state_changed`) rather than adding a second channel. On the
frontend, `useTelegramSessionWatchdog.ts` owns the single SSE subscription for alerting
so multiple components don't each open their own EventSource; other components should
read the module-level alert state rather than re-subscribing to the raw stream.

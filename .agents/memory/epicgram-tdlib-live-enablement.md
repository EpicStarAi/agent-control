---
name: EPICGRAM TDLib live enablement
description: How real Telegram login was turned on for the managed EPICGRAM preview, and what actually gates it.
---

Real Telegram login is enabled by setting three things as **real env vars/secrets** (not by editing `epicgram/.env.local`, which is only used as a fallback default): `EPICGRAM_TDLIB_ENABLED=true` (shared env var), plus `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, and `EPICGRAM_TDLIB_DATABASE_KEY` (secrets, requested from the owner via `requestSecrets` — never invented or hardcoded).

**Why:** `epicgram/services/api/src/env.mjs` (`loadLocalEnv`) only fills a key from `.env.local` if `process.env[key]` is still `undefined`, so real secrets/env vars always take priority over the checked-in placeholder defaults. `tdlibConfigured()` in `telegram-runtime.mjs` checks exactly these four things — flip all four and the backend's TDLib adapter goes live immediately, no code change needed. The `EPICGRAM_REPLIT_SANDBOX` / `EPICGRAM_ENABLE_LIVE_TELEGRAM` / `EPICGRAM_DISABLE_SEND` flags in `.env.local` are documentation-only — grep shows they are not referenced anywhere in the backend code, so don't rely on them as a real gate.

**How to apply:** The actual send-safety gate is independent and already server-side: `sendMessage()` in `telegram-runtime.mjs` requires `operatorApproved===true` unless `EPICGRAM_AI_SEND_MODE=auto_send` (never shipped) — this is enforced regardless of TDLib being live, and the proxy (`artifacts/api-server/src/routes/epicgram-proxy.ts`) intentionally does not weaken it. Verified end-to-end after enabling: `/telegram/status` reports `tdlibConfigured:true` with a loaded native `tdl` adapter, `/telegram/auth/qr` returns a real `tg://login?token=...` deep link through both the raw backend and the proxy, and `/telegram/send` without `operatorApproved` still returns 412. Full login (scanning the QR) requires the owner's own phone and cannot be completed by an agent.

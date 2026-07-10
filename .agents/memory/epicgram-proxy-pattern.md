---
name: EPICGRAM proxy artifact pattern
description: Porting the Next.js EPICGRAM app to a react-vite artifact while keeping the real Telegram backend service untouched, and how the mutating-route allowlist is decided.
---

The `artifacts/epicgram-web` artifact reaches the real backend (`epicgram/services/api/src/server.mjs`) only through `artifacts/api-server/src/routes/epicgram-proxy.ts`. The backend itself is never modified — the proxy is the only integration point.

## Mutating-route allowlist decision
The proxy defaults to GET/HEAD-only, plus a reviewed allowlist of specific mutating paths (auth flow, account slot management, logout, `/telegram/send`, draft-reject/schedule-approve).

**Why:** the backend already enforces its own send-safety gates independent of the proxy — `sendMessage()` in `telegram-runtime.mjs` requires TDLib to be configured (`EPICGRAM_TDLIB_ENABLED=true` + real credentials) AND an explicit `operatorApproved=true` unless `EPICGRAM_AI_SEND_MODE=auto_send` (never shipped). So forwarding `/telegram/send` through the proxy doesn't weaken safety — the backend gate stays authoritative regardless of what the proxy allows through. Routes with no such independent backend gate (production/live-send toggles, infra/docker/ollama control) are kept proxy-blocked since the proxy is currently the only guard for those.

**How to apply:** when adding a new mutating route to the allowlist, check whether the backend has its own authorization/approval gate for it. If yes, forwarding is low-risk. If no, either add a backend-side gate first or leave it proxy-blocked.

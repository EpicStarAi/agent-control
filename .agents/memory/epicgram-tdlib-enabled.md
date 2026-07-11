---
name: EPICGRAM TDLib enabled flag
description: EPICGRAM_TDLIB_ENABLED env var status and required restart behavior
---

`EPICGRAM_TDLIB_ENABLED=true` is set in the shared Replit environment (not .env.local).

**Why:** Without this flag, `tdlibConfigured()` returns false and all TDLib calls short-circuit to "not_configured". The secrets (TELEGRAM_API_ID, TELEGRAM_API_HASH, EPICGRAM_TDLIB_DATABASE_KEY) can all be present but TDLib stays disabled.

**How to apply:** After setting this env var (or any env var the EPICGRAM API reads at startup), the `EPICGRAM API` workflow must be restarted — it reads env vars at process start, not dynamically.

Also set at the same time:
- `OPENAI_MODEL=gpt-5.4-mini` — model for AI Operator (read by operator-chat.ts)
- `OPENAI_FALLBACK_MODEL=gpt-5.4-mini` — fallback if primary model 404s
- `OPENAI_MAX_OUTPUT_TOKENS=2048`

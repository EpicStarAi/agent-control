# EPIC💀CLAW AI P0 — Slice 1

## Implemented

- Policy-aware Tool Registry with L0–L5 risk levels.
- Environment kill switches default to disabled writes.
- Real TDLib read tools:
  - `telegram.get_status`
  - `telegram.list_chats`
  - `telegram.get_messages`
- Initial runtime composition with audit hooks.
- Safety tests for observe mode, approvals, Telegram send kill switch, and forbidden tools.

## Required environment

```env
TELEGRAM_SEND_ENABLED=false
TELEGRAM_MUTATION=false
BROWSER_WRITE_ENABLED=false
AGENT_AUTONOMY=observe
```

## Security invariants

1. L5 tools never execute.
2. `AGENT_AUTONOMY=observe` permits only L0 read tools.
3. A forged approval cannot bypass a disabled kill switch.
4. L3/L4 actions require explicit approval even when the capability switch is enabled.
5. Tool metadata is exposed without executor functions.
6. Every execution attempt passes through the registry policy check before its executor.

## Not included

- No server routes wired yet.
- No OpenRouter calls.
- No database migrations.
- No Telegram send or mutation tools.
- No production/VPS/nginx/PM2 changes.

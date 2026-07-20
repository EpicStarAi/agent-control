# EPICGRAM client P0 release branch

Branch: `release/epicgram-client-p0`

## Summary

- Enforced authenticated, owner-matched Telegram access for client/operator routes.
- Blocked client-trusted Telegram mutation flags and legacy singleton session leakage.
- Added persistent PostgreSQL scheduler table and server-side scheduler executor.
- Isolated demo/legacy operator endpoints from the production Telegram client path.
- Added owner-scoped `/api/operator/publish/channels` backed by the bound TDLib account.
- Fixed Telegram binding route contract to match the backend auth routes:
  `/telegram/auth/qr`, `/telegram/auth/phone`, `/telegram/auth/code`, `/telegram/auth/2fa`.
- Added `npm run test` to CI and removed a legacy NOVIKOVA candidate workflow check.

## Verification

- `npm run test`
- `npm run build`
- Local backend smoke:
  - `GET http://127.0.0.1:8788/health`
  - `GET http://127.0.0.1:8788/v1/accounts`

## Not Completed

- GitHub push/PR creation is blocked in this WSL environment by missing GitHub credentials.
- Full live Telegram E2E was not run because `EPICGRAM_E2E_COOKIE`,
  `LIVE_TEST_PRIVATE_CHAT_ID`, and `LIVE_TELEGRAM_E2E=true` are not configured in the shell.
- PostgreSQL scheduler runtime execution requires `DATABASE_URL` and `SCHEDULER_ENABLED=true`.

## Production Safety

Production was not deployed or modified. Real Telegram sends remain gated by
server-side mutation flags, owner-matched binding, chat ownership verification,
server-issued approval, payload hash matching, and single-use approval consumption.

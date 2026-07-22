# EPICGRAM Replit staging gateway

The Replit frontend does not store or receive TDLib session files. Telegram data remains on the VPS and is exposed through a read-only, owner-scoped gateway.

## Replit secrets

Import `EpicStarAi/agent-control`, then check out the `replit/epicgram-client-dev` branch. The committed `.replit` file configures Preview and Publishing on port 3015.

Set these values in the Replit Development Secrets UI and repeat them in Publishing deployment secrets:

```env
EPICGRAM_API_BASE_URL=https://epicgram-stage.194-163-140-26.sslip.io
EPICGRAM_BACKEND_SERVICE_TOKEN=<gateway token>
EPICGRAM_STAGING_OWNER_MODE=true
EPICGRAM_STAGING_OWNER_ACCOUNT_ID=owner
TELEGRAM_MUTATION=false
```

The gateway token must never be committed to Git. The public alias `owner` is deliberately not the real TDLib slot id.

## Gateway policy

Allowed:

- `GET /health`
- `GET /telegram/status`
- `GET /telegram/accounts`
- `GET /v1/accounts`
- `GET /v1/accounts/current`
- `GET /telegram/chats`
- `GET /telegram/messages`
- `GET /telegram/photo`
- `GET /telegram/file/...`

All non-GET requests and all other routes are denied. The gateway overwrites every account id with the configured VPS-side owner slot.

## Rollback

Stop and disable `epicgram-staging-gateway`, remove its nginx site, test nginx, then reload nginx. This does not require restarting `epicgram-api` or `epicgram-web`.

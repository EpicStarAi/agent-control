# EPICGRAM Replit staging gateway

The Replit frontend never receives TDLib database files, Telegram credentials or real VPS slot identifiers. Telegram runtime data remains on the VPS behind an owner-scoped HTTPS gateway.

## Replit secrets

Import `EpicStarAi/agent-control`, then check out `replit/epicgram-client-dev`. Configure the same values in Replit Development Secrets and Publishing deployment secrets:

```env
EPICGRAM_API_BASE_URL=https://epicgram-stage.194-163-140-26.sslip.io
EPICGRAM_BACKEND_SERVICE_TOKEN=<read/auth gateway token>
EPICGRAM_BACKEND_SEND_TOKEN=<separate send capability token>
EPICGRAM_BACKEND_IS_STAGING_GATEWAY=true
EPICGRAM_STAGING_OWNER_MODE=true
EPICGRAM_STAGING_OWNER_ACCOUNT_ID=owner
TELEGRAM_MUTATION=true
TELEGRAM_SEND_ENABLED=true
EPIC_DEV_REFERRAL=<Replit-only access code>
```

Never commit these values. `owner` and `account-*` are public aliases; they are not real TDLib slot ids. The EPICGRAM access code creates an owner web session, but does not expose or replace Telegram authorization.

## Owner capabilities

The authenticated EPICGRAM owner can:

- inspect runtime status and switch between mapped accounts;
- create up to 100 isolated TDLib account slots;
- authorize an owned Telegram account by QR, phone code and 2FA;
- read the selected account's chat list, messages, avatars and media;
- delete only the explicitly selected mapped slot and its TDLib session;
- reset only the explicitly selected slot by replacing it with a clean slot;
- send text from the main client after an explicit human Send click;
- publish channel text after an additional browser confirmation.

The AI operator does not receive the send capability token. Session/database export, API credential export, arbitrary upstream routes, shell access, mass send and automatic background send remain blocked.

## Gateway state and audit

The VPS service stores alias-to-slot mappings in `/var/lib/epicgram-staging-gateway/accounts.json` and redacted send events in `/var/lib/epicgram-staging-gateway/audit.jsonl`. Both files are mode `0600`; the audit stores a payload hash, not message text.

## Gateway environment

`/etc/epicgram-staging-gateway.env` contains the read/auth token, the separate staging send token, the canonical initial owner slot and, when supported, the live backend internal send capability. It must remain root-readable only and must not be copied to Replit.

The current VPS backend predates the internal send-secret contract. Until that backend is upgraded, only the loopback gateway may set `EPICGRAM_STAGING_ALLOW_LEGACY_APPROVAL=true`; this compatibility switch is off by default and is never exposed to Replit. Remove it as soon as `EPICGRAM_STAGING_INTERNAL_SEND_SECRET` is available.

## Rollback

Stop and disable `epicgram-staging-gateway`, remove its nginx site, test nginx, then reload nginx. The gateway can be rolled back without restarting `epicgram-api` or `epicgram-web`.

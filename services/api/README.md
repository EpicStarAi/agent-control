# EPICGRAM API Service

Backend service for Telegram authorization and sync.

## Development

```bash
npm run api:dev
```

Default URL: `http://127.0.0.1:8788`.

The Next.js app proxies `/api/telegram/*` to this backend through `EPICGRAM_API_BASE_URL`.

For local development, the backend loads `.env.local` from the repository root before reading configuration.

## Required TDLib responsibilities

- Initialize TDLib with `api_id`, `api_hash`, encrypted database path, and device metadata.
- Support QR login through TDLib `requestQrCodeAuthentication`.
- Support phone login through `setAuthenticationPhoneNumber`, code submission, and 2FA password submission.
- Persist TDLib session data only on backend/local runtime storage.
- Encrypt session storage at rest with a user-provided or OS-protected key.
- Expose connected accounts and logout/delete-session controls.
- Stream updates to the web client through WebSocket or Server-Sent Events.

## MVP HTTP contract

- `GET /api/telegram/status`
- `GET /api/telegram/config`
- `POST /api/telegram/auth/qr`
- `POST /api/telegram/auth/phone`
- `POST /api/telegram/auth/code`
- `POST /api/telegram/logout`

The current service implements the HTTP contract and persists runtime state under `.epicgram/`. Real Telegram login is blocked until TDLib configuration is present.

The current TDLib adapter is intentionally a stub boundary. It maps the required auth operations to official TDLib method names and blocks real login until a native `tdjson` binding is installed and wired.

## Required environment

```bash
EPICGRAM_TDLIB_ENABLED=true
TELEGRAM_API_ID=replace-with-official-api-id
TELEGRAM_API_HASH=replace-with-official-api-hash
EPICGRAM_TDLIB_DATABASE_KEY=replace-with-local-encryption-key
```

The first backend milestone intentionally does not accept Telegram credentials from the browser. QR links, phone codes, 2FA passwords, and TDLib session files must stay in the backend/runtime boundary.

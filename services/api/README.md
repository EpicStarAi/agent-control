# EPICGRAM API Service

Planned backend service for Telegram authorization and sync.

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
- `POST /api/telegram/auth/qr`
- `POST /api/telegram/auth/phone`
- `POST /api/telegram/auth/code`
- `POST /api/telegram/logout`

The current Next.js routes implement this contract as safe stubs until the TDLib runtime is connected.

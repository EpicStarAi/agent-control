# Identity & Account Model

One layer, shared by Desktop / Android / iOS / WebApp / Cloud.

## Hierarchy
```
Identity            the EPIC GRAM user (local device today; cloud identity later)
  └─ Account        a connected channel account (e.g. a Telegram number)
       └─ Slot      the runtime session for that account (isolated TDLib dir)
```
Today: identity = local device; each Telegram login is a **slot** in `runtime/telegram`. The account API is per-slot.

## Slot (Telegram runtime)
- `slotId` (e.g. `account-mqm3g7uq`, or `main`).
- Isolated storage: `%LOCALAPPDATA%/EPICGRAM/tdlib/accounts/<slotId>/{database,files}`.
- Own TDLib client + auth state. Switching = swap active slot (warm client, no re-auth).
- Registry + lifecycle in `telegram-runtime.json` (atomic, lock-serialized).

## Account API (live, per slot)
```
GET  /v1/telegram/account/info        composite (account, session, storage, statistics, devices)
GET  /v1/telegram/account/storage
GET  /v1/telegram/account/devices     getActiveSessions
GET  /v1/telegram/account/statistics
```
Planned `accounts` domain (facade over existing handlers):
```
GET  /v1/accounts                 list slots
GET  /v1/accounts/{slot}          one slot detail
POST /v1/accounts/{slot}/switch   set active (instant, no re-auth)
POST /v1/accounts/{slot}/logout
POST /v1/accounts/{slot}/backup | export | delete
```

## Auth states (TDLib)
`waitPhoneNumber → waitCode → [waitPassword] → ready`; QR: `waitOtherDeviceConfirmation → ready`. A **ready** slot never re-runs auth (P16 guard); a new login always creates a fresh slot.

## Rules
- A client lists slots and switches — it holds no session logic.
- Phone numbers are **masked** everywhere except the local terminal.
- Deleting a slot wipes its TDLib session dir.

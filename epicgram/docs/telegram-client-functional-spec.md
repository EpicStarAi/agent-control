# EPICGRAM Telegram Client Functional Spec

## Core Telegram Client

1. Account authorization
   - QR login through TDLib.
   - Phone number login through TDLib.
   - Code entry and 2FA password step.
   - Connected account list.
   - Logout and delete local encrypted session.

2. Chat sync
   - Dialog list by account.
   - Folder filters: chats, channels, groups, bots, archive.
   - Message history.
   - Search by chat title and message text.
   - Read/unread state.

3. Messaging
   - Draft composer.
   - Attachments later: files, images, voice.
   - MVP send gate: human confirmation before external send.
   - Audit log entry for every outbound action.

4. Local AI workspace
   - Default `Чаты` folder for technical AI groups.
   - Default `Каналы` folder for AI memory/decision channels.
   - Per-account memory after Telegram account authorization.
   - Agent permissions per account and chat.

5. Safety and ownership
   - No hidden sessions.
   - No browser-stored Telegram session secrets.
   - No private chat processing without explicit owner authorization.
   - All sessions visible in the account panel.
   - Delete-session control is mandatory.

## Architecture

Frontend:
- Next.js app shell.
- PWA manifest and service worker.
- Calls local backend contracts.

Backend:
- TDLib runtime.
- Encrypted TDLib database/session storage.
- Account registry.
- Audit log.
- Update stream.

Data:
- PostgreSQL later for metadata.
- TDLib local database for Telegram data.
- Encrypted key management before real sessions are enabled.

# Safety Policy

EPIC☠️GRAM is a lawful client shell prototype. It must never implement credential theft, hidden access, auth bypass, private-chat scraping without consent, covert impersonation, spam automation, or mass account creation.

## Required controls

- User or authorized operator connects every Telegram account.
- Official Telegram integration paths only: TDLib, Bot API, Telegram Mini App / WebApp SDK.
- All agent actions are logged.
- External message sending requires human approval in the MVP.
- Sensitive sessions must be encrypted at rest before any real Telegram integration ships.
- Permission scopes must be visible to the operator.

## Current implementation

The frontend uses mocked data only. `.env.example` contains placeholders, and no real Telegram credentials are committed.

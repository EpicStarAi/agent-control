# P-TMA-UNIFIED-PROFILE-1

## Status

Approved design contract. Implementation must remain isolated from production until review.

## Objective

Build a unified `/tma/profile` experience that clearly separates and then combines three verified identity layers:

1. Telegram Mini App identity (`initData`, backend-verified)
2. EPICGRAM account identity
3. Per-user TDLib session identity

The UI must never display a global or unrelated `TDLib ready` status as if it belonged to the current Mini App user.

## Mobile profile layout

### Header
- Telegram-style close/back controls
- title `EPIC💀GRAM AI`
- current user's avatar
- full name
- `@username`
- Telegram ID
- language
- verified Mini App badge

### Telegram Mini App section
Display:
- avatar
- first name
- last name
- username
- Telegram ID
- language code
- bot username
- authorization time
- `Verified initData`

### EPICGRAM Account section
Display:
- profile ID
- registration status
- role
- created date
- last seen

### Telegram Account / TDLib section
Disconnected state:
- `Telegram-аккаунт не подключён`
- `Поделиться номером`
- `Получить код`
- `Войти по QR`

Connected state:
- display name
- username
- masked phone
- authorization state
- TDLib connection state
- last synchronization
- session-owner match status

`TDLib ready` may be shown only when all conditions are true:

```text
verifiedMiniAppUserId === tdlibSessionOwnerId
authorizationState === authorizationStateReady
```

If the owner does not match, show a blocking warning and disable all executor/mutation paths.

### Safety section
Display:
- Mini App identity verified
- TDLib session owner matches
- Telegram mutations locked
- manual approval enabled

### AI Operator
Mobile:
- compact bottom sheet
- expandable fullscreen mode
- independent history scrolling
- no overlap with profile/header/footer

Desktop:
- independent draggable/resizable floating window
- separate skull-bubble launcher
- geometry and context persistence

## Authorization screen `/tma/auth`

Required flow:

1. Mini App identity verified
2. user shares own contact through bot reply keyboard
3. backend verifies `contact.user_id === message.from.id`
4. number is associated with the verified Mini App identity
5. user requests Telegram authorization code
6. code is entered only in protected Mini App UI
7. optional 2FA password is entered only in protected Mini App UI
8. a dedicated per-user TDLib session reaches `authorizationStateReady`

Required controls:
- `Поделиться номером`
- `Получить код`
- `Войти по QR`
- code slots
- password field with visibility toggle
- cancel/retry states
- four-step progress indicator

## Backend model

```json
{
  "telegramMiniApp": {
    "verified": true,
    "userId": "string",
    "firstName": "string",
    "lastName": "string|null",
    "username": "string|null",
    "languageCode": "string|null",
    "photoUrl": "string|null",
    "botUsername": "string",
    "authDate": "string",
    "sessionValid": true
  },
  "epicgramAccount": {
    "profileId": "string",
    "registered": true,
    "role": "user",
    "createdAt": "string",
    "lastSeenAt": "string"
  },
  "tdlibAccount": {
    "connected": false,
    "authorizationState": "authorizationStateWaitPhoneNumber",
    "userId": null,
    "username": null,
    "phoneMasked": null,
    "sessionOwnerMatches": false,
    "lastSyncAt": null
  },
  "safety": {
    "telegramMutation": false,
    "approvalMode": "manual",
    "identityMatch": false
  }
}
```

## Security invariants

- Validate raw `Telegram.WebApp.initData` on the backend.
- Never trust `initDataUnsafe` as an authorization source.
- Do not log phone numbers, authorization codes, 2FA passwords, bot tokens, or raw initData.
- Mask phone numbers in all UI and logs.
- Create an isolated TDLib database/session directory per verified user.
- Never reuse or expose the NOVIKOVA session.
- `TELEGRAM_MUTATION=false` throughout authentication.
- No send/edit/delete/join/leave/profile mutation during this phase.
- Production `:3015`, production TDLib, webhook, PM2 and nginx remain untouched.

## Acceptance tests

Minimum coverage:
- valid initData
- invalid hash
- expired auth date
- missing user
- contact ownership match
- foreign contact rejected
- isolated user sessions
- disconnected TDLib state
- code-request state
- 2FA state
- connected owner match
- owner mismatch blocking
- phone masking
- no secrets in logs
- mutation lock
- loading state
- expired session
- backend error
- no NOVIKOVA leakage
- mobile 320–430 px layout
- desktop floating operator layout

## Delivery gate

Implementation must be delivered as a Draft PR from `feat/bot-tdlib-auth-flow` or a clean child branch, with tests, lint, build, isolated candidate proof and `production untouched` evidence. No merge, deploy, restart or production webhook registration without separate approval.

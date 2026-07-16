# P-BOT-TDLIB-AUTH-1

## Goal

Implement a safe Telegram bot onboarding flow for EPIC💀GRAM AI:

1. User starts `@EPIC_GRAM_AI_BOT`.
2. Bot requests the user's own phone number using a reply-keyboard button with `request_contact=true`.
3. Backend verifies `contact.user_id === message.from.id`.
4. User chooses either phone-code login or QR login.
5. TDLib creates an isolated per-user authorization session.
6. Login code and optional 2FA password are entered only inside the Mini App secure form.
7. Successful authorization ends in `authorizationStateReady`.

## Safety boundaries

- No production deploy, restart, webhook switch, or merge in this task.
- Do not alter or reuse the NOVIKOVA TDLib session.
- No Telegram send/mutation from the user account.
- Bot replies through Bot API are separate from TDLib user-account mutations.
- Never store or log login codes or 2FA passwords.
- Mask phone numbers in logs and UI.
- One isolated TDLib database/session directory per Telegram user.
- Expire incomplete login sessions.
- Apply rate limits and attempt limits.

## Bot UX

### `/start`

Message:

`EPIC💀GRAM AI готов к подключению. Подтвердите свой номер телефона, чтобы создать защищённую сессию.`

Reply keyboard:

- `📱 Поделиться номером` (`request_contact=true`)
- `Открыть EPIC💀GRAM AI` (Web App: `https://epic-gram.com/tma/profile`)

### After contact verification

Message:

`Номер подтверждён: +380••••••123`

Actions:

- `🔐 Получить код`
- `📲 Войти по QR`
- `❌ Отмена`

### Code flow

- Backend calls TDLib `setAuthenticationPhoneNumber`.
- Telegram decides the delivery method.
- Bot sends a Web App button to a secure Mini App auth route.
- User enters the code in the Mini App, never in chat.
- If TDLib requests a password, show a password field in the Mini App.
- On success show `Telegram подключён · TDLib ready`.

## Required routes

Suggested routes; adapt to the current project structure after audit:

- `POST /api/bot/epicgram/webhook`
- `POST /api/auth/telegram/contact`
- `POST /api/auth/telegram/start-phone`
- `POST /api/auth/telegram/check-code`
- `POST /api/auth/telegram/check-password`
- `POST /api/auth/telegram/start-qr`
- `GET /api/auth/telegram/state`
- `POST /api/auth/telegram/cancel`
- Mini App route: `/tma/auth`

## Session binding

Every authorization transaction must bind:

- Telegram bot user ID
- bot chat ID
- Mini App validated `initData` user ID
- authorization session ID
- masked phone number
- expiry timestamp

Reject any mismatch.

## Contact verification

Accept contact only when all are true:

- private chat
- `message.from.id` exists
- `message.contact.user_id` exists
- `message.contact.user_id === message.from.id`
- contact not supplied by another user

Do not treat a manually typed phone number as proof of ownership.

## Mini App security

- Validate Telegram Mini App `initData` server-side.
- Use short-lived one-time authorization tokens.
- Code input must use numeric/autocomplete-friendly controls.
- Password input must use `type=password`.
- Do not write code/password to localStorage, analytics, audit body, console, or server logs.
- Clear sensitive values immediately after each TDLib call.
- Use CSRF/origin checks as appropriate for the existing stack.

## TDLib isolation

Each user receives an independent runtime identity and storage path, for example:

`runtime/tdlib-users/<telegram_user_id>/<session_id>/`

The implementation must not read, overwrite, migrate, or lock the production NOVIKOVA database.

## State model

- `idle`
- `contact_verified`
- `waiting_for_phone_number`
- `waiting_for_code`
- `waiting_for_password`
- `waiting_for_qr_scan`
- `ready`
- `cancelled`
- `expired`
- `failed`

Map directly from TDLib authorization states where possible.

## Tests — minimum 20

1. `/start` returns contact button.
2. Web App button targets `/tma/profile` or `/tma/auth` as designed.
3. Valid self-contact accepted.
4. Foreign contact rejected.
5. Missing `contact.user_id` rejected.
6. Group-chat contact rejected.
7. Manually typed phone is not ownership proof.
8. Per-user session isolation.
9. NOVIKOVA session path is never selected.
10. Start-phone transitions to waiting-for-code.
11. Invalid code handled safely.
12. Expired code handled safely.
13. Valid code transitions appropriately.
14. 2FA state shown without logging password.
15. Valid 2FA reaches ready.
16. QR login state generated.
17. Mini App `initData` user mismatch rejected.
18. Session expiry enforced.
19. Rate limit enforced.
20. Cancel is terminal for that transaction.
21. No code/password in logs.
22. No TDLib send/edit/delete/join/leave mutation.
23. `TELEGRAM_MUTATION=false` throughout auth.
24. Production PM2/restart/deploy untouched.

## Candidate requirements

- Work only in `feat/bot-tdlib-auth-flow`.
- Use an isolated candidate port.
- Do not call production `setWebhook`.
- Use fixture updates or a test webhook endpoint.
- Provide lint, build, unit tests, integration tests, curl fixtures, and browser screenshots.

## Final report

Report:

- branch
- HEAD SHA
- changed files
- architecture
- environment variables
- test results
- lint/build results
- candidate port
- TDLib isolation proof
- sensitive-data redaction proof
- `TELEGRAM_MUTATION=false`
- production untouched proof
- Draft PR URL

Stop after creating the Draft PR. Do not merge, deploy, restart, or enable the production webhook.
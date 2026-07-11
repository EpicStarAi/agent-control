---
name: EPICGRAM Add Account Wizard
description: How the add-account wizard wires phone/code/2FA TDLib auth flow from the frontend
---

The wizard lives in `artifacts/epicgram-web/src/components/AddAccountWizard.tsx`.

Steps:
1. POST `/telegram/accounts/new` → get `activeAccountId` from response (find slot where `status === "waiting_auth"` and no `displayName`)
2. POST `/telegram/auth/phone` `{accountId, phoneNumber}` → expect `authorizationState === "authorizationStateWaitCode"`
3. POST `/telegram/auth/code` `{accountId, code}` → expect `authorizationStateReady` or `authorizationStateWaitPassword`
4. POST `/telegram/auth/2fa` `{accountId, password}` → expect `authorizationStateReady`

**Why:** TDLib backend routes all existed; only the UI was missing.

**How to apply:** Import `AddAccountWizard` into `TelegramWorkspace.tsx`. On success call `onSuccess(slotId)`. After success the caller bumps `refreshTick` state which is in the `useEffect([acc, refreshTick])` deps — forces a status re-poll without changing `acc`.

Password is never stored in state after the 2FA step completes (cleared in finally block).

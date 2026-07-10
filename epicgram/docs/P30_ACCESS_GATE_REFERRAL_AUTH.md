# P30 — Access Gate / Referral Auth

Separates the **public demo** from the **real client** and gates the real app behind a referral code.
Referral code = gate into the closed system. It is NOT Telegram authorization — that is a later layer.

```
PUBLIC DEMO (GitHub Pages)            REAL CLIENT (app.epic-gram.com)
→ витрина / mock data                 → referral code
→ без TDLib / Postgres / токенов      → user session (httpOnly cookie)
→ открыт всем                         → Postgres · scoped data
                                      → потом Telegram Auth → TDLib → personal workspace
```

## Flow
```
Visitor → /gate → referral code → verify code_hash → create user + workspace + session
→ httpOnly cookie → PRIVATE WORKSPACE → (later) Telegram Auth → TDLib session
```

## DB (CREATE TABLE IF NOT EXISTS, no DROP/DELETE)
- `referral_codes` (id, code_hash UNIQUE, label, status active/used/revoked, max_uses, used_count, created_by, created_at, expires_at)
- `users` (id, display_name, role, created_at)
- `sessions` (id, user_id, token_hash UNIQUE, expires_at, created_at)
- `workspaces` (id, owner_user_id, title, created_at)

Seed: one dev referral code, hashed, **from env `EPIC_DEV_REFERRAL` only** (never printed). If env unset → no code exists, gate stays closed.

## API
- `POST /api/auth/referral-login` — body `{code}` → verifies, creates user+workspace+session, sets httpOnly `epic_session` cookie. Never returns the token in the body.
- `POST /api/auth/logout` — expires the session (no delete) + clears cookie.
- `GET /api/auth/session` — returns `{authenticated, user, workspace, source}` from the cookie.

## Security
- Only `code_hash` / `token_hash` stored (SHA-256). Raw code/token never persisted, returned, or logged.
- Cookie: httpOnly · sameSite=lax · secure in production · path=/ · 30d.
- In-memory per-IP rate limit (8/min) on referral attempts.
- Audit: `auth.referral.login_success` / `login_failed` / `logout` → operator_events + Event Bus.
- Facade with fs fallback (`source=db|fallback`), same as missions/approvals/wallet.

## Workspace scoping foundation
`users` + `workspaces` establish the `ownerId/workspaceId` pattern. Existing tables
(missions, approvals, payment_requests, …) are NOT migrated yet — P30 only prepares the pattern.
Next: add `owner_id`/`workspace_id` to those tables and filter every query by session user.

## UI
- `/gate` — Access Gate page: referral input, enter, error states, PUBLIC DEMO link, badges
  **ACCESS GATE** (before login) / **PRIVATE WORKSPACE** (after login).
- Public demo keeps its own DEMO badge and no gate.

Lineage: P29 (Telegram Workspace) → **P30 (Access Gate / Referral Auth)** → per-table owner scoping → Telegram Auth → real TDLib. Relates to [[p27-ai-operating-system]].

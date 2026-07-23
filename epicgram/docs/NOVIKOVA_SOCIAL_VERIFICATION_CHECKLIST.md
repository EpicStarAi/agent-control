# NOVIKOVA — Social Accounts Manual Verification Checklist

Companion to `docs/NOVIKOVA_SOCIAL_ACCOUNTS.md` and the registry in `lib/avatarStudio.ts`
(`NOVIKOVA_SOCIAL_ACCOUNTS`). **Manual / operator-side only.** No automatic login, scraping,
OAuth, or external provider calls. No account is `verified` by default.

## Status legend
- `verified` — manually checked AND owned/controlled by us.
- `needs_manual_check` — link exists in the registry but ownership NOT confirmed.
- `reserved_candidate` — useful candidate link, not official yet.
- `not_found` — link does not resolve / account missing.
- `blocked_by_platform` — cannot be checked due to login / region / rate limit.

## Proof required to promote → `verified`
Collect ALL that apply, then a human sets the status:
1. Profile opens publicly (or you are logged into the owner account).
2. Handle matches the canonical handle exactly.
3. Avatar / display name matches NOVIKOVA.
4. Bio references the official NOVIKOVA / EPIC GRAM identity.
5. Account owner has real access (can post / edit).
6. Screenshot proof saved manually (store outside the repo).
7. Date of check recorded.

> A public profile *existing* is NOT proof of ownership. Only promote when access/ownership is confirmed.

---

## Per-platform checklist

### 1. Telegram
- Expected handle: `no_vikovaforever` · URL: https://t.me/no_vikovaforever
- Current status: `needs_manual_check`
- Manual steps: open in Telegram app → confirm channel/profile exists, handle matches, it's the NOVIKOVA brand, you have admin/owner access.
- Proof: owner access + name/avatar match + screenshot + date.
- Allowed final: `verified` · `not_found` · `blocked_by_platform`

### 2. Instagram
- Expected handle: `no_vikovaforever` · URL: https://www.instagram.com/no_vikovaforever/
- Current status: `needs_manual_check` (public profile observed during research — NOT treated as owned)
- Manual steps: open profile → handle matches, avatar/name = NOVIKOVA, bio references official identity, you can log into the owner account.
- Proof: owner login + match + screenshot + date.
- Allowed final: `verified` · `not_found` · `blocked_by_platform`

### 3. TikTok
- Expected handle: `no_vikovaforever` · URL: https://www.tiktok.com/@no_vikovaforever
- Current status: `needs_manual_check` (could not be programmatically checked — platform access limit)
- Manual steps: open in TikTok app → handle/name match, owner access.
- Proof: owner access + match + screenshot + date.
- Allowed final: `verified` · `not_found` · `blocked_by_platform`

### 4. Facebook
- Expected handle: `no_vikovaforever` · URL: https://www.facebook.com/no_vikovaforever
- Current status: `needs_manual_check`
- Manual steps: open page/profile → confirm it's the NOVIKOVA brand page, you're an admin.
- Proof: admin access + match + screenshot + date.
- Allowed final: `verified` · `not_found` · `blocked_by_platform`

### 5. YouTube
- Expected handle: `NOVIKOVAFOREVER` · URL: https://www.youtube.com/@NOVIKOVAFOREVER
- Current status: `needs_manual_check` (a Shorts handle was observed — confirm channel ownership)
- Manual steps: open channel → handle matches, avatar/name = NOVIKOVA, you can access YouTube Studio for it.
- Proof: Studio access + match + screenshot + date.
- Allowed final: `verified` · `not_found` · `blocked_by_platform`

### 6. Threads
- Expected handle: `no_vikovaforever` · URL: https://www.threads.net/@no_vikovaforever
- Current status: `needs_manual_check` (logical dupe of Instagram)
- Manual steps: open Threads → handle matches, linked to the owned Instagram.
- Proof: owner access via linked IG + match + screenshot + date.
- Allowed final: `verified` · `not_found` · `blocked_by_platform`

### 7. Linktree (link hub)
- Expected handle: `no_vikovaforever` · URL: https://linktr.ee/no_vikovaforever
- Current status: `reserved_candidate`
- Manual steps: decide if a single bio hub is wanted → claim the handle → confirm owner access.
- Proof: owner login + date.
- Allowed final: `verified` · `reserved_candidate` · `not_found`

### 8. Beacons (link hub)
- Expected handle: `no_vikovaforever` · URL: https://beacons.ai/no_vikovaforever
- Current status: `reserved_candidate`
- Manual steps: alternative to Linktree — claim only if chosen as the hub.
- Proof: owner login + date.
- Allowed final: `verified` · `reserved_candidate` · `not_found`

---

## After verification
Update the matching entry's `status` in `NOVIKOVA_SOCIAL_ACCOUNTS` (`lib/avatarStudio.ts`)
`needs_manual_check → verified` **only** where ownership was actually confirmed. Editable
per-character storage + a UI status editor are post-freeze items.

## Scope guard
NOVIKOVA is the only character affected. No new tables, no new routes, no OAuth, no external
calls, no scraping, no generic social CRM. Original AI avatar identity — no impersonation.

# NOVIKOVA — Social Accounts Registry

**Canonical identity:** NOVIKOVA — original AI avatar / virtual streamer / AI media character.
**Primary handle:** `no_vikovaforever` · **Alternative brand handle:** `NOVIKOVAFOREVER` (YouTube).
**Fixed 2026-07-02.** Freeze-safe: static canonical data + display only. No auto-connect, no external calls, no impersonation of real people.

## Status legend
- `verified` — a human actually checked the account belongs to NOVIKOVA.
- `needs_manual_check` — link recorded, NOT yet human-verified.
- `reserved_candidate` — a handle we may claim; not confirmed active.
- `not_found` — checked, does not exist.
- `blocked_by_platform` — could not be checked due to platform access limits.

> Nothing below is `verified` yet — promote a row to `verified` only after manual confirmation.

## Accounts

| Platform | Handle | URL | Status |
|---|---|---|---|
| Telegram | no_vikovaforever | https://t.me/no_vikovaforever | needs_manual_check |
| Instagram | no_vikovaforever | https://www.instagram.com/no_vikovaforever/ | needs_manual_check |
| TikTok | no_vikovaforever | https://www.tiktok.com/@no_vikovaforever | needs_manual_check |
| Facebook | no_vikovaforever | https://www.facebook.com/no_vikovaforever | needs_manual_check |
| YouTube | NOVIKOVAFOREVER | https://www.youtube.com/@NOVIKOVAFOREVER | needs_manual_check |
| Threads | no_vikovaforever | https://www.threads.net/@no_vikovaforever | needs_manual_check |
| Link hub (Linktree) | no_vikovaforever | https://linktr.ee/no_vikovaforever | reserved_candidate |
| Link hub (Beacons) | no_vikovaforever | https://beacons.ai/no_vikovaforever | reserved_candidate |

## Still needs manual confirmation
- Telegram / Facebook / Threads — open each link in-app and confirm it is the NOVIKOVA brand account.
- Instagram `@no_vikovaforever` — a public profile was observed during research but is NOT treated as verified here until a human confirms ownership.
- YouTube `@NOVIKOVAFOREVER` — a Shorts handle was observed; confirm channel ownership.
- TikTok — could not be programmatically checked (platform access limit); verify in-app.
- Link hubs (Linktree/Beacons) — reserved candidates; claim if a single bio hub is desired.

## Where it lives in code (freeze-safe)
- Types + canonical constant: `apps/web/lib/avatarStudio.ts` → `AvatarSocialAccount`, `NOVIKOVA_SOCIAL_ACCOUNTS`, `socialAccountsForCharacter(name)`.
- UI: Avatar Studio → Character Profile panel shows a read-only "Social Accounts" section when the selected character is NOVIKOVA.
- No new DB tables, no new API routes, no external/provider calls. Editable per-character storage is a post-freeze item.

## Brand / safety
Original AI avatar identity. No impersonation of real people. Accounts are recorded/displayed only — not connected or automated.

# EPIC💀GRAM — Release 1.0 critical path (fixed sequence)

> Fixed 2026-07-02 by EPIC⭐STAR. Canonical release plan. No new big modules — only finish/wire what
> exists into a shippable product. Everything here respects Feature Freeze (finish, provider-integrate,
> UX-polish, test) — NOT new architecture.

## The spine (endorsed, with 2 corrections)
1. **P30.1 — first REAL Grok asset** — the current blocker. Full cycle Scene→Run Scene→Browser→Grok→
   Image→Asset→pending_review. NOTE: adapter is **text-only** (no reference upload) and currently
   **BLOCKED on GENERATION_TIMEOUT**; item 1 = finish the **headful** debug (EPIC_GROK_BROWSER_HEADLESS=0
   + login), not just "click run". Render Engine counts as working only when a real job hits done.
2. **Avatar Studio complete** — after first real render: Approval · Publish · Asset history · re-generate ·
   image versions. Then the studio is finished.
3. **Telegram Workspace** — auth · account **settings (currently empty — fill it; UX-polish = freeze-safe)** ·
   folders · chats · channels · groups · contacts · saved · AI Operator. Real TDLib already runs (2 accts).
4. **AI Operator wired** — Operator→Memory→Tools→Browser→Telegram→Avatar. Operator starts ACTING on the
   account, not just existing as UI. (Operator-vertical skeleton already exists — wire, don't rebuild.)
5. **Passport** — character · memory · voice · speech style · biography · goals · constraints · knowledge =
   single source of truth for NOVIKOVA. (Character Profile P29.2 already the seed — finish it.)
6. **Publisher (Telegram-only for 1.0)** — Scene→Generate→Review→Approve→Publish→Analytics. Publish stays
   **MANUAL_APPROVAL_ONLY**. This closes the AI Media OS loop.

**⇒ Release 1.0 ships HERE (items 1–6).** A working product = one character (NOVIKOVA) going
create→approve→publish→analytics on ONE channel (Telegram), end-to-end, no mocks.

## Correction 1 — multi-platform Connect Services is 1.x, NOT a 1.0 blocker
Connecting YouTube/TikTok/Instagram/Facebook/Twitch/X/Discord (P28 Social Connect, real OAuth per
platform) is a **large** chunk and each platform has its own auth + ToS/account-safety limits (no mass
fake accounts / no automated mass-DM — standing red lines). **Do NOT gate 1.0 on 8 platforms.** Ship 1.0
on **Telegram Publish only**; add the rest as **1.x incremental** (one connector at a time) after release.
Otherwise 1.0 never ships.

## Correction 2 — Marketplace and Economy are 2.0, NOT the 1.0 critical path
The user's list put Marketplace (#8) and Economy (#9) inside the critical path. They are **the same v2.0
material we already fixed** as post-1.0:
- **Marketplace** (characters/presets/styles/prompts/voices/templates) = 2.0 MVP.
- **Economy / referral** = 2.0, and **legally-gated** (see `EPICGRAM_REFERRAL_PARTNER_ECONOMY.md`):
  reward only realized revenue, single-level, human-approved payouts, legal review before money moves.
**Keep both OUT of 1.0.** 1.0 = a working AI Media OS for one operator; monetization comes after there
are users and real revenue to attribute.

## Deferred to 2.0 (agreed — do NOT touch before 1.0)
Wan-Streamer / Avatar Runtime realtime, AI Perception OS, World Model, Browser OS / own browser, local
realtime models, Agent Mesh, distributed economy, Identity Graph, Provider-Asset materialization.
All designed provider-agnostic already (see the v2 docs), so they drop in later **without** an
architecture rewrite — which is the whole point of shipping 1.0 first.

## Priority for the next days (locked)
1. 🔴 **Close P30.1** — first real Grok asset (finish headful debug).
2. 🟠 **Avatar Studio complete** — approval/publish/history/versions.
3. 🟠 **Telegram Workspace** — full client incl. settings.
4. 🟡 **Passport** finished + wired into AI Operator.
5. 🟡 **Publisher (Telegram)** — publish loop, manual-approval.
6. 🟢 **Then** 1.x: additional social platforms via one Connect Services layer, one at a time.

## Freeze note
Items 2–6 are mostly **finish + wire + UX + provider-integration** of things that already exist — allowed
under freeze. If any item turns out to need a NEW entity/table (e.g., a real Publisher schedule store, or
a payments ledger), that specific piece is a deliberate, scoped freeze-lift AFTER 1.0 — not a silent add.
Definition of Done for 1.0: NOVIKOVA goes create→scene→real render→approve→publish-to-Telegram→analytics,
end-to-end, no mocks, all side-effects human-approved.

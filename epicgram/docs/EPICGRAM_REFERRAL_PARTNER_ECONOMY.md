# EPIC💀GRAM v2 — Referral Space + Partner Economy (design analysis)

> Fixed 2026-07-02 by EPIC⭐STAR. Direction doc for v2.0. **DOC ONLY — no code under Feature Freeze.**
> NOT legal advice: I am not a lawyer or financial advisor. Any reward that flows up a user tree needs
> jurisdictional legal review (MLM statutes, money-transmission/payments licensing, securities law,
> tax/KYC) BEFORE money moves. This doc is architecture, not a legal green light.

## The dominant risk is legal, not technical
The tech (tree + invites + ledger) is easy. The danger is the reward semantics:
- **Reward for RECRUITMENT (headcount / "invited N users") = pyramid territory.** Reward for
  **REALIZED, non-refunded product revenue attributable to a node = revenue-share (defensible).**
  This single distinction is the whole legal line. Payout math must key off real revenue only.
- **Multi-level payout** (you earn from your invitees' invitees) is where it tips toward MLM/pyramid.
  Strong recommendation: **launch single-level (depth-1) only** — earn only from users YOU directly
  referred. Store the full tree (cheap), but PAY one level.
- Money moving to users = **money-transmission + tax + KYC** obligations, per country. Payouts are
  income; refunds/chargebacks must reverse rewards; some jurisdictions ban the model outright.
- **AI never moves money** (standing red line). Payout approval = human, MANUAL_APPROVAL_ONLY.

## Perverse incentives (invite-only + rewards)
- Fake accounts to farm invites; self-referral rings; **wash-revenue** (refer yourself, buy your own
  VPN to trigger a reward). Mitigations: uniqueness/KYC, revenue must come from DISTINCT paying third
  parties, clawback on refund/chargeback, velocity limits. This intersects the existing red line: **no
  mass fake accounts / virtual-number farms.**
- "Contribution to platform development" as a payout input is subjective and gameable. **Keep it out of
  the payout formula** — use it for leaderboard/display only. Payout inputs must be objective + auditable.

## 1. Weak spots
Recruitment-vs-revenue ambiguity · multi-level payout = pyramid risk · payout is a real payments
subsystem (custody, vesting, refunds, currency, fraud holds, withdrawal thresholds) not a table ·
subjective reward inputs · privacy of who-invited-whom (GDPR/consent) · coupling risk if referral logic
is welded into the working auth/gate.

## 2. What to simplify
- **Single-level attribution + single reward rule.** Payout = X% of realized, non-refunded revenue from
  users you DIRECTLY referred, per product, toggleable per product. Nothing else in the math.
- **Separate three concerns the proposal merged:** (a) Invite/Access control — who may register (we
  ALREADY have this: the referral gate). (b) Attribution graph — who referred whom (a tree). (c)
  Economy/payout — rewards (a ledger). Build a → b → c; never fuse them.
- Drop from the PAYOUT formula (keep as leaderboard/analytics only): projects created, AI operators
  under a node, "platform contribution". Payout = realized revenue only.

## 3. How to store the user tree (Postgres)
- **Base = adjacency list.** Each user row carries `referred_by_user_id` (+ `invite_id`). Simplest,
  matches our existing pattern, and is ENOUGH for depth-1 attribution.
- **Subtree/leaderboard queries** = `WITH RECURSIVE` CTE over the adjacency list. Trees are small
  (invite fan-out capped ~6), so recursion is cheap. Add a **closure table** (ancestor/descendant/depth)
  only if deep-subtree reads get slow; reach for `ltree`/materialized-path only if path queries become a
  real need. Do NOT pre-optimize with closure/ltree.
- **Invites table:** `referral_invites(id, owner_user_id, code, type[single|multi], max_uses, uses,
  role, expires_at, status[active|revoked|expired|exhausted])`. Redemption atomically: validate code →
  create user → write edge (referrer→new user) → increment uses. This is exactly the current gate flow,
  extended.

## 4. Integrate without breaking the current model
We ALREADY have the referral gate: `/api/auth/referral-login`, `EPIC_DEV_REFERRAL`, `epic_session`
cookie, workspace. The Referral Engine **extends** this, does not replace it:
- New tables (`referral_invites`, `referral_edges`/attribution, later `referral_ledger`) via
  CREATE/ALTER IF NOT EXISTS + fs fallback + `pick(dbFn, storeFn)` facade — same pattern as Avatar
  Studio. Session → user → Referral Space.
- **Do NOT modify the working auth model.** Add a module that READS user identity from the existing
  session and writes only its own tables. New routes under `/api/referral/*`. UI = a "Referral Space"
  panel (owner code, invites list, tree view, leaderboard).
- Isolated leaf: the referral engine consumes user identity + revenue events; it never touches
  avatar/character/render/operator core.

## 5. Link to Economy Engine
Hard dependency, honest: **referral payouts need REAL revenue events first.** The Economy Engine today
is mock (localStorage in the `/agents` Economy tab). Real chain:
```
Product (HMN VPN Stars · future AI services) emits a revenue event
   → Economy Engine records REALIZED revenue, attributed to user/project
   → Referral Engine reads realized revenue, applies per-product reward_policy
   → writes payout ledger entry: pending → approved(HUMAN) → paid → (reversed on refund)
```
So Referral Engine sits **downstream of Economy Engine, which sits downstream of real product revenue.**
You cannot build payouts before the Economy Engine has real revenue — same "prove on real data"
discipline as P30.1. `reward_policy` per product = `{enabled, rate, max_depth:1, currency}` (toggleable
per product: HMN VPN on, others off). Payout approval = MANUAL_APPROVAL_ONLY; AI never disburses.

## 6. What to leave for 2.0 (all of it) — and the safe internal sequence
Everything here is post-1.0. Within 2.0, sequence by rising legal risk:
- **Phase A — attribution only (no money).** Invites + edges + tree view + leaderboard. Pure analytics.
  Legal-light, immediately useful, safe. This is the first buildable brick.
- **Phase B — shadow/accrual ledger (display only).** Compute what WOULD be owed from real Economy
  revenue; show it; pay nothing. Validates the math against real data with zero payout risk.
- **Phase C — real payouts.** ONLY after legal review + KYC + refund-reversal + a licensed payout rail;
  single-level; human-approved per payout. Money is last and fully gated.

## Guiding principle
Store the whole tree; pay one level. Reward realized revenue, never recruitment. Attribution and
leaderboard are safe and can ship early in 2.0; money is the last, legally-gated, human-approved step.
This stays "internal partner/referral system with rewards only on real product + real users + real
realized revenue" — not a pyramid — precisely because payout keys off realized revenue and is depth-1.

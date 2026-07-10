# EPIC💀GRAM — NOVIKOVA (reference Digital Human) → first commercial operator (HideMyName VPN)

> Fixed 2026-07-02 by EPIC⭐STAR. Operational scenario + roadmap. Extends
> `EPICGRAM_V2_PASSPORT_RUNTIME.md`. Honest framing: **most of Stage 2 is NEW build = it CANNOT ship
> under the current Feature Freeze.** Stage 1 (NOVIKOVA) ships under freeze; Stage 2 requires a
> deliberate, scoped freeze-lift AFTER Release 1.0. MANUAL_APPROVAL_ONLY holds throughout.

## The one correction to the scenario
User's step "далее ВСЯ настройка выполняется через оператора, не вручную" conflates two things:
- **Configuration** (passport, profile, channels, FAQ, knowledge) = done by a HUMAN through the
  Character Passport + Operator Profile **UI**. Expecting the operator to self-configure is a large
  autonomous capability that does not exist and is not MVP.
- **Execution** (drafting replies, drafting posts, proposing a schedule) = done by the operator,
  **but every side-effect passes Approval** before it touches a real channel or customer.

MVP proof = "operator is the single point where all content/replies are **drafted and managed**," NOT
"operator self-configures and acts autonomously." That proof is achievable without breaking freeze
(draft level) — autonomy is strictly 2.0.

## Two operator archetypes are NOT the same pipeline
NOVIKOVA = **media/content** persona → exercises Render Router + Run Scene + Quality Gate.
HMN operator = **support/sales conversational** persona → needs inbound-conversation + product
knowledge + publishing — capabilities Stage 1 never touches. The **Passport transfers; the Runtime
capabilities differ.** Proving NOVIKOVA does not auto-prove the HMN loop. This is the real gap.

## 1. Missing stages
- **Inbound conversation runtime** — replying to real users. Run Scene is content-gen, not dialogue.
  No draft→approve→send loop for incoming messages exists.
- **Product Knowledge / RAG** — Character Profile has free-text "knowledge", but no ingested VPN
  product KB (plans, pricing, FAQ) with retrieval.
- **Publishing (P28 Social Connect)** — posting to TG channel/group is a placeholder.
- **Scheduler / posting calendar** — Story Planner is scenes, not a publication calendar.
- **Lead capture / lightweight CRM** — nothing.
- **Live-account analytics/reporting** — Economy/analytics tabs are mock.
- **Account binding to a product** — Operator Profile exists but isn't bound to a product (HMN) +
  its channels.

## 2. Risks
- **Bot collision.** HMN already runs a LIVE production bot (`hidemyname-backend`, pm2, **POLLING**,
  Telegram Stars working). A second automation on the same bot token, or a second poller, will break
  the live bot. The operator persona must be a SEPARATE account/bot, never touching the production
  token. Hard rule.
- **Autonomy on paying customers** = highest-severity risk. A hallucinated answer to a paying VPN
  customer is worse than a bad media post. Keep draft→approve for a long time; no autonomous replies
  at launch.
- **Impersonation / disclosure.** A brand AI persona may talk to customers, but must not pose as a
  specific real human, and must disclose AI assistance where required.
- **Customer PII.** Support handles emails, payment refs, device info → data-handling discipline;
  never store secrets/tokens in the passport (v2 §3.2).
- **Telegram ToS / account safety.** Automated outbound / mass-DM sales = ban risk. Inbound-reply is
  far safer than cold outbound. **Geelark/anti-detect farming is a red line if scaled** — ONE
  legitimate branded support account with a real number is fine; a farm of virtual-number accounts is
  not. Do not bypass Telegram anti-spam.
- **Payments stay operator-side.** Stars/refunds/money movement = human, never the AI operator.
- **Freeze breach.** "Configure everything through the operator" implies RAG + conversation runtime +
  publisher + scheduler + CRM — all NEW entities. Shipping them silently would blow the freeze.

## 3. What must be added before the first commercial operator
Minimum honest set (each a scoped post-freeze increment, approval-gated):
1. Authorize the SEPARATE HMN support account in the client (operator-side login).
2. Bind Operator Profile → product (HMN) + channels (bot/channel/group), role, MANUAL_APPROVAL_ONLY.
3. A product knowledge source (start simple: pasted FAQ/plans in Profile knowledge; RAG later).
4. **Inbound-reply DRAFT loop**: incoming msg → operator drafts reply → human approves → send.
5. **Content-post DRAFT loop**: operator drafts a post → approve → publish (publish via P28 when ready).

## 4. Already implemented
- Real TDLib client, 2 accounts authorized → can authorize a 3rd. Universal Connect `/api/connections`.
- Passport seed: Identity (P27.8) · Character Profile (P29.2) · Template Cards · Story Planner (P29.3)
  · Relationship Graph (P29.1). Execution: Run Scene (P29.4) · Render Router + Grok adapter · Quality
  Gate · manual Approval.
- Operator vertical skeleton: operator-core / production-gate / live-ops-monitor / operator-analytics
  + `/operator/*` + EpicGramAgentOS UI (mock send, approval + two-step, build green).
- Memory `/api/memory`. Economy tab (mock).
- HMN itself: live production bot already earning via Telegram Stars (SEPARATE system — integration
  target, not greenfield).

## 5. Mandatory for MVP (first commercial operator)
- Separate HMN account authorized (not the production bot token).
- Operator Profile bound to HMN + channels, MANUAL_APPROVAL_ONLY.
- One product-knowledge source (pasted FAQ is enough for MVP).
- Inbound-reply **draft→approve→send** loop (the core "operator" proof).
- Content-post **draft→approve** loop (publish placeholder until P28).
- NOT in MVP: autonomy, scheduler, RAG, CRM, live analytics, outbound sales DMs.

## 6. Roadmap (freeze-respecting, MANUAL_APPROVAL_ONLY throughout)

**Phase 0 — close 1.0 under freeze (NOW)**
- P30.1: first real Grok asset for NOVIKOVA (open gate; operator-side run).
- Assemble NOVIKOVA Character Passport v1 (Identity → Emotion/Visual → Provider Asset).
- Prove the manual media loop: character → scene → generate → approve → asset library.
- NOVIKOVA = reference Digital Human. **Ship Release 1.0.** No new entities in this phase.

**Freeze checkpoint — deliberate, scoped lift after 1.0.** Everything below is NEW build; it starts
only once 1.0 is shipped and the freeze is explicitly lifted for the commercial-operator track.

**Phase 1 — account + profile (operator-side + thin config)**
- Create SEPARATE HMN support account (new number). Authorize in EPIC💀GRAM client.
- Bind Operator Profile → product HMN, role (Support/Sales/Publisher), channels, MANUAL_APPROVAL_ONLY.
- Load a product-knowledge source (pasted FAQ/plans).

**Phase 2 — inbound-reply draft loop (P-COMM.1)**
- Incoming message → operator drafts reply grounded in product knowledge → Approval → send.
- This is the core proof that the operator manages a live commercial account. Draft-only, no autonomy.

**Phase 3 — content-post draft loop + publishing (P-COMM.2 + P28)**
- Operator drafts posts → Approval → publish to HMN channel/group via P28 Social Connect.

**Phase 4 — scheduler + analytics + light CRM (P-COMM.3+)**
- Posting calendar, real analytics/reporting, lead capture. Still approval-gated.

**Phase 5 — supervised autonomy (last)**
- Only after a long human-in-the-loop track record; graduated, revocable, per-action.

## Guiding principle
Prove on NOVIKOVA that the platform can create + store a living entity (Passport + manual loop). Then
carry the SAME passport standard onto a commercial VPN operator — but add the conversational Runtime
capabilities it needs, one approval-gated increment at a time, after 1.0. The operator becomes the
single management point for a commercial Telegram project at the **draft/approve** level first;
autonomy is earned, not launched.

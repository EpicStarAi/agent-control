# P30.2 — NOVIKOVA Identity Reference / Seed Consistency

Status: **READY FOR FIRST IDENTITY RUN** (generation NOT started — requires explicit operator go).
Date: 2026-07-03. Builds on P30.1 (Grok provider engineering, CLOSED).

## Goal
Attach operator-registered reference images for NOVIKOVA as identity sources and prepare a
reference-conditioned generation pipeline that produces stable likeness, gated at ≥85%.
No generation is run in this gate.

## Scope of this gate
1. Register 1–3 reference images as `identity_reference` sources (non-destructive).
2. Link them to character NOVIKOVA in workspace `ws_p294`.
3. Prepare the prompt/template for Grok reference-based generation (identity-locked).
4. Add a likeness gate: target ≥85%, status `pending` until the first scored run.
5. Do NOT run generation. Do NOT touch P30.1.

## Targets (resolved)
- Workspace: `ws_p294_mr3hy0t8`
- Character: `char_mr3hy0tb_5a222a` — **NOVIKOVA** (role: main)
- Avatar (identity shell): `ava_mr3hy0ta_2a5c1c` — "NOVIKOVA shell"

Identity sources attach to the avatar; the NOVIKOVA avatar is the identity carrier for the
NOVIKOVA character. Linkage is avatar-level (reference → NOVIKOVA shell → NOVIKOVA character).

## Reference registration (this gate)
Mechanism: existing P27.8 `AvatarIdentitySource` model + `POST /api/avatar-studio/avatars/[id]/identity-sources`
(`type` photo/prompt/manual; `status` pending_review; operator consent). No schema change, no new code.

Registered (bootstrap):
- `idsrc_novikova_ref1_bootstrap` — type `photo`, status `pending_review`,
  consent `operator_confirmed`, `fileUrl` = the captured real NOVIKOVA passport headshot
  (`asset_grokcap_mr4n5grl`, `assets.grok.com/users/…/preview_image.jpg`).

Reference slots #2 and #3 are reserved for higher-quality operator photos (front + 3/4 + varied
lighting). Bootstrap self-reference gives weaker likeness than real dedicated photos; adding #2/#3
before the first run is recommended.

## Identity-locked prompt template (prepared, not executed)
- **Identity lock:** "Subject: NOVIKOVA — the SAME person as the attached reference image(s).
  Preserve exact facial identity: face shape, eye shape/color, nose, lips, jawline, hairline,
  skin tone. Do NOT invent a new face; match the reference likeness."
- **Compose:** identity-lock + scene / template-card fragments (emotion, pose, outfit, background,
  camera, platform) from `avatarStudio.TEMPLATE_CARDS`.
- **Negative / forbidden:** no new or different face; no cartoon; no chibi; no 3D render; no CGI;
  no heavy stylization that breaks likeness; no age change; no gender change.

Machine-readable config: `.local/p30_2_identity_pipeline.json`.

## Likeness gate
- Target: **≥ 85%** similarity to reference.
- Status: **pending** — no run scored yet; identity assets stay `pending_review` until the first
  generation clears the gate.
- Scoring: not implemented in this gate (groundwork). First runs use manual operator likeness
  review; future automated scoring via an image-identity provider (InstantID / PuLID / PhotoMaker)
  embedding-similarity, wired as a later step.

## Provider plan
- Primary: `grok_imagine_browser` (attach_default CDP) — proven in P30.1.
- Reference mode: reference-conditioned prompt (identity-locked) now; native image-reference
  provider (InstantID/PuLID) is a later wiring step, kept out of scope here.
- Generation: **NOT started** — requires explicit operator go.

## Non-destructive / safety
- No app source code changed → production build unaffected (last verified PASS at commit `58df11c`).
- `.avatar-studio-data.json` append-only (identitySources 0 → 1); existing NOVIKOVA data untouched;
  `asset_grokcap_mr4n5grl` remains `pending_review`.
- No secrets printed. P30.1 untouched.

## Next step (requires explicit go)
Provide real reference photos for slots #2/#3 (optional but recommended), then run ONE
identity-locked, reference-conditioned generation and score it against the ≥85% likeness gate.

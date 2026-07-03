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

Real operator references (registered 2026-07-03, type `photo`, status `pending_review`,
consent `operator_confirmed`, avatar `ava_mr3hy0ta_2a5c1c`):
- **#2** `idsrc_novikova_ref2_front` — `ref_front.jpg` (front), 177152 B, 1280×720.
- **#3** `idsrc_novikova_ref3_34` — `ref_34.jpg` (3/4 view), 255385 B, 912×1136.
- **#4** `idsrc_novikova_ref4_altlight` — `ref_alt.jpg` (alt lighting), 259811 B, 1536×1024.

Files: `apps/web/.local/identity-references/novikova/` (validated: JPEG SOI/EOI OK, dimensions parsed).
Bootstrap `idsrc_novikova_ref1_bootstrap` retained as bootstrap-only. Total identity sources: 4.
Real references (#2–#4) are now the primary likeness anchors for the first identity run.

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

## P30.2a — Reference Upload Wiring (2026-07-03)
- **Grok UI supports file upload:** YES — `input[type=file]` (accept `image/*`); composer placeholder
  "Type to imagine, @ to reference images". Dry probe staged all 3 refs via `setInputFiles` with NO
  Generate click (screenshots `.local/avatar-renders/p30_2a_before_upload.png` / `p30_2a_after_upload.png`).
- **Adapter wiring:** `grokImagineBrowser.ts` now uploads references BEFORE generate
  (`uploadReferences`: primary `input[type=file].setInputFiles`, fallback attach-button + filechooser;
  debug screenshots `before_upload` / `after_upload` / `before_generate`). Passed via
  `input.referenceImagePaths` (presence ⇒ identity run).
- **Safety guard:** identity run whose references fail to upload ⇒ ABORT
  `REFERENCE_UPLOAD_NOT_SUPPORTED` / `REFERENCE_UPLOAD_FAILED` — NO prompt-only fallback, Generate NOT clicked.
- **Build/typecheck:** PASS (`next build apps/web`, 58/58 pages, only ESLint warnings).
- Prompt-only smoke run is NOT valid for likeness ≥85% (references would not reach Grok).

## Next step (requires explicit go)
Run ONE identity-locked, reference-conditioned generation (refs #2/#3/#4 fed to Grok via the new
wiring) and score it against the ≥85% likeness gate. Requires operator Chrome up with CDP and
`EPIC_GROK_BROWSER_DRY_RUN=0`.

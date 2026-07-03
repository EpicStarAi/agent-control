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

## P30.2b — FIRST REAL IDENTITY RUN (2026-07-03) — PASS
- **Run:** exactly ONE controlled, paid Grok Imagine generation via CDP attach (`attach_default`,
  Chrome 149 on `127.0.0.1:9222`, `EPIC_GROK_BROWSER_DRY_RUN=0`). Generate clicked **exactly once**.
- **References used:** `ref_front.jpg` / `ref_34.jpg` / `ref_alt.jpg` (identitySources #2/#3/#4) —
  all 3 uploaded to Grok BEFORE Generate.
- **Upload proof:** PASS — method `input[type=file].setInputFiles`; files ingested by Grok
  (`filesLen`→0, `blobImgs=33`); composer showed 3 reference thumbnails + placeholder.
- **Prompt-fidelity:** PASS — identity-locked NOVIKOVA business-headshot prompt inserted and read-back
  matched (`gotLen=614`, begins "NOVIKOVA — the SAME person as the attached reference images…").
- **Captured asset:** `asset_idrun_mr4t3mtd` (operator-owned `assets.grok.com/users/...`), registered
  `pending_review` then **approved** in Quality Gate.
- **Capture status:** DONE (embedded capture; finished render confirmed via read-only re-snap,
  `stillGenerating=false`).
- **Quality Gate:** photorealism PASS · female business headshot / NOVIKOVA identity PASS ·
  no cartoon/3D/CGI PASS · no artifact/deformation PASS · reference likeness (manual) **~85–88%**
  (meets ≥85% gate; subjective — no automated embedding score run).
- **Debug paths:** `.local/avatar-renders/idrun_mr4t3mtd.result_view.png`,
  `.local/avatar-renders/idrun_mr4t3mtd.manifest.json`
  (+ `before_upload` / `after_upload` / `before_prompt` / `before_generate` / `after_generate` /
  `capture_manifest` screenshots).
- **Non-destructive:** `.avatar-studio-data.json` runtime only — assets 3→4, identitySources unchanged (4);
  no code changed → production build unaffected. Exactly one generation, no secrets printed, P30.1 untouched.

**Final status: P30.2b FIRST REAL IDENTITY RUN PASS → P30.2 COMPLETE → READY FOR P30.3 IDENTITY HARDENING**
(next: dedicated InstantID/PuLID identity-lock provider for deterministic likeness >90%).

## P30.2b CAPTURE INTEGRITY CORRECTION (2026-07-03)

**The P30.2b PASS above is retracted for the captured asset.** P30.3a.2 proved that the image at the recorded
`found` URL (`65903f57`) is **byte-identical to `ref_front.jpg`** (sha256[:16] `e66a315e19c8ad37`, pixel MSE 0.0).
The embedded capture latched onto a **reference echo**, not the generated headshot. The genuine generation exists
in the capture screenshot (`idrun_mr4t3mtd.result_view.png`, scored in P30.3a.1: cos_centroid 0.8046) and, at full
resolution, at candidate `imagine-public.x.ai/.../21d8b635` (**402×536**, distinct from all refs).

- `asset_idrun_mr4t3mtd` runtime status: **demoted `approved → needs_repair`** (`qualityStatus=failed_integrity`),
  history fields recorded (`previousUrlWasReferenceEcho`, `refEchoMatch`, `repairCandidates`, `repairReason`).
  Non-destructive — refs/identitySources untouched.
- **P30.2b needs a capture-repair rerun (not a new generation):** re-point the asset to the true generated image
  once its bytes are retrievable, then rescore. Details in `docs/P30_3A_IDENTITY_SCORER_SCAFFOLD.md`.
- P30.1 untouched; no secrets printed.

### Update (2026-07-03): all capture candidates exhausted — none is the generation
Checked all three fetchable operator-owned capture candidates: `65903f57` = ref_front echo, `21d8b635` = starfield
(0 faces), `296662cf` = **ref_34 echo (byte-identical, MSE 0.0)**. The P30.2b embedded capture never recorded the
true generated asset URL; the genuine headshot survives only in `idrun_mr4t3mtd.result_view.png`. `asset_idrun_mr4t3mtd`
stays `needs_repair`. A true fix now requires a **capture-repair rerun** (new generation, separate GO) or moving to
**P30.3b** (local deterministic InstantID/PuLID). Full detail in `docs/P30_3A_IDENTITY_SCORER_SCAFFOLD.md`.

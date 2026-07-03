# P30.3 — NOVIKOVA Identity Hardening Plan (PLANNING ONLY)

Status: **PLAN READY / WAITING FOR IMPLEMENTATION GO**
Date: 2026-07-03 · Predecessor: P30.2b PASS (`asset_idrun_mr4t3mtd` approved, manual likeness ~85–88%)

> Constraints honored in this document: no Grok run, no image generation, no paid provider
> calls, no changes to P30.1/P30.2 runtime assets. This is a design document only.

## 1. Current identity pipeline — audit

| Element | State (post P30.2b) |
|---|---|
| Reference sources | `AvatarIdentitySource` #2/#3/#4 (`ref_front.jpg` / `ref_34.jpg` / `ref_alt.jpg`), type `photo`, consent `operator_confirmed`, local at `apps/web/.local/identity-references/novikova/` |
| Generator | Grok Imagine via browser automation (CDP attach, `attach_default`), **reference-conditioned**, not identity-locked |
| Upload flow (P30.2a) | `uploadReferences()` → `setInputFiles` before Generate; abort-on-fail guard (`REFERENCE_UPLOAD_*`), no prompt-only fallback |
| Approved output | `asset_idrun_mr4t3mtd` (operator-owned), status `approved`, `qualityStatus=passed` |
| Likeness gate | **manual only** (~85–88%), subjective, single reviewer |

### Gaps this layer must close
- **No automated similarity metric** — likeness is eyeballed, not measured.
- **Non-deterministic** — Grok is a closed model with no seed/param control; identity fidelity is not guaranteed and cannot be reproduced run-to-run.
- **Borderline & subjective** — ~85–88% sits on the ≥85% gate edge with no numeric backing.
- **No cross-prompt reproducibility** — identity holding across different prompts is unproven.
- **Fragile vendor path** — browser automation + Cloudflare + paid per-run; not a stable production identity primitive.

## 2. Deterministic identity-lock options

| Method | Mechanism | Base model | Refs used | Determinism | Likeness | Prompt fidelity | Notes |
|---|---|---|---|---|---|---|---|
| **InstantID** | ArcFace ID embedding + IdentityNet (ControlNet) + IP-Adapter, tuning-free | SDXL | 1 (best) | seed-reproducible | very high | medium (pose can stick to keypoints) | strongest single-image lock; needs face keypoint image |
| **PuLID** | ID encoder w/ contrastive + fast-sampling alignment; SDXL and FLUX variants | SDXL / FLUX | 1–n | seed-reproducible | high | **high** (best identity+editability balance) | PuLID-FLUX strongest quality; keeps prompt flexibility |
| **PhotoMaker v2** | stacked ID embedding averaged over multiple refs | SDXL | **multi (3+)** | seed-reproducible | good | high (style-flexible) | naturally consumes our 3 refs; slightly less exact than InstantID |
| **IP-Adapter FaceID (Plus/PlusV2/Portrait)** | face-embedding adapter, composable w/ ControlNet | SD1.5 / SDXL | 1–n (Portrait: multi) | seed-reproducible | medium–high | high | lightweight; good as a stack component, weaker standalone |
| **Face embedding scorer (InsightFace/ArcFace)** | cosine similarity of face embeddings | — | 3 (as anchors) | deterministic metric | — (it is the gate) | — | measures likeness; not a generator |

### Recommendation
- **Primary generator:** **PuLID (SDXL first; FLUX optional later)** — best likeness-vs-prompt-fidelity balance, seed-reproducible, keeps NOVIKOVA identity while allowing varied prompts (needed for the 3-prompt reproducibility gate).
- **Fallback / max-lock comparison:** **InstantID** (SDXL) for when raw fidelity must be pushed hardest.
- **Multi-ref alternative:** **PhotoMaker v2** — we already have 3 curated refs, which it consumes natively.
- **Automated gate (all generators):** **InsightFace ArcFace** (`antelopev2` / `buffalo_l`) cosine similarity — same embedding family InstantID uses, so scoring and generation stay consistent.
- **Runtime for prototype:** **local ComfyUI** (`/prompt` HTTP API), NOT an external paid provider.

### ComfyUI (local) vs external provider — why local first
| | Local ComfyUI | Hosted provider (Replicate / RunPod / fal) |
|---|---|---|
| Per-run cost | none | paid — excluded during planning/prototype |
| Seed / sampler / node control | full | partial / abstracted |
| Reproducibility | full (pinned weights + seed) | provider-version dependent |
| NOVIKOVA ref data egress | none (stays local) | uploaded off-box |
| Iteration speed | fast, offline | network + queue |
| Scale-out | limited to local GPU | elastic |

→ **Prototype local; keep a hosted-provider path behind the same abstraction for later scale.**

## 3. P30.3 acceptance criteria

Honest note on the metric: **ArcFace cosine ≠ an intuitive "likeness %".** Same-identity ArcFace
cosine typically lands ~0.45–0.70; a raw cosine of 0.90 is unrealistic. So ">90%" is defined as a
**calibrated confidence**, and the raw cosine is always reported alongside so nothing hides behind a
percentage.

**Automated (primary gate)** — InsightFace ArcFace embeddings, output vs each of refs #2/#3/#4 and vs their centroid:
- Report `cos_min`, `cos_mean`, `cos_centroid` per generation.
- **Pass:** `cos_centroid ≥ 0.60` AND `cos_min ≥ 0.50` (strong same-identity band).
- **Calibrated likeness %** = documented sigmoid mapping of `cos_centroid` (0.40→~50%, 0.60→~90%, 0.70→~97%); target ≥ 90% ⇔ `cos_centroid ≥ 0.60`. Calibration curve stored in-repo and versioned.

**Manual (secondary gate):** 2-reviewer visual check — business-headshot framing, NOVIKOVA identity, no cartoon/3D/CGI/illustration, no artifact/deformation/watermark.

**No cartoon/3D/CGI:** manual (required) + optional automated style/aesthetic classifier flag.

**Reproducibility (hardening-specific):**
- *Determinism:* same seed + pinned weights/nodes → byte-identical (or perceptually identical) output.
- *Cross-prompt identity:* identity holds across **3 distinct prompts** (e.g. business headshot / casual outdoor / studio portrait). **Each of the 3 must pass the automated gate** → proves the lock is prompt-independent, not a one-prompt fluke.

**P30.3 passes only if:** automated gate PASS on all 3 prompts **AND** manual gate PASS **AND** determinism check PASS.

## 4. Implementation plan (phased — no paid run, no destructive schema change)

- **Phase 0 — this document.** Plan only. No code.
- **Phase 1 — Local prototype scaffold (no generation until go).**
  - Install ComfyUI + custom nodes (InstantID, PuLID, IPAdapter_plus, PhotoMaker) locally.
  - Author workflow JSON for PuLID-SDXL (primary) and InstantID-SDXL (fallback).
  - Add scorer `scripts/identity/face_score.py` (InsightFace ArcFace cosine vs refs) — pure analysis, no generation.
  - **Calibration dry-run (allowed):** score the *existing* approved `asset_idrun_mr4t3mtd` offline against refs to seat thresholds. No new image is generated.
- **Phase 2 — Provider abstraction (additive, non-destructive).**
  - Define `IdentityProvider` interface in `apps/web/lib/renderProviders/`; implementations: existing `grokImagineBrowser` and new `localIdentityLock` (ComfyUI HTTP `/prompt`), behind a feature flag (default OFF).
  - `AvatarIdentitySource` and asset schema **unchanged**; add only **optional** asset fields: `identityScore`, `scorerModel`, `seed`, `workflowHash`.
  - Build/typecheck must stay green; no runtime asset mutated.
- **Phase 3 — First local identity-lock run (requires separate explicit GO).**
  - Generate with PuLID/InstantID + 3 refs, auto-score, manual review, run 3-prompt reproducibility. Local only, no paid provider.
- **Phase 4 — Gate integration & docs.**
  - Wire face score into the Quality Gate; likeness gate becomes automated ≥ threshold (manual retained as override).
  - Avatar Studio review UI shows `identityScore` (additive, read-only).
- **Phase 5 — Migration path (later).**
  - Same `IdentityProvider` abstraction targets a hosted GPU (Replicate/RunPod/fal) if scale needed.
  - Runtime fs-store → DB: `identitySources`/`assets` already modeled; migrate via additive columns (Prisma path already present). No destructive change.

## 5. Risks / blockers

1. **GPU (top blocker).** SDXL InstantID/PuLID need NVIDIA GPU ≥12GB VRAM (16–24GB comfortable); FLUX-PuLID ~24GB. CPU-only is infeasible for practical iteration. **Must confirm operator hardware before Phase 1.**
2. **Metric semantics.** ArcFace cosine is not a naive percentage; over-claiming likeness is a real risk. Mitigation: versioned calibration curve + dual gate (auto + manual) + always report raw cosine.
3. **Model licensing.** InsightFace `antelopev2`/`buffalo_l` are distributed for **non-commercial research**; InstantID/PuLID/PhotoMaker code and weights have their own terms. Commercial NOVIKOVA/EPIC use may require alternate licensed embedders. **Legal/licensing review is a gate before any commercial deployment.**
4. **Consent / ethics.** Identity-locking a real person requires a maintained authorization trail. Keep `consentStatus=operator_confirmed`, preserve the audit path, and treat NOVIKOVA refs as sensitive (local-only in prototype).
5. **Determinism caveats.** Exact reproducibility needs pinned weights + seed + sampler + node versions + deterministic CUDA; may still vary across GPU/driver. Report perceptual-identity fallback if byte-identical is not achievable.
6. **ComfyUI drift.** Custom-node/version churn breaks workflows. Mitigation: pin node commits + snapshot `workflowHash`.

## 6. Hardware / tooling requirements

- **GPU:** NVIDIA ≥16GB VRAM (24GB recommended for FLUX-PuLID), CUDA 12.x, recent driver.
- **Disk:** ~30–60GB for models.
- **ComfyUI + custom nodes:** `ComfyUI_InstantID`, PuLID node (`cubiq/PuLID_ComfyUI` or equivalent), `ComfyUI_IPAdapter_plus`, PhotoMaker node.
- **Models:** realism SDXL checkpoint (RealVisXL / Juggernaut-XL), InstantID IdentityNet + ip-adapter, PuLID weights, `antelopev2` face-analysis pack, InsightFace `buffalo_l`.
- **Python (scorer):** `insightface`, `onnxruntime-gpu`, `opencv-python`, `numpy`.
- **Repo additions (Phase ≥1):** `scripts/identity/` (scorer + calibration), `apps/web/lib/renderProviders/localIdentityLock.ts`, workflow JSON under `.local/comfy-workflows/` (gitignored runtime).

## 7. Recommended approach (summary)

Prototype a **local ComfyUI** pipeline with **PuLID-SDXL** primary + **InstantID** fallback (+ PhotoMaker-v2 as multi-ref alternative), gated by an **InsightFace ArcFace** automated scorer expressing a **calibrated ≥90% likeness** (raw cosine always reported), with a **3-prompt reproducibility** acceptance and a determinism check. Wrap everything behind an **additive `IdentityProvider` abstraction** so Grok and the local lock are interchangeable — no destructive schema changes, no paid runs during planning, P30.1/P30.2 runtime untouched. Keep hosted-GPU and DB migration paths open behind the same abstraction for later scale.

## 8. Non-destructive / safety ledger
- No schema-destructive changes; all new fields optional/additive.
- No paid run and no image generation during planning; Phase 3 gated behind explicit go.
- P30.1 / P30.2 runtime assets untouched (`asset_idrun_mr4t3mtd` remains `approved`).
- NOVIKOVA references stay local (no egress) in the local-only prototype.

---
**Final status: P30.3 PLAN READY / WAITING FOR IMPLEMENTATION GO**
Immediate blocker to clear before Phase 1: confirm operator GPU (VRAM) and model-license posture.

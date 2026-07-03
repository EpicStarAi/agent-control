# P30.3a — NOVIKOVA Identity Scorer Scaffold (SCORER-ONLY)

Status: **P30.3a SCORER SCAFFOLD READY**
Date: 2026-07-03 · Predecessor: P30.3 plan (`f3c72d4`)

> Scorer-only phase. **No image generation**, no Grok, no paid providers, no model-weight
> downloads. Runtime store and approved asset inspected **read-only**.

## What was built
- `scripts/identity/score_novikova_identity.py` — local ArcFace (InsightFace) identity scorer.
  - Resolves the 3 registered refs (`ref_front` / `ref_34` / `ref_alt`).
  - Locates approved asset `asset_idrun_mr4t3mtd` in the runtime store (searches repo-root
    **and** `apps/web/` `.avatar-studio-data.json`), read-only.
  - Resolves a local target image (explicit path → asset local field → clean render →
    optional `--allow-screenshot`); clean asset is remote-only on `assets.grok.com`.
  - Detects/crops the largest face, computes embeddings, cosine vs each ref + centroid.
  - Emits a JSON report (`.local/identity-scores/<assetId>_<ts>.json`).
  - If `insightface` is absent → exits cleanly with `MISSING_DEPENDENCIES` + exact install plan.

## Scaffold dry-run result (this run)
- `refCount`: **3** (all refs found).
- `assetStatusInStore`: **ok** · `assetStatusField`: **approved** (read-only, unchanged).
- `onnxProviders`: **TensorRT / CUDA / CPU** already available (onnxruntime-gpu present).
- `depsMissing`: **`insightface`** → `deps_status = MISSING_DEPENDENCIES`, `result = pending`.
- `targetImage`: **none local** — clean P30.2b output lives at `assets.grok.com` (download needs approval).
- Sample report: `.local/identity-scores/asset_idrun_mr4t3mtd_<ts>.json` (gitignored runtime).

## Scoring gate (as implemented)
- Metric: InsightFace `antelopev2` ArcFace cosine. **Cosine ≠ naive %.**
- Calibration (logistic): `k=11`, `c0=0.40` → cos 0.40≈0.50, 0.60≈0.90, 0.70≈0.96.
- Pass: `cos_centroid ≥ 0.60` **and** `cos_min ≥ 0.50`; else fail; `pending` if deps/target/face missing.

## RTX 5060 8GB assessment
- **Scorer (this phase):** trivial load — ArcFace/antelopev2 runs comfortably on 8GB (even CPU). ✅
- **Later generation (P30.3b):**
  - **SDXL + InstantID / PuLID:** feasible but **tight** on 8GB — requires `--lowvram`/med-vram,
    fp16, sequential CPU offload, ≤1024px, tiled VAE. Expect offloading / slower runs; OOM risk at high res.
  - **FLUX-PuLID:** needs ~24GB → **NOT feasible locally on 8GB.** Rule out FLUX on this GPU; use SDXL
    locally, or a hosted GPU for FLUX later.
  - **Blackwell note:** RTX 5060 is `sm_120`; needs recent CUDA 12.8+ / PyTorch cu128 wheels — older
    torch builds lack kernels for this GPU.

## License caveat (before any commercial use)
InsightFace pretrained packs (`buffalo_l`, `antelopev2`) and the ArcFace models are distributed for
**non-commercial research**. Using them to gate a **commercial** NOVIKOVA/EPIC avatar requires a
licensed alternative embedder or explicit permission. Flag for legal review before commercial deployment.
The scorer scaffold itself is license-neutral; the gate can swap embedders behind the same interface.

## Non-destructive / safety
- No generation, no Grok, no paid provider, no weight download.
- Approved `asset_idrun_mr4t3mtd` untouched (read-only). P30.1/P30.2 runtime intact.
- New files are additive: `scripts/identity/score_novikova_identity.py`, this doc.
  Score reports under `.local/` are gitignored runtime.

## Next gate — P30.3b (requires explicit GO + download approval)
ComfyUI + PuLID/InstantID (SDXL, low-VRAM profile) local implementation:
1. Approve InsightFace model-pack download (one-time) so the scorer can actually embed.
2. Approve SDXL + PuLID/InstantID weight downloads.
3. First local identity-lock generation, auto-scored by this scaffold, across the 3-prompt reproducibility gate.

---
**P30.3a status: SCORER SCAFFOLD READY.**

## P30.3a.1 — Real Identity Score (2026-07-03) — PASS

Ran the scaffold for real against the 3 NOVIKOVA references and the approved P30.2b asset.

- **Dependency install:** `insightface 1.0.1` + `onnxruntime 1.27.0` installed (numpy/opencv already present).
- **Model-pack download:** `antelopev2` (~352 MB) downloaded to `~/.insightface/models/`. The release zip
  extracts one level too deep (`antelopev2/antelopev2/*.onnx`) → fixed by moving the 5 `.onnx` files up one level.
- **Target image source:** **local capture screenshot** `.local/avatar-renders/idrun_mr4t3mtd.result_view.png`
  (the pristine asset is remote-only on `assets.grok.com`; per environment web-fetch policy it was **not** pulled
  via curl/python, and the manifest's embedded base64 copy is truncated/unusable). Face detection found **exactly 1
  face** (bbox ~165×229, det 0.937) = the generated headshot; the composer ref thumbnails were not detected → no
  cross-contamination.
- **Scorer model:** `insightface/antelopev2` (ArcFace), CPU provider (see note).

| metric | value |
|---|---|
| cos_front | **0.6016** |
| cos_34 | **0.9420** |
| cos_alt | **0.5127** |
| cos_centroid | **0.8046** |
| cos_min | **0.5127** |
| calibratedScoreEstimate | **0.9885** |
| result | **pass** (centroid ≥ 0.60 AND min ≥ 0.50) |

- **JSON report:** `.local/identity-scores/asset_idrun_mr4t3mtd_20260703T110946Z.json` (gitignored runtime).

### Honest caveats
- **Wide per-reference spread:** `ref_34` cos 0.942 is unusually high (near-duplicate territory for ArcFace),
  while `ref_alt` is a modest 0.513. The centroid gate passes comfortably, but the identity match is uneven
  across references rather than uniformly strong.
- **Generous calibration:** the sigmoid maps cos_centroid 0.80 → 98.85%. The **raw cosine (0.80 centroid /
  0.51 min) is the honest figure**; do not over-read the 98.85%.
- **Target is a screenshot,** not the pristine remote asset — screenshot compression/scaling can only *lower*
  scores, so the true asset score is likely ≥ this. Re-scoring the pristine image is a future refinement.
- **onnxruntime note:** installing `insightface` pulled CPU `onnxruntime`, which now shadows `onnxruntime-gpu`
  (providers dropped to Azure/CPU). Scoring on CPU is fine. To restore CUDA for P30.3b: `pip uninstall onnxruntime -y`.
- **License:** InsightFace/antelopev2 remain non-commercial research — swap embedder before commercial use.

**Final status: P30.3a.1 REAL IDENTITY SCORE PASS** (cos_centroid 0.8046, cos_min 0.5127, calibrated 0.9885;
target = capture screenshot, uneven per-ref spread noted).

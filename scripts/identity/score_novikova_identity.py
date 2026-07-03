#!/usr/bin/env python3
"""
P30.3a — NOVIKOVA identity scorer scaffold (scorer-only; NO generation).

Computes ArcFace (InsightFace) cosine similarity between the approved P30.2b
asset image and the 3 registered NOVIKOVA references, then a calibrated
likeness estimate. If InsightFace / onnxruntime are not installed, it exits
cleanly with deps_status=MISSING_DEPENDENCIES and an exact install plan.

Does NOT: generate images, call Grok/paid providers, download model weights,
or modify runtime assets. Read-only over .avatar-studio-data.json.
"""
import argparse, json, math, os, sys, glob, datetime

DECLARED_GPU = {
    "name": "NVIDIA GeForce RTX 5060",
    "vram_mb": 8151,
    "driver": "576.88",
    "cuda": "12.9",
}

# Calibration: logistic mapping of ArcFace cosine -> likeness confidence.
# Seated so cos 0.40 -> ~0.50, 0.60 -> ~0.90, 0.70 -> ~0.96.
CALIB_K = 11.0
CALIB_C0 = 0.40
PASS_CENTROID = 0.60
PASS_MIN = 0.50


def calibrate(cos):
    if cos is None:
        return None
    return round(1.0 / (1.0 + math.exp(-CALIB_K * (cos - CALIB_C0))), 4)


INSTALL_PLAN = [
    "python -m pip install --upgrade pip",
    "pip install numpy opencv-python onnxruntime-gpu insightface",
    "# CPU-only fallback (no CUDA): pip install onnxruntime insightface",
    "# First run downloads the InsightFace model pack (antelopev2 or buffalo_l).",
    "#   -> that download requires EXPLICIT approval (P30.3a forbids weight downloads).",
    "# Note: Python 3.13 may lack prebuilt insightface wheels; a C++ build",
    "#   toolchain (VS Build Tools) or Python 3.10/3.11 venv may be required.",
]


def resolve_refs(refs_dir):
    want = ["ref_front.jpg", "ref_34.jpg", "ref_alt.jpg"]
    out = {}
    for w in want:
        p = os.path.join(refs_dir, w)
        out[w] = p if os.path.isfile(p) else None
    return out


def load_asset(store_path, workspace, asset_id):
    if not os.path.isfile(store_path):
        return None, "store_not_found"
    with open(store_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    ws = (data.get("ws") or {}).get(workspace)
    if not ws:
        return None, "workspace_not_found"
    for a in (ws.get("assets") or []):
        if a.get("id") == asset_id:
            return a, "ok"
    return None, "asset_not_found"


def resolve_target(repo_root, asset, asset_id, allow_screenshot):
    # priority: explicit asset local field -> avatar-renders clean file -> screenshot(flagged)
    for key in ("localPath", "localFile", "cachedPath"):
        v = (asset or {}).get(key)
        if v and os.path.isfile(v):
            return v, "asset_local_field"
    ar = os.path.join(repo_root, ".local", "avatar-renders")
    for pat in (f"{asset_id.replace('asset_','')}.png", "idrun_*.image.png", "idrun_*.clean.png"):
        hits = glob.glob(os.path.join(ar, pat))
        if hits:
            return hits[0], "avatar_renders_clean"
    if allow_screenshot:
        sc = os.path.join(ar, "idrun_mr4t3mtd.result_view.png")
        if os.path.isfile(sc):
            return sc, "screenshot_result_view(WARNING: contains composer UI + ref thumbnails)"
    return None, "no_local_clean_image(remote-only on assets.grok.com; download needs approval)"


def check_deps():
    missing = []
    mods = {}
    for m in ("numpy", "cv2", "onnxruntime", "insightface"):
        try:
            mods[m] = __import__(m)
        except Exception as e:
            missing.append(m)
    providers = None
    if "onnxruntime" in mods:
        try:
            providers = mods["onnxruntime"].get_available_providers()
        except Exception:
            providers = None
    return missing, mods, providers


def embed_all(mods, ref_paths, target_path):
    import numpy as np
    from insightface.app import FaceAnalysis
    prov = mods["onnxruntime"].get_available_providers()
    app = FaceAnalysis(name="antelopev2", providers=prov)
    app.prepare(ctx_id=0, det_size=(640, 640))

    def embed(path):
        img = mods["cv2"].imread(path)
        if img is None:
            return None
        faces = app.get(img)
        if not faces:
            return None
        faces.sort(key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]), reverse=True)
        e = faces[0].normed_embedding
        return np.asarray(e, dtype=np.float32)

    refs = {k: embed(v) for k, v in ref_paths.items() if v}
    tgt = embed(target_path) if target_path else None
    return refs, tgt


def cos(a, b):
    import numpy as np
    if a is None or b is None:
        return None
    return round(float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))), 4)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=os.getcwd())
    ap.add_argument("--store", default=os.path.join("apps", "web", ".avatar-studio-data.json"))
    ap.add_argument("--refs-dir", default=os.path.join("apps", "web", ".local", "identity-references", "novikova"))
    ap.add_argument("--workspace", default="ws_p294_mr3hy0t8")
    ap.add_argument("--asset-id", default="asset_idrun_mr4t3mtd")
    ap.add_argument("--target", default=None, help="explicit target image path")
    ap.add_argument("--allow-screenshot", action="store_true")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    root = args.repo_root
    # Runtime store may live at repo root OR apps/web/. Search both, prefer the one that exists.
    cand_stores = []
    if os.path.isabs(args.store):
        cand_stores.append(args.store)
    else:
        cand_stores.append(os.path.join(root, args.store))
    cand_stores += [os.path.join(root, ".avatar-studio-data.json"),
                    os.path.join(root, "apps", "web", ".avatar-studio-data.json")]
    store_path = next((p for p in cand_stores if os.path.isfile(p)), cand_stores[0])
    refs_dir = args.refs_dir if os.path.isabs(args.refs_dir) else os.path.join(root, args.refs_dir)

    ref_paths = resolve_refs(refs_dir)
    asset, asset_status = load_asset(store_path, args.workspace, args.asset_id)
    target, target_src = (args.target, "explicit_arg") if args.target else resolve_target(root, asset, args.asset_id, args.allow_screenshot)
    missing, mods, providers = check_deps()

    ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    report = {
        "phase": "P30.3a",
        "mode": "scorer-only (no generation)",
        "when": ts,
        "scorerModel": "insightface/antelopev2 (ArcFace)",
        "gpu": DECLARED_GPU,
        "onnxProviders": providers,
        "refCount": sum(1 for v in ref_paths.values() if v),
        "refPaths": ref_paths,
        "targetAssetId": args.asset_id,
        "assetStatusInStore": asset_status,
        "assetStatusField": (asset or {}).get("status"),
        "targetImage": target,
        "targetSource": target_src,
        "calibration": {"k": CALIB_K, "c0": CALIB_C0, "pass_centroid": PASS_CENTROID, "pass_min": PASS_MIN},
        "depsMissing": missing,
    }

    if missing:
        report["deps_status"] = "MISSING_DEPENDENCIES"
        report["install_plan"] = INSTALL_PLAN
        report["result"] = "pending"
        report["reason"] = "scorer dependencies not installed; scaffold validated, no scoring performed"
    elif not target:
        report["deps_status"] = "OK"
        report["result"] = "pending"
        report["reason"] = "no local target image; clean asset is remote-only (download needs approval)"
    else:
        try:
            refs_e, tgt_e = embed_all(mods, ref_paths, target)
            import numpy as np
            cos_front = cos(refs_e.get("ref_front.jpg"), tgt_e)
            cos_34 = cos(refs_e.get("ref_34.jpg"), tgt_e)
            cos_alt = cos(refs_e.get("ref_alt.jpg"), tgt_e)
            valid = [c for c in (cos_front, cos_34, cos_alt) if c is not None]
            vecs = [v for v in refs_e.values() if v is not None]
            cos_centroid = None
            if vecs and tgt_e is not None:
                cent = np.mean(np.stack(vecs), axis=0)
                cos_centroid = cos(cent, tgt_e)
            cos_min = round(min(valid), 4) if valid else None
            report.update({
                "deps_status": "OK",
                "cos_front": cos_front, "cos_34": cos_34, "cos_alt": cos_alt,
                "cos_centroid": cos_centroid, "cos_min": cos_min,
                "calibratedScoreEstimate": calibrate(cos_centroid),
            })
            if cos_centroid is None or cos_min is None:
                report["result"] = "pending"
                report["reason"] = "face not detected in one or more images"
            elif cos_centroid >= PASS_CENTROID and cos_min >= PASS_MIN:
                report["result"] = "pass"
            else:
                report["result"] = "fail"
        except Exception as e:
            report["deps_status"] = "OK"
            report["result"] = "pending"
            report["reason"] = f"scoring error: {type(e).__name__}: {e}"

    out = args.out or os.path.join(root, ".local", "identity-scores", f"{args.asset_id}_{ts}.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    report["reportPath"] = out
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

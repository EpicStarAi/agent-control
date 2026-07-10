import type { RenderProviderAdapter, ProviderJobResult } from "@/lib/renderProviders";

// P27.6 + P30.2 + P30.3 — Grok Imagine browser adapter.
// Disabled unless EPIC_GROK_BROWSER=1. Real automation runs ONLY on the operator's
// machine. NEVER runs in CI/build. Safety: no credentials in code; never print
// cookies/localStorage/headers; NO CAPTCHA / anti-bot / rate-limit bypass; no auto-publish.
//
// P30.3 launch modes (GROK_LAUNCH_MODE):
//   attach_default   (DEFAULT) — connectOverCDP to the operator's ALREADY-RUNNING real
//                     Chrome (real Grok session). Cloudflare sees a genuine browser; the
//                     operator solves any human challenge. We do NOT create a profile,
//                     do NOT touch cookies, do NOT close the operator's Chrome. If CDP is
//                     unreachable -> CDP_UNAVAILABLE (NO silent fallback to a fresh Chromium).
//   automation_profile — legacy launchPersistentContext(.local/grok-profile). Fresh Chromium;
//                     Cloudflare frequently blocks it. Kept for offline/mock calibration only.
//
// P30.2 prompt-fidelity: clear input -> insert job.prompt -> assert entered==prompt ->
// snapshot gallery BEFORE generate -> click -> wait for a NEW asset -> emit debug artifacts.
//
// Operator env (never committed):
//   EPIC_GROK_BROWSER=1              enable
//   GROK_LAUNCH_MODE=attach_default  attach_default (default) | automation_profile
//   EPIC_GROK_CDP_URL=...            CDP endpoint for attach mode (default http://127.0.0.1:9222)
//   EPIC_GROK_IMAGINE_URL=...        target page (default https://grok.com/imagine)
//   EPIC_GROK_BROWSER_HEADLESS=0     automation_profile only: headful (default headless)
//   EPIC_GROK_PROFILE_DIR=...        automation_profile persistent profile (default .local/grok-profile)
//   EPIC_GROK_BROWSER_DRY_RUN=1      open + verify reachable, do NOT submit
//   EPIC_GROK_RESULT_TIMEOUT_MS=...  wait for a Grok result (default 240000 = 4 min)
//   EPIC_GROK_BROWSER_LOG=0          silence step logs (default: ON)

const FLAG = () => process.env.EPIC_GROK_BROWSER === "1";
const MODE = () => (process.env.GROK_LAUNCH_MODE || "attach_default").toLowerCase();
const CDP_URL = () => process.env.EPIC_GROK_CDP_URL || "http://127.0.0.1:9222";
const DRY = () => process.env.EPIC_GROK_BROWSER_DRY_RUN === "1";
const HEADLESS = () => process.env.EPIC_GROK_BROWSER_HEADLESS !== "0";
const TARGET_URL = () => process.env.EPIC_GROK_IMAGINE_URL || "https://grok.com/imagine";
const PROFILE_DIR = () => process.env.EPIC_GROK_PROFILE_DIR || ".local/grok-profile";
const RENDER_DIR = ".local/avatar-renders";
const RESULT_TIMEOUT = () => { const n = Number(process.env.EPIC_GROK_RESULT_TIMEOUT_MS); return Number.isFinite(n) && n > 0 ? n : 240000; };
const LOG = (...a: any[]) => { if (process.env.EPIC_GROK_BROWSER_LOG !== "0") { try { console.log("[grok]", ...a); } catch { /* ignore */ } } };

export const GROK_ERRORS = {
  NOT_CONFIGURED: "NOT_CONFIGURED",
  PLAYWRIGHT_UNAVAILABLE: "PLAYWRIGHT_UNAVAILABLE",
  CDP_UNAVAILABLE: "CDP_UNAVAILABLE",
  CDP_NO_CONTEXT: "CDP_NO_CONTEXT",
  LOGIN_REQUIRED: "LOGIN_REQUIRED",
  PROMPT_INPUT_NOT_FOUND: "PROMPT_INPUT_NOT_FOUND",
  PROMPT_FIDELITY_MISMATCH: "PROMPT_FIDELITY_MISMATCH",
  GENERATE_BUTTON_NOT_FOUND: "GENERATE_BUTTON_NOT_FOUND",
  RESULT_NOT_FOUND: "RESULT_NOT_FOUND",
  GENERATION_TIMEOUT: "GENERATION_TIMEOUT",
  SELECTOR_CHANGED: "SELECTOR_CHANGED",
  REFERENCE_UPLOAD_NOT_SUPPORTED: "REFERENCE_UPLOAD_NOT_SUPPORTED",
  REFERENCE_UPLOAD_FAILED: "REFERENCE_UPLOAD_FAILED",
  DRY_RUN_OK: "DRY_RUN_OK",
} as const;

const SELECTORS = {
  loginHints: ["text=/log in|sign in|войти/i", "button:has-text('Log in')", "a:has-text('Sign in')"],
  promptInput: ["[role='textbox']", "[placeholder*='Imagine' i]", "textarea", "[contenteditable='true']", "input[type='text']"],
  generateButton: ["button:has-text('Generate')", "button:has-text('Imagine')", "[aria-label*='generate' i]", "button[type='submit']"],
  result: ["[data-testid*='image'] img", "img[src^='http']", "video source[src]", "video[src]"],
  attachButtons: ["button[aria-label*='image' i]", "button[aria-label*='attach' i]", "button[aria-label*='upload' i]", "button[title*='attach' i]", "label[for]"],
};

function pjid(): string { return `grok_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`; }
function promptHash(s: string): string { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return "ph_" + h.toString(16); }
function fail(providerStatus: string, error: string): ProviderJobResult { return { providerJobId: "", status: "failed", resultUrl: "", error, providerStatus }; }
async function loadPlaywright(): Promise<any | null> { try { const name = "playwright"; return await import(/* webpackIgnore: true */ name); } catch { return null; } }

async function firstVisible(page: any, selectors: string[], timeout = 8000): Promise<any | null> {
  for (const s of selectors) {
    try { const loc = page.locator(s).first(); await loc.waitFor({ state: "visible", timeout: Math.max(1000, timeout / selectors.length) }); return loc; } catch { /* try next */ }
  }
  return null;
}
async function isLoggedOut(page: any): Promise<boolean> {
  for (const s of SELECTORS.loginHints) { try { if (await page.locator(s).first().isVisible()) return true; } catch { /* ignore */ } }
  return false;
}

// P30.3c — rich DOM media collector: img/currentSrc, data:image/*, blob:, http,
// video src+poster, source, computed background-image, canvas toDataURL.
// Excludes the Discover feed (imagine-public.x.ai/share-videos) as public/not-owned.
async function collectMedia(page: any): Promise<string[]> {
  try {
    return await page.evaluate(() => {
      const out: string[] = []; const seen = new Set<string>();
      const ok = (u: string) => !!u && !/imagine-public\.x\.ai\/(imagine-public\/)?share-videos/i.test(u);
      const add = (u: string) => { if (ok(u) && !seen.has(u)) { seen.add(u); out.push(u); } };
      document.querySelectorAll("img").forEach((el: any) => add(el.currentSrc || el.src || el.getAttribute("data-src") || ""));
      document.querySelectorAll("video").forEach((el: any) => { add(el.currentSrc || el.src || ""); add(el.getAttribute("poster") || ""); });
      document.querySelectorAll("source").forEach((el: any) => add(el.src || ""));
      document.querySelectorAll("*").forEach((el: any) => { const bg = getComputedStyle(el).backgroundImage; if (bg && bg.indexOf("url(") === 0) add((bg.match(/url\(["']?(.*?)["']?\)/) || [])[1] || ""); });
      // P30.1 fix: do NOT capture <canvas>. Grok's blurred LOADING placeholders render to canvas
      // and were detected as false-positive "new media" (done in ~8s, empty result). Real finished
      // results arrive as <img>/<video> http/blob/data — wait for those instead.
      return out.filter((u: string) => /^(https?:|data:image\/|blob:)/.test(u));
    });
  } catch { return []; }
}
async function collectResultSrcs(page: any): Promise<Set<string>> { return new Set(await collectMedia(page)); }
// Operator-owned result signal: inline data image, blob, or the user's own Grok asset host.
function isOwnAsset(u: string): boolean { return /^data:image\//.test(u) || /^blob:/.test(u) || /assets\.grok\.com\/users\//i.test(u); }
async function saveCaptureManifest(ref: string, before: Set<string>, found: string, all: string[]): Promise<string> {
  try {
    const fs = await import("node:fs/promises"); const path = await import("node:path");
    await fs.mkdir(RENDER_DIR, { recursive: true });
    const news = all.filter(u => !before.has(u)).map(u => ({ kind: u.slice(0, 11), url: u.slice(0, 140) }));
    const p = path.join(RENDER_DIR, `${ref}.manifest.json`);
    await fs.writeFile(p, JSON.stringify({ ref, when: new Date().toISOString(), found: found.slice(0, 140), baseline: before.size, newCandidates: news.slice(0, 40) }, null, 2));
    return p;
  } catch { return ""; }
}
// Poll for a genuinely NEW operator-owned asset (never the last Discover/gallery item). Saves a manifest.
async function waitForNewResult(page: any, before: Set<string>, timeoutMs: number, ref = "grok"): Promise<string> {
  const deadline = Date.now() + timeoutMs; let all: string[] = [];
  while (Date.now() < deadline) {
    all = await collectMedia(page);
    for (const u of all) { if (!before.has(u) && isOwnAsset(u)) { await saveCaptureManifest(ref, before, u, all); return u; } }
    try { await page.waitForTimeout(2000); } catch { /* ignore */ }
  }
  await saveCaptureManifest(ref, before, "", all);
  return "";
}
async function snap(page: any, jobRef: string, tag: string): Promise<string> {
  try {
    const fs = await import("node:fs/promises"); const path = await import("node:path");
    await fs.mkdir(RENDER_DIR, { recursive: true });
    const p = path.join(RENDER_DIR, `${jobRef}.${tag}.png`);
    await page.screenshot({ path: p, fullPage: true }).catch(() => {});
    return p;
  } catch { return ""; }
}
async function saveDebug(page: any, jobRef: string): Promise<string> {
  const png = await snap(page, jobRef, "debug");
  try { const fs = await import("node:fs/promises"); const path = await import("node:path"); const html = path.join(RENDER_DIR, `${jobRef}.debug.html`); const content = await page.content(); await fs.writeFile(html, content); } catch { /* ignore */ }
  return png;
}

// P30.2a — upload operator reference images into the Grok composer BEFORE generate.
// Primary: input[type=file].setInputFiles; fallback: attach button + filechooser.
// Logs only filenames (never full paths / secrets). Returns ok=false on unsupported/failed.
async function uploadReferences(page: any, ref: string, paths: string[]): Promise<{ ok: boolean; method: string; count: number; reason?: string }> {
  const fs = await import("node:fs");
  const exist = paths.filter((p) => { try { return fs.existsSync(p); } catch { return false; } });
  LOG(ref, "reference upload: " + exist.length + "/" + paths.length + " present :: " + exist.map((p) => p.split(/[\\/]/).pop()).join(","));
  if (!exist.length) return { ok: false, method: "none", count: 0, reason: GROK_ERRORS.REFERENCE_UPLOAD_FAILED + " no_files_present" };
  await snap(page, ref, "before_upload");
  try {
    const fileInput = page.locator("input[type=file]").first();
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(exist);
      await page.waitForTimeout(1500);
      await snap(page, ref, "after_upload");
      LOG(ref, "reference upload OK via input[type=file] count=" + exist.length);
      return { ok: true, method: "input[type=file]", count: exist.length };
    }
  } catch (e: any) { LOG(ref, "setInputFiles failed: " + String(e?.message || "").slice(0, 80)); }
  try {
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 5000 }),
      firstVisible(page, SELECTORS.attachButtons, 4000).then((b: any) => (b ? b.click() : Promise.reject(new Error("no_attach_button")))),
    ]);
    await chooser.setFiles(exist);
    await page.waitForTimeout(1500);
    await snap(page, ref, "after_upload");
    LOG(ref, "reference upload OK via filechooser count=" + exist.length);
    return { ok: true, method: "filechooser", count: exist.length };
  } catch (e: any) {
    await saveDebug(page, ref);
    return { ok: false, method: "none", count: 0, reason: GROK_ERRORS.REFERENCE_UPLOAD_NOT_SUPPORTED + " " + String(e?.message || "").slice(0, 60) };
  }
}

// Shared DOM flow (P30.2 + P30.2a). Works on any Page (attached CDP tab OR launched profile).
// Never closes the browser/context — the caller owns lifecycle.
async function runOnPage(page: any, ref: string, wanted: string, wantHash: string, refs: string[] = []): Promise<ProviderJobResult> {
  await snap(page, ref, "before_prompt");
  const promptBox = await firstVisible(page, SELECTORS.promptInput, 15000);
  if (!promptBox) { LOG(ref, "prompt input NOT found — selector changed"); await saveDebug(page, ref); return fail("selector_changed", GROK_ERRORS.PROMPT_INPUT_NOT_FOUND); }
  LOG(ref, "prompt input found");
  try { await promptBox.fill(""); } catch { try { await promptBox.click(); await page.keyboard.press("Control+A"); await page.keyboard.press("Delete"); } catch { /* ignore */ } }
  await promptBox.fill(wanted);
  let got = "";
  try { got = await promptBox.inputValue(); } catch { /* not an <input> */ }
  if (!got) { try { got = (await promptBox.textContent()) || ""; } catch { /* ignore */ } }
  const gotHash = promptHash(String(got).slice(0, 1000));
  LOG(ref, "extracted_prompt_hash want=" + wantHash + " got=" + gotHash + " match=" + (wantHash === gotHash));
  await snap(page, ref, "after_prompt");
  const okFidelity = Boolean(got) && (gotHash === wantHash || String(got).includes(wanted.slice(0, 40)));
  if (!okFidelity) { LOG(ref, "PROMPT_FIDELITY_MISMATCH — refusing to generate on the wrong prompt"); await saveDebug(page, ref); return fail("prompt_fidelity_mismatch", GROK_ERRORS.PROMPT_FIDELITY_MISMATCH + " want=" + wantHash + " got=" + gotHash); }
  // P30.2a identity run: upload references BEFORE generate. On failure ABORT (no prompt-only fallback).
  if (refs && refs.length) {
    const up = await uploadReferences(page, ref, refs);
    if (!up.ok) { LOG(ref, "IDENTITY RUN ABORT — " + up.reason); return fail("reference_upload_failed", up.reason || GROK_ERRORS.REFERENCE_UPLOAD_FAILED); }
    LOG(ref, "identity references uploaded method=" + up.method + " count=" + up.count);
    await snap(page, ref, "before_generate");
  }
  const before = await collectResultSrcs(page);
  LOG(ref, "pre-generate gallery size=" + before.size);
  const genBtn = await firstVisible(page, SELECTORS.generateButton, 4000);
  if (genBtn) { await genBtn.click().catch(() => promptBox.press("Enter")); } else { await promptBox.press("Enter"); }
  LOG(ref, "generate clicked");
  await snap(page, ref, "after_generate");
  const url = await waitForNewResult(page, before, RESULT_TIMEOUT(), ref);
  if (!url) { LOG(ref, "GENERATION_TIMEOUT (no NEW asset) — saving debug"); const dbg = await saveDebug(page, ref); return { providerJobId: ref, status: "failed", resultUrl: "", error: GROK_ERRORS.GENERATION_TIMEOUT, providerStatus: dbg ? "timeout; debug=" + dbg : "timeout" }; }
  LOG(ref, "NEW media detected " + url.slice(0, 80));
  return { providerJobId: ref, status: "done", resultUrl: url, error: "", providerStatus: "succeeded" };
}

// attach_default — connectOverCDP to the operator's real Chrome. Never launches a fresh
// Chromium, never creates a profile, never closes the operator's browser.
async function attachGetPage(pw: any): Promise<{ page?: any; error?: string; createdPage?: boolean }> {
  let browser: any;
  try { browser = await pw.chromium.connectOverCDP(CDP_URL(), { timeout: 8000 }); }
  catch (e: any) { return { error: GROK_ERRORS.CDP_UNAVAILABLE + " " + CDP_URL() + " (" + String(e?.message || "").slice(0, 100) + ")" }; }
  const contexts = browser.contexts();
  if (!contexts || !contexts.length) return { error: GROK_ERRORS.CDP_NO_CONTEXT };
  for (const c of contexts) { for (const p of c.pages()) { try { if (String(p.url()).includes("grok.com")) { LOG("attach: reusing existing grok tab"); return { page: p, createdPage: false }; } } catch { /* ignore */ } } }
  const page = await contexts[0].newPage();
  LOG("attach: opened new tab in operator Chrome ->", TARGET_URL());
  await page.goto(TARGET_URL(), { waitUntil: "domcontentloaded", timeout: 45000 });
  return { page, createdPage: true };
}

// Lightweight status for the provider list (NO browser launch, NO CDP connect).
export async function browserHealth(): Promise<string> {
  if (!FLAG()) return GROK_ERRORS.NOT_CONFIGURED;
  const pw = await loadPlaywright();
  if (!pw) return GROK_ERRORS.PLAYWRIGHT_UNAVAILABLE;
  if (DRY()) return "DRY_RUN";
  return MODE() === "automation_profile" ? "READY (automation_profile)" : "READY (attach_default; needs Chrome --remote-debugging-port)";
}

// Operator "Check Grok Browser": verifies the chosen mode is reachable + logged in.
export async function browserCheck(): Promise<{ status: string; detail: string }> {
  if (!FLAG()) return { status: GROK_ERRORS.NOT_CONFIGURED, detail: "set EPIC_GROK_BROWSER=1" };
  const pw = await loadPlaywright();
  if (!pw) return { status: GROK_ERRORS.PLAYWRIGHT_UNAVAILABLE, detail: "npm i -D playwright && npx playwright install chromium" };
  if (MODE() === "attach_default") {
    const a = await attachGetPage(pw);
    if (a.error) return { status: GROK_ERRORS.CDP_UNAVAILABLE, detail: "start Chrome with --remote-debugging-port then retry: " + a.error };
    try { const out = await isLoggedOut(a.page); return out ? { status: GROK_ERRORS.LOGIN_REQUIRED, detail: "log into Grok in your real Chrome tab" } : { status: "READY", detail: "attached to real Chrome, Grok session live" }; }
    catch (e: any) { return { status: "ERROR", detail: String(e?.message || "unknown").slice(0, 160) }; }
  }
  let ctx: any = null;
  try {
    ctx = await pw.chromium.launchPersistentContext(PROFILE_DIR(), { headless: HEADLESS() });
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(TARGET_URL(), { waitUntil: "domcontentloaded", timeout: 30000 });
    const out = await isLoggedOut(page);
    await ctx.close();
    return out ? { status: GROK_ERRORS.LOGIN_REQUIRED, detail: "log into Grok once in the opened profile" } : { status: "READY", detail: "logged in, ready" };
  } catch (e: any) {
    try { if (ctx) await ctx.close(); } catch { /* ignore */ }
    return { status: "ERROR", detail: String(e?.message || "unknown").slice(0, 160) };
  }
}

export const grokImagineBrowser: RenderProviderAdapter = {
  id: "grok_imagine_browser", name: "Grok Imagine (browser)", mode: "browser", capabilities: ["image", "video"],
  enabled() { return FLAG(); },
  async health() { return browserHealth(); },

  async createJob(input) {
    if (!FLAG()) return fail("not_configured", GROK_ERRORS.NOT_CONFIGURED);
    const pw = await loadPlaywright();
    if (!pw) return fail("playwright_unavailable", GROK_ERRORS.PLAYWRIGHT_UNAVAILABLE);
    const ref = pjid();
    const wanted = String(input.prompt || "").slice(0, 1000);
    const wantHash = promptHash(wanted);
    // P30.2a — optional identity references (absolute local paths). Presence => identity run.
    const refs = Array.isArray((input as any).referenceImagePaths) ? ((input as any).referenceImagePaths as string[]) : [];

    // --- attach_default (DEFAULT): drive the operator's real Chrome via CDP. ---
    if (MODE() === "attach_default") {
      const a = await attachGetPage(pw);
      if (a.error) { LOG(ref, "attach failed:", a.error); return fail("cdp_unavailable", a.error); } // NO silent fallback
      const page = a.page;
      try {
        if (await isLoggedOut(page)) { LOG(ref, "LOGIN_REQUIRED (log into Grok in your real Chrome)"); return fail("login_required", GROK_ERRORS.LOGIN_REQUIRED); }
        if (DRY()) { LOG(ref, "DRY_RUN_OK (attached, not submitting)"); return { providerJobId: ref, status: "failed", resultUrl: "", error: GROK_ERRORS.DRY_RUN_OK, providerStatus: "dry_run_ok" }; }
        return await runOnPage(page, ref, wanted, wantHash, refs); // never closes the operator's browser
      } catch (e: any) {
        return fail("error", "ATTACH_ERROR: " + String(e?.message || "unknown").slice(0, 160));
      }
    }

    // --- automation_profile (legacy): fresh Chromium + persistent profile. ---
    let ctx: any = null;
    try {
      ctx = await pw.chromium.launchPersistentContext(PROFILE_DIR(), { headless: HEADLESS(), args: ["--no-first-run", "--no-default-browser-check"], viewport: null });
      const page = ctx.pages()[0] || (await ctx.newPage());
      await page.goto(TARGET_URL(), { waitUntil: "domcontentloaded", timeout: 30000 });
      LOG(ref, "profile page opened", TARGET_URL(), "headless=" + HEADLESS());
      if (await isLoggedOut(page)) { await ctx.close(); return fail("login_required", GROK_ERRORS.LOGIN_REQUIRED); }
      if (DRY()) { await ctx.close(); return { providerJobId: ref, status: "failed", resultUrl: "", error: GROK_ERRORS.DRY_RUN_OK, providerStatus: "dry_run_ok" }; }
      const res = await runOnPage(page, ref, wanted, wantHash, refs);
      await ctx.close();
      return res;
    } catch (e: any) {
      try { if (ctx) await ctx.close(); } catch { /* ignore */ }
      return fail("error", "BROWSER_ERROR: " + String(e?.message || "unknown").slice(0, 160));
    }
  },

  async getJobStatus(providerJobId) { return { providerJobId, status: "running", resultUrl: "", error: "", providerStatus: "pending" }; },
  async cancelJob() { return true; },
};

import type { RenderProviderAdapter, ProviderJobResult } from "@/lib/renderProviders";

// P27.6 — Grok Imagine browser adapter (real DOM calibration + single-job smoke).
// Disabled unless EPIC_GROK_BROWSER=1. Real automation runs ONLY on the operator's
// machine after a manual login into the persistent profile. NEVER runs in CI/build.
// Safety: no credentials in code; never print cookies/localStorage/headers; no CAPTCHA
// bypass, no rate-limit bypass, no anti-detection; no auto-publish.
//
// Operator env (never committed):
//   EPIC_GROK_BROWSER=1              enable
//   EPIC_GROK_BROWSER_HEADLESS=0     headful (needed for manual login); default headless
//   EPIC_GROK_BROWSER_DRY_RUN=1      open + verify reachable, do NOT submit
//   EPIC_GROK_IMAGINE_URL=...        target page (default https://grok.com/imagine)
//   EPIC_GROK_PROFILE_DIR=...        persistent Chromium profile (default .local/grok-profile)

const FLAG = () => process.env.EPIC_GROK_BROWSER === "1";
const DRY = () => process.env.EPIC_GROK_BROWSER_DRY_RUN === "1";
const HEADLESS = () => process.env.EPIC_GROK_BROWSER_HEADLESS !== "0";
const TARGET_URL = () => process.env.EPIC_GROK_IMAGINE_URL || "https://grok.com/imagine";
const PROFILE_DIR = () => process.env.EPIC_GROK_PROFILE_DIR || ".local/grok-profile";
const RENDER_DIR = ".local/avatar-renders";

// Error taxonomy — clear, non-sensitive.
export const GROK_ERRORS = {
  NOT_CONFIGURED: "NOT_CONFIGURED",
  PLAYWRIGHT_UNAVAILABLE: "PLAYWRIGHT_UNAVAILABLE",
  LOGIN_REQUIRED: "LOGIN_REQUIRED",
  PROMPT_INPUT_NOT_FOUND: "PROMPT_INPUT_NOT_FOUND",
  GENERATE_BUTTON_NOT_FOUND: "GENERATE_BUTTON_NOT_FOUND",
  RESULT_NOT_FOUND: "RESULT_NOT_FOUND",
  GENERATION_TIMEOUT: "GENERATION_TIMEOUT",
  SELECTOR_CHANGED: "SELECTOR_CHANGED",
  DRY_RUN_OK: "DRY_RUN_OK",
} as const;

// All Grok DOM selectors centralized. Resilient order: role/name → text → stable fallback.
const SELECTORS = {
  loginHints: ["text=/log in|sign in|войти/i", "button:has-text('Log in')", "a:has-text('Sign in')"],
  promptInput: ["[role='textbox']", "[placeholder*='Imagine' i]", "textarea", "[contenteditable='true']", "input[type='text']"],
  generateButton: ["button:has-text('Generate')", "button:has-text('Imagine')", "[aria-label*='generate' i]", "button[type='submit']"],
  result: ["[data-testid*='image'] img", "img[src^='http']", "video source[src]", "video[src]"],
};

function pjid(): string { return `grok_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`; }
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

// Lightweight status for the provider list (NO browser launch).
export async function browserHealth(): Promise<string> {
  if (!FLAG()) return GROK_ERRORS.NOT_CONFIGURED;
  const pw = await loadPlaywright();
  if (!pw) return GROK_ERRORS.PLAYWRIGHT_UNAVAILABLE;
  if (DRY()) return "DRY_RUN";
  return "READY";
}

// Operator "Check Grok Browser": opens the profile, detects login, closes. Launches a
// browser only when enabled (operator-side); returns NOT_CONFIGURED otherwise.
export async function browserCheck(): Promise<{ status: string; detail: string }> {
  if (!FLAG()) return { status: GROK_ERRORS.NOT_CONFIGURED, detail: "set EPIC_GROK_BROWSER=1" };
  const pw = await loadPlaywright();
  if (!pw) return { status: GROK_ERRORS.PLAYWRIGHT_UNAVAILABLE, detail: "npm i -D playwright && npx playwright install chromium" };
  let ctx: any = null;
  try {
    ctx = await pw.chromium.launchPersistentContext(PROFILE_DIR(), { headless: HEADLESS() });
    const page = ctx.pages()[0] || (await ctx.newPage());
    await page.goto(TARGET_URL(), { waitUntil: "domcontentloaded", timeout: 30000 });
    const out = await isLoggedOut(page);
    await ctx.close();
    return out ? { status: GROK_ERRORS.LOGIN_REQUIRED, detail: "log into Grok once in the opened profile" } : { status: "READY", detail: "logged in, ready for a real job" };
  } catch (e: any) {
    try { if (ctx) await ctx.close(); } catch { /* ignore */ }
    return { status: "ERROR", detail: String(e?.message || "unknown").slice(0, 160) };
  }
}

async function captureResult(page: any, jobRef: string): Promise<string> {
  // Prefer a direct media URL; else save a local screenshot (never committed).
  const media = await firstVisible(page, SELECTORS.result, 4000);
  if (media) {
    const src = (await media.getAttribute("src").catch(() => null)) || (await media.getAttribute("data-src").catch(() => null)) || "";
    if (src && /^https?:/.test(src)) return src;
  }
  try {
    const fs = await import("node:fs/promises"); const path = await import("node:path");
    await fs.mkdir(RENDER_DIR, { recursive: true });
    const p = path.join(RENDER_DIR, `${jobRef}.png`);
    await page.screenshot({ path: p });
    return p; // local path reference; consumer decides how to serve
  } catch { return ""; }
}

export const grokImagineBrowser: RenderProviderAdapter = {
  id: "grok_imagine_browser", name: "Grok Imagine (browser)", mode: "browser", capabilities: ["image", "video"],
  enabled() { return FLAG(); },
  async health() { return browserHealth(); },

  async createJob(input) {
    if (!FLAG()) return fail("not_configured", GROK_ERRORS.NOT_CONFIGURED);
    const pw = await loadPlaywright();
    if (!pw) return fail("playwright_unavailable", GROK_ERRORS.PLAYWRIGHT_UNAVAILABLE);
    let ctx: any = null;
    const ref = pjid();
    try {
      ctx = await pw.chromium.launchPersistentContext(PROFILE_DIR(), { headless: HEADLESS() });
      const page = ctx.pages()[0] || (await ctx.newPage());
      await page.goto(TARGET_URL(), { waitUntil: "domcontentloaded", timeout: 30000 });

      if (await isLoggedOut(page)) { await ctx.close(); return fail("login_required", GROK_ERRORS.LOGIN_REQUIRED); }
      if (DRY()) { await ctx.close(); return { providerJobId: ref, status: "failed", resultUrl: "", error: GROK_ERRORS.DRY_RUN_OK, providerStatus: "dry_run_ok" }; }

      const promptBox = await firstVisible(page, SELECTORS.promptInput, 15000);
      if (!promptBox) { await ctx.close(); return fail("selector_changed", GROK_ERRORS.PROMPT_INPUT_NOT_FOUND); }
      await promptBox.fill(String(input.prompt || "").slice(0, 1000));

      const genBtn = await firstVisible(page, SELECTORS.generateButton, 4000);
      if (genBtn) { await genBtn.click().catch(() => promptBox.press("Enter")); } else { await promptBox.press("Enter"); }

      // wait for a result to appear
      const media = await firstVisible(page, SELECTORS.result, 120000);
      if (!media) { await ctx.close(); return fail("result_timeout", GROK_ERRORS.GENERATION_TIMEOUT); }
      const url = await captureResult(page, ref);
      await ctx.close();
      if (!url) return fail("result_not_found", GROK_ERRORS.RESULT_NOT_FOUND);
      return { providerJobId: ref, status: "done", resultUrl: url, error: "", providerStatus: "succeeded" };
    } catch (e: any) {
      try { if (ctx) await ctx.close(); } catch { /* ignore */ }
      return fail("error", "BROWSER_ERROR: " + String(e?.message || "unknown").slice(0, 160));
    }
  },

  async getJobStatus(providerJobId) { return { providerJobId, status: "running", resultUrl: "", error: "", providerStatus: "pending" }; },
  async cancelJob() { return true; },
};

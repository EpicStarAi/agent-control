import type { RenderProviderAdapter, ProviderJobResult } from "@/lib/renderProviders";

// P27.5 — Grok Imagine browser adapter SKELETON. Disabled by default. Real browser
// automation runs ONLY when the operator sets EPIC_GROK_BROWSER=1 in their own env
// and has logged into Grok manually into the persistent profile. NEVER executes in
// CI/build. No credentials in code, no secrets printed, no external calls in tests.
//
// Env (operator-side, never committed):
//   EPIC_GROK_BROWSER=1            enable the adapter
//   EPIC_GROK_BROWSER_DRY_RUN=1    open + verify reachable, do NOT submit a prompt
//   EPIC_GROK_IMAGINE_URL=...      target page (default https://grok.com/imagine)
//   EPIC_GROK_PROFILE_DIR=...      persistent Chromium profile dir (manual login once)

const FLAG = () => process.env.EPIC_GROK_BROWSER === "1";
const DRY = () => process.env.EPIC_GROK_BROWSER_DRY_RUN === "1";
const TARGET_URL = () => process.env.EPIC_GROK_IMAGINE_URL || "https://grok.com/imagine";
const PROFILE_DIR = () => process.env.EPIC_GROK_PROFILE_DIR || ".epic-grok-profile";

function pjid(): string { return `grok_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`; }
function fail(providerStatus: string, error: string): ProviderJobResult { return { providerJobId: "", status: "failed", resultUrl: "", error, providerStatus }; }

// Dynamic import so the build never depends on Playwright being installed.
async function loadPlaywright(): Promise<any | null> {
  try { const name = "playwright"; return await import(/* webpackIgnore: true */ name); } catch { return null; }
}

// Lightweight status for the provider list (no browser launch here).
export async function browserHealth(): Promise<string> {
  if (!FLAG()) return "NOT_CONFIGURED";
  const pw = await loadPlaywright();
  if (!pw) return "PLAYWRIGHT_NOT_INSTALLED";
  if (DRY()) return "DRY_RUN";
  return "READY";
}

export const grokImagineBrowser: RenderProviderAdapter = {
  id: "grok_imagine_browser", name: "Grok Imagine (browser)", mode: "browser", capabilities: ["image", "video"],
  enabled() { return FLAG(); },
  async health() { return browserHealth(); },

  async createJob(input) {
    if (!FLAG()) return fail("not_configured", "NOT_CONFIGURED: set EPIC_GROK_BROWSER=1");
    const pw = await loadPlaywright();
    if (!pw) return fail("playwright_not_installed", "PLAYWRIGHT_NOT_INSTALLED: `npm i -D playwright && npx playwright install chromium`");
    let ctx: any = null;
    try {
      ctx = await pw.chromium.launchPersistentContext(PROFILE_DIR(), { headless: false });
      const page = ctx.pages()[0] || (await ctx.newPage());
      await page.goto(TARGET_URL(), { waitUntil: "domcontentloaded", timeout: 30000 });

      // Login detection (best-effort, robust text match).
      const loggedOut = await page.locator("text=/log in|sign in|войти/i").first().isVisible().catch(() => false);
      if (loggedOut) { await ctx.close(); return fail("login_required", "LOGIN_REQUIRED: open the profile once and log into Grok manually"); }

      // Dry-run: page reachable, do not submit.
      if (DRY()) { await ctx.close(); return { providerJobId: pjid(), status: "failed", resultUrl: "", error: "DRY_RUN_OK: page reachable, prompt not submitted", providerStatus: "dry_run_ok" }; }

      // Find prompt input via robust selector fallbacks.
      const promptBox = page.locator("textarea, [contenteditable='true'], input[type='text']").first();
      await promptBox.waitFor({ timeout: 15000 });
      await promptBox.fill(String(input.prompt || "").slice(0, 1000));
      await promptBox.press("Enter");

      // Wait for a generated media element (adjust selectors per real DOM in P27.6).
      const media = page.locator("img[src^='http'], video source[src], video[src]").first();
      await media.waitFor({ timeout: 120000 });
      const src = (await media.getAttribute("src")) || (await media.getAttribute("data-src")) || "";
      await ctx.close();
      if (!src) return fail("no_result", "NO_RESULT: could not extract media URL (adjust selectors)");
      return { providerJobId: pjid(), status: "done", resultUrl: src, error: "", providerStatus: "succeeded" };
    } catch (e: any) {
      try { if (ctx) await ctx.close(); } catch {}
      return fail("error", "BROWSER_ERROR: " + String(e?.message || "unknown").slice(0, 160));
    }
  },

  async getJobStatus(providerJobId) {
    // Skeleton: createJob returns a terminal result synchronously (blocking wait),
    // so the queue runner relies on that. This is a safe stub.
    return { providerJobId, status: "running", resultUrl: "", error: "", providerStatus: "pending" };
  },
  async cancelJob() { return true; },
};

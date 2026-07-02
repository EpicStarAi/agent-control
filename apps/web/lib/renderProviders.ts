// P27.3 Render Provider Router. Avatar Studio no longer targets one engine —
// it selects a provider adapter behind a generic contract. Grok Imagine is the
// first real target (still a placeholder). MOCK-SAFE: no browser automation and
// no external calls unless a provider is explicitly enabled via env flag.

export type RenderCapability = "image" | "video" | "lipsync" | "3d" | "audio";
export type ProviderMode = "mock" | "browser" | "api";

export interface ProviderJobResult { providerJobId: string; status: "done" | "failed" | "running"; resultUrl: string; error: string; providerStatus: string; }
export interface RenderProviderAdapter {
  id: string;
  name: string;
  mode: ProviderMode;
  capabilities: RenderCapability[];
  enabled(): boolean;
  createJob(input: { avatarId: string; sceneKey: string; prompt: string }): Promise<ProviderJobResult>;
  getJobStatus(providerJobId: string): Promise<ProviderJobResult>;
  cancelJob?(providerJobId: string): Promise<boolean>;
}

function pid(): string { return `pj_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`; }

// --- mock_grok_imagine: current safe mock. Always available, no external calls. ---
const mockGrokImagine: RenderProviderAdapter = {
  id: "mock_grok_imagine", name: "Mock Grok Imagine", mode: "mock", capabilities: ["image"],
  enabled() { return true; },
  async createJob(input) { return { providerJobId: pid(), status: "done", resultUrl: `mock://render/${input.avatarId}/${encodeURIComponent(input.sceneKey)}.png`, error: "", providerStatus: "succeeded" }; },
  async getJobStatus(providerJobId) { return { providerJobId, status: "done", resultUrl: "", error: "", providerStatus: "succeeded" }; },
  async cancelJob() { return true; },
};

// --- grok_imagine_browser: real target placeholder. Disabled unless EPIC_GROK_BROWSER=1. ---
function browserEnabled(): boolean { return process.env.EPIC_GROK_BROWSER === "1"; }
const grokImagineBrowser: RenderProviderAdapter = {
  id: "grok_imagine_browser", name: "Grok Imagine (browser)", mode: "browser", capabilities: ["image", "video"],
  enabled() { return browserEnabled(); },
  async createJob() {
    // P27.3 placeholder: NO Playwright, NO browser, NO network. Real automation lands in P27.4.
    return { providerJobId: "", status: "failed", resultUrl: "", error: "NOT_CONFIGURED: grok_imagine_browser is a placeholder (enable in P27.4)", providerStatus: "not_configured" };
  },
  async getJobStatus(providerJobId) { return { providerJobId, status: "failed", resultUrl: "", error: "NOT_CONFIGURED", providerStatus: "not_configured" }; },
};

// --- future providers (catalog placeholders, disabled). ---
function futureProvider(id: string, name: string, mode: ProviderMode, caps: RenderCapability[]): RenderProviderAdapter {
  return { id, name, mode, capabilities: caps, enabled() { return false; },
    async createJob() { return { providerJobId: "", status: "failed", resultUrl: "", error: `NOT_CONFIGURED: ${id} not implemented`, providerStatus: "not_configured" }; },
    async getJobStatus(providerJobId) { return { providerJobId, status: "failed", resultUrl: "", error: "NOT_CONFIGURED", providerStatus: "not_configured" }; } };
}

export const PROVIDER_REGISTRY: RenderProviderAdapter[] = [
  mockGrokImagine,
  grokImagineBrowser,
  futureProvider("flux", "Flux", "api", ["image"]),
  futureProvider("sdxl", "SDXL", "api", ["image"]),
  futureProvider("runway", "Runway", "api", ["video"]),
  futureProvider("veo", "Veo", "api", ["video"]),
  futureProvider("kling", "Kling", "api", ["video"]),
  futureProvider("heygen", "HeyGen", "api", ["lipsync"]),
  futureProvider("tripo", "Tripo", "api", ["3d"]),
];
export const DEFAULT_PROVIDER = "mock_grok_imagine";

export function getProvider(id: string): RenderProviderAdapter | undefined { return PROVIDER_REGISTRY.find(p => p.id === id); }
export function isKnownProvider(id: unknown): boolean { return PROVIDER_REGISTRY.some(p => p.id === String(id)); }
export function providerSummary() {
  return PROVIDER_REGISTRY.map(p => ({ id: p.id, name: p.name, mode: p.mode, capabilities: p.capabilities, enabled: p.enabled() }));
}

// Router: pick a provider by explicit id → pack preferred → capability match → default.
export function selectProvider(opts: { providerId?: string; packPreferred?: string; capability?: RenderCapability }): { providerId: string; selectedBy: string } {
  const want = String(opts.providerId || "");
  if (want && isKnownProvider(want)) return { providerId: want, selectedBy: "explicit" };
  const pref = String(opts.packPreferred || "");
  if (pref && isKnownProvider(pref)) return { providerId: pref, selectedBy: "pack" };
  if (opts.capability) {
    const cap = PROVIDER_REGISTRY.find(p => p.enabled() && p.capabilities.includes(opts.capability!));
    if (cap) return { providerId: cap.id, selectedBy: "capability" };
  }
  return { providerId: DEFAULT_PROVIDER, selectedBy: "default" };
}

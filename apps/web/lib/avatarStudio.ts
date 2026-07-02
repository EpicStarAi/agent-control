// P27.1 AI Avatar Studio Base — Digital Twin Factory.
// One reference image → Avatar → Passport → Prompt Packs → Render Jobs → Assets.
// MOCK-SAFE ONLY: no browser automation, no real Grok, no external calls, no publish.
// Scoped to the caller's workspace_id. No secrets stored.

export type AvatarStatus = "draft" | "active" | "archived";
export type JobStatus = "pending" | "done" | "approved" | "rejected" | "error";
export type AssetStatus = "draft" | "approved" | "rejected";

export interface Avatar {
  id: string; workspaceId: string; name: string; status: AvatarStatus;
  sourceImageUrl: string; consentConfirmed: boolean; createdAt: string; updatedAt: string;
}
export interface AvatarPassport {
  id: string; avatarId: string; workspaceId: string;
  profileJson: Record<string, unknown>; identityNotes: string; styleNotes: string;
  forbiddenRules: string[]; createdAt: string; updatedAt: string;
}
export interface RenderPack { id: string; name: string; description: string; scenes: string[]; engine: string; }
export interface RenderJob {
  id: string; workspaceId: string; avatarId: string; packId: string; engine: string;
  status: JobStatus; sceneKey: string; prompt: string; resultUrl: string; error: string;
  createdAt: string; updatedAt: string;
}
export interface AvatarAsset {
  id: string; workspaceId: string; avatarId: string; jobId: string; assetType: string;
  imageUrl: string; prompt: string; status: AssetStatus; createdAt: string; updatedAt: string;
}

// Always-on safety rules injected into every prompt.
export const FORBIDDEN_RULES: string[] = [
  "no explicit content",
  "no fake documents",
  "no political impersonation",
  "no celebrity impersonation",
  "no minors in adult-style presentation",
  "do not add random logos",
  "do not change facial identity",
];

// Default render packs (static catalog, exposed read-only via API).
export const PACKS: RenderPack[] = [
  { id: "profile", name: "Profile Pack", description: "Чистые профильные фото", engine: "grok_imagine_ui",
    scenes: ["professional_headshot", "clean_avatar", "full_body_neutral", "studio_portrait", "social_profile_photo"] },
  { id: "influencer", name: "Influencer Pack", description: "Лайфстайл-контент", engine: "grok_imagine_ui",
    scenes: ["lifestyle_cafe", "street_style", "mirror_selfie_style", "rooftop_evening", "casual_day_out"] },
  { id: "business", name: "Business Pack", description: "Деловые портреты", engine: "grok_imagine_ui",
    scenes: ["executive_headshot", "office_portrait", "conference_speaker", "premium_lobby", "linkedin_profile"] },
  { id: "cyber", name: "Cyber Pack", description: "Neon / AI-оператор", engine: "grok_imagine_ui",
    scenes: ["neon_city", "ai_operator_room", "holographic_dashboard", "dark_cyber_portrait", "epicgram_operator"] },
  { id: "travel", name: "Travel Pack", description: "Путешествия", engine: "grok_imagine_ui",
    scenes: ["airport_lounge", "hotel_lobby", "paris_street", "dubai_skyline", "beach_resort"] },
  { id: "promo", name: "Promo Pack", description: "Промо / обложки", engine: "grok_imagine_ui",
    scenes: ["telegram_banner", "youtube_thumbnail", "tiktok_cover", "product_poster", "launch_announcement"] },
  { id: "story", name: "Story Pack", description: "Сюжетные сцены", engine: "grok_imagine_ui",
    scenes: ["episode_intro", "daily_routine", "conflict_scene", "discovery_moment", "call_to_action"] },
];
export function getPack(id: string): RenderPack | undefined { return PACKS.find(p => p.id === id); }

export interface SceneTemplate { key: string; description: string; location: string; lighting: string; mood: string; framing: string; }
// Compact, deterministic scene template derived from the scene key (no hand-writing 35 blocks).
export function sceneTemplate(sceneKey: string): SceneTemplate {
  const words = sceneKey.replace(/_/g, " ");
  const cyber = /neon|cyber|holo|operator|ai_/.test(sceneKey);
  const studio = /headshot|portrait|studio|avatar|profile|linkedin|office/.test(sceneKey);
  const outdoor = /street|city|rooftop|beach|paris|dubai|skyline|resort|airport/.test(sceneKey);
  return {
    key: sceneKey,
    description: `scene: ${words}`,
    location: outdoor ? "on-location outdoor" : cyber ? "futuristic interior" : studio ? "clean studio" : "contextual interior",
    lighting: cyber ? "neon accent + soft key light" : studio ? "soft studio softbox" : "natural balanced light",
    mood: cyber ? "confident, high-tech" : /cafe|day_out|routine|casual/.test(sceneKey) ? "relaxed, natural" : "professional, composed",
    framing: /full_body|street|lifestyle|resort/.test(sceneKey) ? "medium/full body, 3:4" : "head-and-shoulders, 4:5",
  };
}

const IDENTITY_LOCK =
  "Preserve the same facial identity, age range, hairstyle, and core visual traits from the reference avatar. Do not change the person into another identity.";

// Merge passport + scene into a single render prompt with identity lock and safety constraints.
export function buildAvatarPrompt(passport: Partial<AvatarPassport> | null, scene: SceneTemplate): string {
  const identity = (passport?.identityNotes || "reference avatar").trim();
  const style = (passport?.styleNotes || "natural, on-brand").trim();
  const forbidden = (passport?.forbiddenRules && passport.forbiddenRules.length ? passport.forbiddenRules : FORBIDDEN_RULES);
  return [
    `Identity: ${identity}.`,
    `Style: ${style}.`,
    `${scene.description}. Location: ${scene.location}. Lighting: ${scene.lighting}. Mood: ${scene.mood}. Framing: ${scene.framing}.`,
    `IDENTITY LOCK: ${IDENTITY_LOCK}`,
    `NEGATIVE / FORBIDDEN: ${forbidden.join("; ")}.`,
  ].join(" ");
}

// ---- Render engine adapter (interface + mock). No automation in P27.1. ----
export interface RenderJobResult { status: JobStatus; resultUrl: string; error: string; }
export interface RenderJobStatus { status: JobStatus; resultUrl: string; error: string; }
export interface RenderEngineAdapter {
  name: string;
  createJob(input: { avatarId: string; sceneKey: string; prompt: string }): Promise<RenderJobResult>;
  getJobStatus(jobId: string): Promise<RenderJobStatus>;
}
// Mock-safe adapter: returns a deterministic placeholder result. NO Playwright, NO Grok, NO network.
export const grokImagineUiAdapter: RenderEngineAdapter = {
  name: "grok_imagine_ui",
  async createJob(input) {
    const slug = encodeURIComponent(input.sceneKey);
    return { status: "done", resultUrl: `mock://render/${input.avatarId}/${slug}.png`, error: "" };
  },
  async getJobStatus() { return { status: "done", resultUrl: "", error: "" }; },
};
export function getAdapter(_engine: string): RenderEngineAdapter { return grokImagineUiAdapter; }

// ---- id + normalization helpers ----
function nid(p: string): string { return `${p}_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`; }
function clip(s: unknown, n: number): string { return String(s ?? "").slice(0, n); }
function jobStatus(s: unknown): JobStatus {
  return s === "done" || s === "approved" || s === "rejected" || s === "error" ? s : "pending";
}

export function normalizeAvatar(workspaceId: string, i: Partial<Avatar>): Avatar {
  const now = new Date().toISOString();
  return { id: i.id || nid("ava"), workspaceId, name: clip(i.name, 80) || "Avatar",
    status: (i.status === "active" || i.status === "archived" ? i.status : "draft"),
    sourceImageUrl: clip(i.sourceImageUrl, 400), consentConfirmed: Boolean(i.consentConfirmed),
    createdAt: i.createdAt || now, updatedAt: now };
}
export function normalizePassport(workspaceId: string, avatarId: string, i: Partial<AvatarPassport>): AvatarPassport {
  const now = new Date().toISOString();
  return { id: i.id || nid("pass"), avatarId, workspaceId,
    profileJson: (i.profileJson && typeof i.profileJson === "object" ? i.profileJson : {}),
    identityNotes: clip(i.identityNotes, 800), styleNotes: clip(i.styleNotes, 800),
    forbiddenRules: Array.isArray(i.forbiddenRules) && i.forbiddenRules.length ? i.forbiddenRules.map(x => clip(x, 120)) : FORBIDDEN_RULES,
    createdAt: i.createdAt || now, updatedAt: now };
}
export function normalizeJob(workspaceId: string, i: Partial<RenderJob>): RenderJob {
  const now = new Date().toISOString();
  return { id: i.id || nid("job"), workspaceId, avatarId: clip(i.avatarId, 60), packId: clip(i.packId, 40),
    engine: clip(i.engine, 40) || "grok_imagine_ui", status: jobStatus(i.status), sceneKey: clip(i.sceneKey, 60),
    prompt: clip(i.prompt, 2000), resultUrl: clip(i.resultUrl, 400), error: clip(i.error, 400),
    createdAt: i.createdAt || now, updatedAt: now };
}
export function normalizeAsset(workspaceId: string, i: Partial<AvatarAsset>): AvatarAsset {
  const now = new Date().toISOString();
  return { id: i.id || nid("asset"), workspaceId, avatarId: clip(i.avatarId, 60), jobId: clip(i.jobId, 60),
    assetType: clip(i.assetType, 40) || "image", imageUrl: clip(i.imageUrl, 400), prompt: clip(i.prompt, 2000),
    status: (i.status === "approved" || i.status === "rejected" ? i.status : "draft"),
    createdAt: i.createdAt || now, updatedAt: now };
}

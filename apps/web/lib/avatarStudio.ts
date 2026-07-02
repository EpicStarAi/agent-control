// P27.1 AI Avatar Studio Base — Digital Twin Factory.
// One reference image → Avatar → Passport → Prompt Packs → Render Jobs → Assets.
// MOCK-SAFE ONLY: no browser automation, no real Grok, no external calls, no publish.
// Scoped to the caller's workspace_id. No secrets stored.

export type AvatarStatus = "draft" | "active" | "archived";
export type JobStatus = "queued" | "running" | "done" | "failed" | "approved" | "rejected" | "regenerate_requested" | "cancelled";
export type AssetStatus = "pending_review" | "approved" | "rejected" | "published";
export type QualityStatus = "unchecked" | "passed" | "failed" | "needs_review";
export const JOB_STATUSES: JobStatus[] = ["queued", "running", "done", "failed", "approved", "rejected", "regenerate_requested", "cancelled"];
export const ASSET_STATUSES: AssetStatus[] = ["pending_review", "approved", "rejected", "published"];
export const QUALITY_STATUSES: QualityStatus[] = ["unchecked", "passed", "failed", "needs_review"];

// P27.2 status transition guard. Only these moves are allowed.
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["done", "failed", "cancelled"],
  done: ["approved", "rejected"],
  failed: ["queued"],
  approved: [],
  rejected: ["regenerate_requested"],
  regenerate_requested: ["queued", "cancelled"],
  cancelled: [],
};
export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return from === to ? false : (TRANSITIONS[from] || []).includes(to);
}

export interface Avatar {
  id: string; workspaceId: string; name: string; status: AvatarStatus;
  sourceImageUrl: string; consentConfirmed: boolean; createdAt: string; updatedAt: string;
}
export interface AvatarPassport {
  id: string; avatarId: string; workspaceId: string;
  profileJson: Record<string, unknown>; identityNotes: string; styleNotes: string;
  forbiddenRules: string[]; createdAt: string; updatedAt: string;
}
export interface RenderPack { id: string; name: string; description: string; scenes: string[]; engine: string; preferredProvider?: string; }
export interface RenderJob {
  id: string; workspaceId: string; avatarId: string; packId: string; engine: string;
  status: JobStatus; sceneKey: string; prompt: string; resultUrl: string; error: string;
  attempts: number; maxAttempts: number; startedAt: string; completedAt: string;
  lastError: string; batchId: string; priority: number;
  providerId: string; providerJobId: string; providerStatus: string; providerError: string;
  selectedBy: string; capabilitiesSnapshot: string; candidateIndex: number;
  createdAt: string; updatedAt: string;
}
export interface AvatarAsset {
  id: string; workspaceId: string; avatarId: string; jobId: string; assetType: string;
  imageUrl: string; prompt: string; status: AssetStatus;
  qualityStatus: QualityStatus; qualityScore: number | null; identityScore: number | null;
  styleScore: number | null; artifactScore: number | null; qualityNotes: string;
  sceneKey: string; candidateIndex: number;
  createdAt: string; updatedAt: string;
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
  { id: "cyber", name: "Cyber Pack", description: "Neon / AI-оператор", engine: "grok_imagine_ui", preferredProvider: "mock_grok_imagine",
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
  return (JOB_STATUSES as string[]).includes(String(s)) ? (String(s) as JobStatus) : "queued";
}
function num(v: unknown, d: number): number { const n = Number(v); return Number.isFinite(n) ? n : d; }

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
    attempts: num(i.attempts, 0), maxAttempts: num(i.maxAttempts, 3), startedAt: clip(i.startedAt, 40), completedAt: clip(i.completedAt, 40),
    lastError: clip(i.lastError, 400), batchId: clip(i.batchId, 60), priority: num(i.priority, 0),
    providerId: clip(i.providerId, 40) || "mock_grok_imagine", providerJobId: clip(i.providerJobId, 80),
    providerStatus: clip(i.providerStatus, 40), providerError: clip(i.providerError, 400),
    selectedBy: clip(i.selectedBy, 20), capabilitiesSnapshot: clip(i.capabilitiesSnapshot, 120), candidateIndex: num(i.candidateIndex, 0),
    createdAt: i.createdAt || now, updatedAt: now };
}
export function newBatchId(): string { return nid("batch"); }
export function normalizeAsset(workspaceId: string, i: Partial<AvatarAsset>): AvatarAsset {
  const now = new Date().toISOString();
  return { id: i.id || nid("asset"), workspaceId, avatarId: clip(i.avatarId, 60), jobId: clip(i.jobId, 60),
    assetType: clip(i.assetType, 40) || "image", imageUrl: clip(i.imageUrl, 400), prompt: clip(i.prompt, 2000),
    status: ((ASSET_STATUSES as string[]).includes(String(i.status)) ? (String(i.status) as AssetStatus) : "pending_review"),
    qualityStatus: ((QUALITY_STATUSES as string[]).includes(String(i.qualityStatus)) ? (String(i.qualityStatus) as QualityStatus) : "unchecked"),
    qualityScore: score(i.qualityScore), identityScore: score(i.identityScore), styleScore: score(i.styleScore), artifactScore: score(i.artifactScore),
    qualityNotes: clip(i.qualityNotes, 600), sceneKey: clip(i.sceneKey, 60), candidateIndex: num(i.candidateIndex, 0),
    createdAt: i.createdAt || now, updatedAt: now };
}
export function normalizeQuality(s: unknown): QualityStatus { return (QUALITY_STATUSES as string[]).includes(String(s)) ? (String(s) as QualityStatus) : "unchecked"; }
export function score(v: unknown): number | null { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null; }
// Approval gate: an asset may be approved only when its job is done, it is pending_review,
// and quality passed — OR an explicit operator override reason is supplied.
export function canApproveAsset(a: Pick<AvatarAsset, "status" | "qualityStatus">, override?: string): boolean {
  if (a.status !== "pending_review") return false;
  return a.qualityStatus === "passed" || Boolean(override && override.trim());
}

// ============================================================================
// P27.8 — Avatar Identity Intake + Template Cards.
// NOT face recognition: no biometric matching, no impersonation, no identity
// verification. Reference sources are operator-registered metadata that feed
// the passport / identity lock. Prepares the ground for future image identity
// providers (InstantID / PuLID / PhotoMaker) without implementing them here.
// ============================================================================
export type IdentitySourceType = "photo" | "prompt" | "manual";
export type IdentitySourceStatus = "pending_review" | "approved" | "rejected";
export type ConsentStatus = "operator_confirmed" | "unknown";
export interface AvatarIdentitySource {
  id: string; avatarId: string; workspaceId: string;
  type: IdentitySourceType; label: string; fileUrl: string;
  status: IdentitySourceStatus; consentStatus: ConsentStatus;
  createdAt: string; updatedAt: string;
}
export function normalizeIdentitySource(
  workspaceId: string, avatarId: string,
  i: Partial<AvatarIdentitySource> & { consentConfirmed?: boolean },
): AvatarIdentitySource {
  const now = new Date().toISOString();
  const type: IdentitySourceType = i.type === "prompt" || i.type === "manual" ? i.type : "photo";
  const status: IdentitySourceStatus = i.status === "approved" || i.status === "rejected" ? i.status : "pending_review";
  const consentStatus: ConsentStatus = (i.consentStatus === "operator_confirmed" || i.consentConfirmed) ? "operator_confirmed" : "unknown";
  return { id: i.id || nid("idsrc"), avatarId, workspaceId, type,
    label: clip(i.label, 120) || "reference", fileUrl: clip(i.fileUrl, 400),
    status, consentStatus, createdAt: i.createdAt || now, updatedAt: now };
}

// Template cards — deterministic prompt fragments per category. Identity stays locked.
export type TemplateCategory = "emotion" | "pose" | "outfit" | "background" | "camera" | "platform";
export interface TemplateCard { id: string; category: TemplateCategory; value: string; label: string; fragment: string; }
function tcard(category: TemplateCategory, value: string, label: string, fragment: string): TemplateCard {
  return { id: `${category}:${value}`, category, value, label, fragment };
}
export const TEMPLATE_CATEGORIES: TemplateCategory[] = ["emotion", "pose", "outfit", "background", "camera", "platform"];
export const TEMPLATE_CARDS: TemplateCard[] = [
  tcard("emotion", "neutral", "Neutral", "Expression: calm neutral, relaxed face"),
  tcard("emotion", "smile", "Smile", "Expression: warm natural smile"),
  tcard("emotion", "serious", "Serious", "Expression: focused serious look"),
  tcard("emotion", "surprised", "Surprised", "Expression: mild genuine surprise"),
  tcard("emotion", "confident", "Confident", "Expression: calm confident gaze"),
  tcard("pose", "portrait", "Portrait", "Pose: head-and-shoulders portrait"),
  tcard("pose", "half_body", "Half body", "Pose: half-body framing"),
  tcard("pose", "full_body", "Full body", "Pose: full-body standing"),
  tcard("pose", "seated", "Seated", "Pose: seated, natural posture"),
  tcard("pose", "walking", "Walking", "Pose: walking mid-step"),
  tcard("outfit", "casual", "Casual", "Outfit: casual everyday clothing"),
  tcard("outfit", "business", "Business", "Outfit: business formal attire"),
  tcard("outfit", "cyber", "Cyber", "Outfit: cyber / techwear styling"),
  tcard("outfit", "travel", "Travel", "Outfit: travel-ready casual"),
  tcard("outfit", "creator", "Creator", "Outfit: creator / streetwear style"),
  tcard("background", "studio", "Studio", "Background: clean studio backdrop"),
  tcard("background", "city", "City", "Background: urban city street"),
  tcard("background", "office", "Office", "Background: modern office interior"),
  tcard("background", "neon", "Neon", "Background: neon-lit environment"),
  tcard("background", "outdoor", "Outdoor", "Background: natural outdoor setting"),
  tcard("camera", "close_up", "Close-up", "Camera: close-up shot"),
  tcard("camera", "medium_shot", "Medium shot", "Camera: medium shot"),
  tcard("camera", "wide_shot", "Wide shot", "Camera: wide shot"),
  tcard("camera", "cinematic", "Cinematic", "Camera: cinematic composition"),
  tcard("platform", "telegram_post", "Telegram post", "Format: Telegram post framing, 4:5"),
  tcard("platform", "avatar_portrait", "Avatar portrait", "Format: square avatar portrait, 1:1"),
  tcard("platform", "youtube_shorts_cover", "YouTube Shorts cover", "Format: YouTube Shorts cover, 9:16"),
  tcard("platform", "instagram_reel_cover", "Instagram Reel cover", "Format: Instagram Reel cover, 9:16"),
  tcard("platform", "tiktok_cover", "TikTok cover", "Format: TikTok cover, 9:16"),
];
export function getTemplateCard(id: string): TemplateCard | undefined { return TEMPLATE_CARDS.find(c => c.id === id); }
// Merge passport + one template card into a render prompt with identity lock + safety.
export function buildTemplatePrompt(passport: Partial<AvatarPassport> | null, card: TemplateCard): string {
  const identity = (passport?.identityNotes || "reference avatar").trim();
  const style = (passport?.styleNotes || "natural, on-brand").trim();
  const forbidden = (passport?.forbiddenRules && passport.forbiddenRules.length ? passport.forbiddenRules : FORBIDDEN_RULES);
  return [
    `Identity: ${identity}.`,
    `Style: ${style}.`,
    `Template [${card.category}]: ${card.fragment}.`,
    `IDENTITY LOCK: ${IDENTITY_LOCK}`,
    `NEGATIVE / FORBIDDEN: ${forbidden.join("; ")}.`,
  ].join(" ");
}

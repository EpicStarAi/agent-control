import * as db from "@/lib/avatarStudioDb";
import * as store from "@/lib/avatarStudioStore";
import type { Avatar, AvatarPassport, RenderJob, AvatarAsset, AvatarIdentitySource, Project, Character, CharacterRelationship, CharacterProfile, Season, Episode, Scene } from "@/lib/avatarStudio";
import { getProvider, DEFAULT_PROVIDER } from "@/lib/renderProviders";

// P27.1 facade: Postgres when available, else fs. Carries source: "db"|"fallback".
type Src = "db" | "fallback";
async function pick<T>(dbFn: () => Promise<T>, storeFn: () => Promise<T>): Promise<{ data: T; source: Src }> {
  if (db.enabled()) { try { return { data: await dbFn(), source: "db" }; } catch {} }
  return { data: await storeFn(), source: "fallback" };
}

export const listAvatars = (ws: string) => pick(() => db.listAvatars(ws), () => store.listAvatars(ws));
export const getAvatar = (ws: string, id: string) => pick(() => db.getAvatar(ws, id), () => store.getAvatar(ws, id));
export const createAvatar = (ws: string, i: Partial<Avatar>) => pick(() => db.createAvatar(ws, i), () => store.createAvatar(ws, i));
// P29.1 Cast Layer — projects + characters + relationships.
export const listProjects = (ws: string) => pick(() => db.listProjects(ws), () => store.listProjects(ws));
export const getProject = (ws: string, id: string) => pick(() => db.getProject(ws, id), () => store.getProject(ws, id));
export const createProject = (ws: string, i: Partial<Project>) => pick(() => db.createProject(ws, i), () => store.createProject(ws, i));
export const listCharacters = (ws: string, projectId?: string) => pick(() => db.listCharacters(ws, projectId), () => store.listCharacters(ws, projectId));
export const getCharacter = (ws: string, id: string) => pick(() => db.getCharacter(ws, id), () => store.getCharacter(ws, id));
export const createCharacter = (ws: string, i: Partial<Character>) => pick(() => db.createCharacter(ws, i), () => store.createCharacter(ws, i));
export const updateCharacter = (ws: string, id: string, patch: Partial<Character>) => pick(() => db.updateCharacter(ws, id, patch), () => store.updateCharacter(ws, id, patch));
export const deleteCharacter = (ws: string, id: string) => pick(() => db.deleteCharacter(ws, id), () => store.deleteCharacter(ws, id));
export const listRelationships = (ws: string, characterId?: string) => pick(() => db.listRelationships(ws, characterId), () => store.listRelationships(ws, characterId));
export const createRelationship = (ws: string, i: Partial<CharacterRelationship>) => pick(() => db.createRelationship(ws, i), () => store.createRelationship(ws, i));
export const deleteRelationship = (ws: string, id: string) => pick(() => db.deleteRelationship(ws, id), () => store.deleteRelationship(ws, id));
// P29.2 character profiles.
export const getCharacterProfile = (ws: string, cid: string) => pick(() => db.getCharacterProfile(ws, cid), () => store.getCharacterProfile(ws, cid));
export const upsertCharacterProfile = (ws: string, cid: string, i: Partial<CharacterProfile>) => pick(() => db.upsertCharacterProfile(ws, cid, i), () => store.upsertCharacterProfile(ws, cid, i));
// P29.3 story planner — seasons / episodes / scenes.
export const listSeasons = (ws: string, projectId?: string) => pick(() => db.listSeasons(ws, projectId), () => store.listSeasons(ws, projectId));
export const createSeason = (ws: string, i: Partial<Season>) => pick(() => db.createSeason(ws, i), () => store.createSeason(ws, i));
export const listEpisodes = (ws: string, seasonId?: string) => pick(() => db.listEpisodes(ws, seasonId), () => store.listEpisodes(ws, seasonId));
export const createEpisode = (ws: string, i: Partial<Episode>) => pick(() => db.createEpisode(ws, i), () => store.createEpisode(ws, i));
export const listScenes = (ws: string, episodeId?: string) => pick(() => db.listScenes(ws, episodeId), () => store.listScenes(ws, episodeId));
export const getScene = (ws: string, id: string) => pick(() => db.getScene(ws, id), () => store.getScene(ws, id));
export const createScene = (ws: string, i: Partial<Scene>) => pick(() => db.createScene(ws, i), () => store.createScene(ws, i));
export const updateScene = (ws: string, id: string, patch: Partial<Scene>) => pick(() => db.updateScene(ws, id, patch), () => store.updateScene(ws, id, patch));
export const deleteScene = (ws: string, id: string) => pick(() => db.deleteScene(ws, id), () => store.deleteScene(ws, id));
export const getPassport = (ws: string, aid: string) => pick(() => db.getPassport(ws, aid), () => store.getPassport(ws, aid));
export const upsertPassport = (ws: string, aid: string, i: Partial<AvatarPassport>) => pick(() => db.upsertPassport(ws, aid, i), () => store.upsertPassport(ws, aid, i));
export const listJobs = (ws: string) => pick(() => db.listJobs(ws), () => store.listJobs(ws));
export const getJob = (ws: string, id: string) => pick(() => db.getJob(ws, id), () => store.getJob(ws, id));
export const createJob = (ws: string, i: Partial<RenderJob>) => pick(() => db.createJob(ws, i), () => store.createJob(ws, i));
export const setJob = (ws: string, id: string, patch: Partial<RenderJob>) => pick(() => db.setJob(ws, id, patch), () => store.setJob(ws, id, patch));
export const listAssets = (ws: string, aid?: string) => pick(() => db.listAssets(ws, aid), () => store.listAssets(ws, aid));
export const createAsset = (ws: string, i: Partial<AvatarAsset>) => pick(() => db.createAsset(ws, i), () => store.createAsset(ws, i));
export const getAsset = (ws: string, id: string) => pick(() => db.getAsset(ws, id), () => store.getAsset(ws, id));
export const listAssetsByJob = (ws: string, jobId: string) => pick(() => db.listAssetsByJob(ws, jobId), () => store.listAssetsByJob(ws, jobId));
export const setAssetQuality = (ws: string, id: string, patch: Partial<AvatarAsset>) => pick(() => db.setAssetQuality(ws, id, patch), () => store.setAssetQuality(ws, id, patch));
export const setAssetStatusByJob = (ws: string, jobId: string, status: string) => pick(() => db.setAssetStatusByJob(ws, jobId, status), () => store.setAssetStatusByJob(ws, jobId, status));
export const listJobsByStatus = (ws: string, status: string, limit = 20) => pick(() => db.listJobsByStatus(ws, status, limit), () => store.listJobsByStatus(ws, status, limit));
// P27.8 identity sources.
export const listIdentitySources = (ws: string, aid: string) => pick(() => db.listIdentitySources(ws, aid), () => store.listIdentitySources(ws, aid));
export const createIdentitySource = (ws: string, aid: string, i: Partial<AvatarIdentitySource> & { consentConfirmed?: boolean }) => pick(() => db.createIdentitySource(ws, aid, i), () => store.createIdentitySource(ws, aid, i));

// P27.2 mock queue runner — one pass over queued jobs. NO external calls (mock adapter only).
export async function runQueueOnce(ws: string): Promise<{ processed: number; results: { id: string; status: string }[]; source: Src }> {
  const { data: allQueued, source } = await listJobsByStatus(ws, "queued", 20);
  // P30.1 — the mock queue NEVER runs real-browser jobs. grok_imagine_browser is
  // operator-side and processed exactly ONE at a time via runGrokOnce().
  const queued = allQueued.filter(j => j.providerId !== "grok_imagine_browser");
  const results: { id: string; status: string }[] = [];
  for (const job of queued) {
    const attempts = job.attempts + 1;
    await setJob(ws, job.id, { status: "running", startedAt: new Date().toISOString(), attempts });
    const provider = getProvider(job.providerId) || getProvider(DEFAULT_PROVIDER)!;
    try {
      if (!provider.enabled()) {
        await setJob(ws, job.id, { status: "failed", lastError: `NOT_CONFIGURED: ${provider.id}`, providerStatus: "not_configured", providerError: "NOT_CONFIGURED" });
        results.push({ id: job.id, status: "failed" }); continue;
      }
      const created = await provider.createJob({ avatarId: job.avatarId, sceneKey: job.sceneKey, prompt: job.prompt });
      // poll status once (mock returns terminal immediately)
      const r = created.providerJobId ? await provider.getJobStatus(created.providerJobId) : created;
      const url = r.resultUrl || created.resultUrl;
      if ((r.status === "done" || created.status === "done") && url) {
        await setJob(ws, job.id, { status: "done", resultUrl: url, completedAt: new Date().toISOString(), providerJobId: created.providerJobId, providerStatus: r.providerStatus || "succeeded" });
        await createAsset(ws, { avatarId: job.avatarId, jobId: job.id, assetType: "image", imageUrl: url, prompt: job.prompt, status: "pending_review", sceneKey: job.sceneKey, candidateIndex: job.candidateIndex });
        results.push({ id: job.id, status: "done" });
      } else {
        const next = attempts < job.maxAttempts ? "queued" : "failed";
        await setJob(ws, job.id, { status: next, lastError: r.error || created.error || "not done", providerStatus: r.providerStatus, providerError: r.error });
        results.push({ id: job.id, status: next });
      }
    } catch (e) {
      const next = attempts < job.maxAttempts ? "queued" : "failed";
      await setJob(ws, job.id, { status: next, lastError: String((e as Error)?.message || "error").slice(0, 200) });
      results.push({ id: job.id, status: next });
    }
  }
  return { processed: queued.length, results, source };
}

// P27.6 — run exactly ONE queued grok_imagine_browser job (real browser, operator-side).
// Skips requeue on terminal states (LOGIN_REQUIRED / NOT_CONFIGURED). Creates a
// pending_review asset on success (never auto-approved).
export async function runGrokOnce(ws: string): Promise<{ ran: boolean; jobId?: string; status?: string; error?: string; source: Src }> {
  const { data: queued, source } = await listJobsByStatus(ws, "queued", 20);
  const job = queued.find(j => j.providerId === "grok_imagine_browser");
  if (!job) return { ran: false, error: "no queued grok_imagine_browser job", source };
  const provider = getProvider("grok_imagine_browser");
  if (!provider) return { ran: false, error: "provider missing", source };
  const attempts = job.attempts + 1;
  await setJob(ws, job.id, { status: "running", startedAt: new Date().toISOString(), attempts });
  try {
    const r = await provider.createJob({ avatarId: job.avatarId, sceneKey: job.sceneKey, prompt: job.prompt });
    if (r.status === "done" && r.resultUrl) {
      await setJob(ws, job.id, { status: "done", resultUrl: r.resultUrl, completedAt: new Date().toISOString(), providerJobId: r.providerJobId, providerStatus: r.providerStatus });
      await createAsset(ws, { avatarId: job.avatarId, jobId: job.id, assetType: "image", imageUrl: r.resultUrl, prompt: job.prompt, status: "pending_review", sceneKey: job.sceneKey, candidateIndex: job.candidateIndex });
      return { ran: true, jobId: job.id, status: "done", source };
    }
    const terminal = r.error === "LOGIN_REQUIRED" || r.error === "NOT_CONFIGURED" || r.error === "PLAYWRIGHT_UNAVAILABLE" || r.error === "DRY_RUN_OK";
    const next = (!terminal && attempts < job.maxAttempts) ? "queued" : "failed";
    await setJob(ws, job.id, { status: next, lastError: r.error, providerStatus: r.providerStatus, providerError: r.error });
    return { ran: true, jobId: job.id, status: next, error: r.error, source };
  } catch (e) {
    await setJob(ws, job.id, { status: "failed", lastError: String((e as Error)?.message || "error").slice(0, 200) });
    return { ran: true, jobId: job.id, status: "failed", error: "error", source };
  }
}

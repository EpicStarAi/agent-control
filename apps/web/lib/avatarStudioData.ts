import * as db from "@/lib/avatarStudioDb";
import * as store from "@/lib/avatarStudioStore";
import type { Avatar, AvatarPassport, RenderJob, AvatarAsset } from "@/lib/avatarStudio";

// P27.1 facade: Postgres when available, else fs. Carries source: "db"|"fallback".
type Src = "db" | "fallback";
async function pick<T>(dbFn: () => Promise<T>, storeFn: () => Promise<T>): Promise<{ data: T; source: Src }> {
  if (db.enabled()) { try { return { data: await dbFn(), source: "db" }; } catch {} }
  return { data: await storeFn(), source: "fallback" };
}

export const listAvatars = (ws: string) => pick(() => db.listAvatars(ws), () => store.listAvatars(ws));
export const getAvatar = (ws: string, id: string) => pick(() => db.getAvatar(ws, id), () => store.getAvatar(ws, id));
export const createAvatar = (ws: string, i: Partial<Avatar>) => pick(() => db.createAvatar(ws, i), () => store.createAvatar(ws, i));
export const getPassport = (ws: string, aid: string) => pick(() => db.getPassport(ws, aid), () => store.getPassport(ws, aid));
export const upsertPassport = (ws: string, aid: string, i: Partial<AvatarPassport>) => pick(() => db.upsertPassport(ws, aid, i), () => store.upsertPassport(ws, aid, i));
export const listJobs = (ws: string) => pick(() => db.listJobs(ws), () => store.listJobs(ws));
export const getJob = (ws: string, id: string) => pick(() => db.getJob(ws, id), () => store.getJob(ws, id));
export const createJob = (ws: string, i: Partial<RenderJob>) => pick(() => db.createJob(ws, i), () => store.createJob(ws, i));
export const setJob = (ws: string, id: string, patch: Partial<RenderJob>) => pick(() => db.setJob(ws, id, patch), () => store.setJob(ws, id, patch));
export const listAssets = (ws: string, aid?: string) => pick(() => db.listAssets(ws, aid), () => store.listAssets(ws, aid));
export const createAsset = (ws: string, i: Partial<AvatarAsset>) => pick(() => db.createAsset(ws, i), () => store.createAsset(ws, i));
export const setAssetStatusByJob = (ws: string, jobId: string, status: string) => pick(() => db.setAssetStatusByJob(ws, jobId, status), () => store.setAssetStatusByJob(ws, jobId, status));

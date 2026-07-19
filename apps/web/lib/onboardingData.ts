import * as db from "@/lib/onboardingDb";
import * as store from "@/lib/onboardingStore";
import type { OnboardingState } from "@/lib/onboarding";

// Facade: Postgres when available, else fs. Mirrors lib/profileData.ts.
type Src = "db" | "fallback";
export async function getOnboarding(workspaceId: string): Promise<{ state: OnboardingState; source: Src }> {
  if (db.enabled()) { try { return { state: await db.getOnboarding(workspaceId), source: "db" }; } catch {} }
  return { state: store.getOnboarding(workspaceId), source: "fallback" };
}
export async function saveOnboarding(workspaceId: string, input: Partial<OnboardingState>): Promise<{ ok: boolean; state: OnboardingState; source: Src }> {
  if (db.enabled()) { try { return { ...(await db.saveOnboarding(workspaceId, input)), source: "db" }; } catch {} }
  return { ...store.saveOnboarding(workspaceId, input), source: "fallback" };
}

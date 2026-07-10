import * as fsStore from "@/lib/missionStore";
import * as db from "@/lib/missionDb";
import type { Mission, MissionStatus, OperatorEvent } from "@/lib/missions";

// P25.1 data facade. Prefers Postgres (missionDb) when DATABASE_URL + 'pg' are
// present and reachable; otherwise falls back to the local fs store. Never
// crashes the UI: any DB error degrades to fallback. All writes are SIMULATED.

export type Source = "db" | "fallback";

export async function getMissions(): Promise<{ missions: Mission[]; source: Source }> {
  if (db.enabled()) {
    try { return { missions: await db.getMissions(), source: "db" }; }
    catch { /* degrade */ }
  }
  return { missions: fsStore.getMissions(), source: "fallback" };
}

export async function getMission(id: string): Promise<{ mission: Mission | null; source: Source }> {
  if (db.enabled()) {
    try { return { mission: await db.getMission(id), source: "db" }; }
    catch { /* degrade */ }
  }
  return { mission: fsStore.getMission(id), source: "fallback" };
}

export async function updateMissionStatus(id: string, status: MissionStatus, note?: string): Promise<{ ok: boolean; mission?: Mission; event?: OperatorEvent; source: Source; message?: string }> {
  if (db.enabled()) {
    try { const r = await db.updateMissionStatus(id, status, note); return { ...r, source: "db" }; }
    catch { /* degrade */ }
  }
  const r = fsStore.setStatus(id, status, note);
  return { ...r, source: "fallback" };
}

export async function getOperatorEvents(missionId?: string | null): Promise<{ events: OperatorEvent[]; source: Source }> {
  if (db.enabled()) {
    try { return { events: await db.getOperatorEvents(missionId), source: "db" }; }
    catch { /* degrade */ }
  }
  return { events: fsStore.getEvents(missionId), source: "fallback" };
}

export async function appendOperatorEvent(input: Partial<OperatorEvent>): Promise<{ ok: boolean; event?: OperatorEvent; source: Source }> {
  if (db.enabled()) {
    try { const r = await db.appendOperatorEvent(input); return { ...r, source: "db" }; }
    catch { /* degrade */ }
  }
  const r = fsStore.addEvent(input);
  return { ...r, source: "fallback" };
}

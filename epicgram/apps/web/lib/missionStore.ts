import fs from "node:fs";
import path from "node:path";
import {
  MISSIONS, OPERATOR_EVENTS, MISSION_STATUSES,
  type Mission, type MissionStatus, type OperatorEvent
} from "@/lib/missions";

// P24.1 Mission Store — SERVER ONLY (node:fs). Local, simulated, file-backed.
// Absolutely no Telegram / external / production side effects. Write ops only
// append/update the local JSON. Seeded from lib/missions.ts on first use.

type Store = { missions: Mission[]; events: OperatorEvent[] };

const FILE = path.join(process.cwd(), ".mission-data.json");

function seed(): Store {
  return { missions: JSON.parse(JSON.stringify(MISSIONS)), events: JSON.parse(JSON.stringify(OPERATOR_EVENTS)) };
}

function read(): Store {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw) as Store;
    if (Array.isArray(parsed.missions) && Array.isArray(parsed.events)) return parsed;
  } catch { /* missing/corrupt → reseed */ }
  const s = seed();
  write(s);
  return s;
}

function write(s: Store): void {
  try { fs.writeFileSync(FILE, JSON.stringify(s, null, 2), "utf8"); } catch { /* read-only fs: stay in-memory */ }
}

export function getMissions(): Mission[] {
  return read().missions;
}

export function getMission(id: string): Mission | null {
  return read().missions.find((m) => m.id === id) ?? null;
}

export function getEvents(missionId?: string | null): OperatorEvent[] {
  const all = read().events;
  const list = missionId ? all.filter((e) => e.missionId === missionId) : all;
  // newest first
  return [...list].reverse();
}

function nextId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// Simulated status change. No external action — only local state + audit event.
export function setStatus(id: string, status: MissionStatus, note?: string): { ok: boolean; mission?: Mission; event?: OperatorEvent; message?: string } {
  if (!MISSION_STATUSES.includes(status)) return { ok: false, message: "unknown status" };
  const s = read();
  const m = s.missions.find((x) => x.id === id);
  if (!m) return { ok: false, message: "mission not found" };
  const prev = m.status;
  m.status = status;
  m.updatedAt = new Date().toISOString();
  m.auditNotes = [`статус: ${prev} → ${status}${note ? ` (${note})` : ""} · simulated`, ...m.auditNotes].slice(0, 12);
  const evt: OperatorEvent = {
    id: nextId("e"),
    missionId: id,
    sourceOperator: "Operator",
    eventType: "status_changed",
    message: `Миссия «${m.title}»: ${prev} → ${status} (симуляция, без внешних действий)`,
    riskLevel: "none",
    approvalState: m.approvalRequired ? "pending" : "not_required",
    timestamp: m.updatedAt
  };
  s.events.push(evt);
  write(s);
  return { ok: true, mission: m, event: evt };
}

// Append a simulated operator event. No external effects.
export function addEvent(input: Partial<OperatorEvent>): { ok: boolean; event?: OperatorEvent; message?: string } {
  const s = read();
  const evt: OperatorEvent = {
    id: nextId("e"),
    missionId: input.missionId ?? null,
    sourceOperator: String(input.sourceOperator ?? "Operator").slice(0, 60),
    eventType: (input.eventType ?? "logged"),
    message: String(input.message ?? "").slice(0, 400),
    riskLevel: (input.riskLevel ?? "none"),
    approvalState: (input.approvalState ?? "not_required"),
    timestamp: new Date().toISOString()
  };
  s.events.push(evt);
  write(s);
  return { ok: true, event: evt };
}

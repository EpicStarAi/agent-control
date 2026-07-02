import {
  MISSIONS, OPERATOR_EVENTS, MISSION_STATUSES,
  type Mission, type MissionStatus, type OperatorEvent
} from "@/lib/missions";

// P25.1 Postgres adapter — OPTIONAL. Active only when DATABASE_URL is set AND the
// 'pg' driver is installed. Otherwise the data facade (missionData.ts) falls back
// to the local fs store. Non-destructive: CREATE TABLE IF NOT EXISTS + seed-if-empty.
// NO DROP, NO DELETE, NO destructive migrations. No secrets are logged.

type Row = Record<string, unknown>;
type PgPool = { query: (text: string, params?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicPgPool?: PgPool | null; __epicPgInit?: Promise<void> };

export function enabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

async function loadPg(): Promise<any | null> {
  try {
    const name = "pg";
    return await import(/* webpackIgnore: true */ name);
  } catch {
    return null; // driver not installed → fall back
  }
}

async function pool(): Promise<PgPool | null> {
  if (!enabled()) return null;
  if (g.__epicPgPool !== undefined) return g.__epicPgPool;
  const pg = await loadPg();
  const Pool = pg?.Pool ?? pg?.default?.Pool;
  if (!Pool) { g.__epicPgPool = null; return null; }
  g.__epicPgPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 4000 }) as PgPool;
  return g.__epicPgPool;
}

async function ensureInit(p: PgPool): Promise<void> {
  if (!g.__epicPgInit) {
    g.__epicPgInit = (async () => {
      await p.query(`CREATE TABLE IF NOT EXISTS missions (
        id text PRIMARY KEY, title text, description text, owner_operator text, priority text,
        status text, linked_adapters jsonb DEFAULT '[]'::jsonb, approval_required boolean DEFAULT false,
        created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), audit_notes jsonb DEFAULT '[]'::jsonb)`);
      await p.query(`CREATE TABLE IF NOT EXISTS operator_events (
        id text PRIMARY KEY, mission_id text, source_operator text, event_type text, message text,
        risk_level text, approval_state text, timestamp timestamptz DEFAULT now(), payload_json jsonb DEFAULT '{}'::jsonb)`);
      const c = await p.query(`SELECT count(*)::int AS n FROM missions`);
      if (Number(c.rows[0]?.n ?? 0) === 0) {
        for (const m of MISSIONS) {
          await p.query(
            `INSERT INTO missions(id,title,description,owner_operator,priority,status,linked_adapters,approval_required,created_at,updated_at,audit_notes)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
            [m.id, m.title, m.description, m.ownerOperator, m.priority, m.status, JSON.stringify(m.linkedAdapters), m.approvalRequired, m.createdAt, m.updatedAt, JSON.stringify(m.auditNotes)]
          );
        }
        for (const e of OPERATOR_EVENTS) {
          await p.query(
            `INSERT INTO operator_events(id,mission_id,source_operator,event_type,message,risk_level,approval_state,timestamp,payload_json)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,'{}'::jsonb) ON CONFLICT (id) DO NOTHING`,
            [e.id, e.missionId, e.sourceOperator, e.eventType, e.message, e.riskLevel, e.approvalState, e.timestamp]
          );
        }
      }
    })();
  }
  return g.__epicPgInit;
}

async function db(): Promise<PgPool> {
  const p = await pool();
  if (!p) throw new Error("pg unavailable");
  await ensureInit(p);
  return p;
}

function rowToMission(r: any): Mission {
  return {
    id: r.id, title: r.title, description: r.description, ownerOperator: r.owner_operator,
    priority: r.priority, status: r.status,
    linkedAdapters: Array.isArray(r.linked_adapters) ? r.linked_adapters : (r.linked_adapters ?? []),
    approvalRequired: Boolean(r.approval_required),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    auditNotes: Array.isArray(r.audit_notes) ? r.audit_notes : (r.audit_notes ?? [])
  };
}
function rowToEvent(r: any): OperatorEvent {
  return {
    id: r.id, missionId: r.mission_id ?? null, sourceOperator: r.source_operator,
    eventType: r.event_type, message: r.message, riskLevel: r.risk_level,
    approvalState: r.approval_state, timestamp: new Date(r.timestamp).toISOString()
  };
}

export async function getMissions(): Promise<Mission[]> {
  const p = await db();
  const r = await p.query(`SELECT * FROM missions ORDER BY created_at ASC`);
  return r.rows.map(rowToMission);
}

export async function getMission(id: string): Promise<Mission | null> {
  const p = await db();
  const r = await p.query(`SELECT * FROM missions WHERE id=$1`, [id]);
  return r.rows[0] ? rowToMission(r.rows[0]) : null;
}

export async function updateMissionStatus(id: string, status: MissionStatus, note?: string): Promise<{ ok: boolean; mission?: Mission; event?: OperatorEvent; message?: string }> {
  if (!MISSION_STATUSES.includes(status)) return { ok: false, message: "unknown status" };
  const p = await db();
  const cur = await p.query(`SELECT status,title,approval_required FROM missions WHERE id=$1`, [id]);
  if (!cur.rows[0]) return { ok: false, message: "mission not found" };
  const prev = cur.rows[0].status as string;
  const title = cur.rows[0].title as string;
  const approvalRequired = Boolean(cur.rows[0].approval_required);
  const now = new Date().toISOString();
  const auditLine = `статус: ${prev} → ${status}${note ? ` (${note})` : ""} · simulated`;
  const upd = await p.query(
    `UPDATE missions SET status=$2, updated_at=$3, audit_notes = to_jsonb(ARRAY[$4]::text[]) || audit_notes WHERE id=$1 RETURNING *`,
    [id, status, now, auditLine]
  );
  const evId = `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const evMsg = `Миссия «${title}»: ${prev} → ${status} (симуляция, без внешних действий)`;
  const approvalState = approvalRequired ? "pending" : "not_required";
  await p.query(
    `INSERT INTO operator_events(id,mission_id,source_operator,event_type,message,risk_level,approval_state,timestamp,payload_json)
     VALUES($1,$2,'Operator','status_changed',$3,'none',$4,$5,'{}'::jsonb)`,
    [evId, id, evMsg, approvalState, now]
  );
  const event: OperatorEvent = { id: evId, missionId: id, sourceOperator: "Operator", eventType: "status_changed", message: evMsg, riskLevel: "none", approvalState: approvalState as OperatorEvent["approvalState"], timestamp: now };
  return { ok: true, mission: rowToMission(upd.rows[0]), event };
}

export async function getOperatorEvents(missionId?: string | null): Promise<OperatorEvent[]> {
  const p = await db();
  const r = missionId
    ? await p.query(`SELECT * FROM operator_events WHERE mission_id=$1 ORDER BY timestamp DESC LIMIT 200`, [missionId])
    : await p.query(`SELECT * FROM operator_events ORDER BY timestamp DESC LIMIT 200`);
  return r.rows.map(rowToEvent);
}

export async function appendOperatorEvent(input: Partial<OperatorEvent>): Promise<{ ok: boolean; event?: OperatorEvent }> {
  const p = await db();
  const now = new Date().toISOString();
  const event: OperatorEvent = {
    id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    missionId: input.missionId ?? null,
    sourceOperator: String(input.sourceOperator ?? "Operator").slice(0, 60),
    eventType: (input.eventType ?? "logged") as OperatorEvent["eventType"],
    message: String(input.message ?? "").slice(0, 400),
    riskLevel: (input.riskLevel ?? "none") as OperatorEvent["riskLevel"],
    approvalState: (input.approvalState ?? "not_required") as OperatorEvent["approvalState"],
    timestamp: now
  };
  await p.query(
    `INSERT INTO operator_events(id,mission_id,source_operator,event_type,message,risk_level,approval_state,timestamp,payload_json)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,'{}'::jsonb)`,
    [event.id, event.missionId, event.sourceOperator, event.eventType, event.message, event.riskLevel, event.approvalState, event.timestamp]
  );
  return { ok: true, event };
}

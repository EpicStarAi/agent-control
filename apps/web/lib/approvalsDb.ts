import {
  APPROVAL_SEED, canApprove, canReject, canCancel, newApprovalId,
  type ApprovalAction, type ApprovalStatus, type RiskLevel
} from "@/lib/approvals";

// P26.1 Postgres adapter for the Approval Gate. Active only when DATABASE_URL is set
// AND 'pg' is installed; otherwise the facade (approvalsData.ts) falls back to fs.
// Non-destructive: CREATE TABLE IF NOT EXISTS + seed-if-empty. NO DROP / NO DELETE.
// No external side effects; approve/reject/cancel only change rows. No secrets logged.

type Row = Record<string, unknown>;
type PgPool = { query: (text: string, params?: unknown[]) => Promise<{ rows: Row[] }> };
const g = globalThis as unknown as { __epicPgPool?: PgPool | null; __epicApprovalInit?: Promise<void> };

export function enabled(): boolean { return Boolean(process.env.DATABASE_URL); }

async function loadPg(): Promise<any | null> {
  try { const name = "pg"; return await import(/* webpackIgnore: true */ name); }
  catch { return null; }
}
async function pool(): Promise<PgPool | null> {
  if (!enabled()) return null;
  if (g.__epicPgPool !== undefined && g.__epicPgPool !== null) return g.__epicPgPool;
  const pg = await loadPg();
  const Pool = pg?.Pool ?? pg?.default?.Pool;
  if (!Pool) { g.__epicPgPool = null; return null; }
  g.__epicPgPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 4000 }) as PgPool;
  return g.__epicPgPool;
}
async function ensureInit(p: PgPool): Promise<void> {
  if (!g.__epicApprovalInit) {
    g.__epicApprovalInit = (async () => {
      await p.query(`CREATE TABLE IF NOT EXISTS approval_actions (
        id text PRIMARY KEY, type text, title text, description text, risk_level text,
        source_agent text, target_module text, payload jsonb DEFAULT '{}'::jsonb,
        status text DEFAULT 'waiting_approval', created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(), approved_by text, execution_result jsonb)`);
      const c = await p.query(`SELECT count(*)::int AS n FROM approval_actions`);
      if (Number(c.rows[0]?.n ?? 0) === 0) {
        for (const a of APPROVAL_SEED) {
          await p.query(
            `INSERT INTO approval_actions(id,type,title,description,risk_level,source_agent,target_module,payload,status,created_at,updated_at,approved_by,execution_result)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
            [a.id,a.type,a.title,a.description,a.riskLevel,a.sourceAgent,a.targetModule,JSON.stringify(a.payload),a.status,a.createdAt,a.updatedAt,a.approvedBy,a.executionResult]
          );
        }
      }
    })();
  }
  return g.__epicApprovalInit;
}
async function db(): Promise<PgPool> {
  const p = await pool();
  if (!p) throw new Error("pg unavailable");
  await ensureInit(p);
  return p;
}

function rowTo(r: any): ApprovalAction {
  return {
    id: r.id, type: r.type, title: r.title, description: r.description,
    riskLevel: r.risk_level, sourceAgent: r.source_agent, targetModule: r.target_module,
    payload: (r.payload && typeof r.payload === "object") ? r.payload : {},
    status: r.status, createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    approvedBy: r.approved_by ?? null,
    executionResult: (r.execution_result && typeof r.execution_result === "object") ? r.execution_result : null,
  };
}

export async function list(status?: ApprovalStatus | null): Promise<ApprovalAction[]> {
  const p = await db();
  const r = status
    ? await p.query(`SELECT * FROM approval_actions WHERE status=$1 ORDER BY created_at DESC LIMIT 200`, [status])
    : await p.query(`SELECT * FROM approval_actions ORDER BY created_at DESC LIMIT 200`);
  return r.rows.map(rowTo);
}
export async function get(id: string): Promise<ApprovalAction | null> {
  const p = await db();
  const r = await p.query(`SELECT * FROM approval_actions WHERE id=$1`, [id]);
  return r.rows[0] ? rowTo(r.rows[0]) : null;
}
export async function create(input: Partial<ApprovalAction>): Promise<{ ok: boolean; item?: ApprovalAction; message?: string }> {
  const p = await db();
  const now = new Date().toISOString();
  const id = newApprovalId();
  const r = await p.query(
    `INSERT INTO approval_actions(id,type,title,description,risk_level,source_agent,target_module,payload,status,created_at,updated_at,approved_by,execution_result)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,'waiting_approval',$9,$9,NULL,NULL) RETURNING *`,
    [id, String(input.type ?? "generic.action").slice(0,80), String(input.title ?? "Без названия").slice(0,200),
     String(input.description ?? "").slice(0,1000), (input.riskLevel ?? "low") as RiskLevel,
     String(input.sourceAgent ?? "AI-Operator").slice(0,80), String(input.targetModule ?? "unspecified").slice(0,80),
     JSON.stringify(input.payload && typeof input.payload === "object" ? input.payload : {}), now]
  );
  return { ok: true, item: rowTo(r.rows[0]) };
}
async function transition(id: string, action: "approve"|"reject"|"cancel", by?: string) {
  const p = await db();
  const cur = await p.query(`SELECT status FROM approval_actions WHERE id=$1`, [id]);
  if (!cur.rows[0]) return { ok: false, message: "approval not found" };
  const st = cur.rows[0].status as ApprovalStatus;
  const guard = action === "approve" ? canApprove : action === "reject" ? canReject : canCancel;
  if (!guard(st)) return { ok: false, message: `cannot ${action} from status ${st}` };
  const next = (action === "approve" ? "approved" : action === "reject" ? "rejected" : "cancelled") as ApprovalStatus;
  const now = new Date().toISOString();
  const approvedBy = action === "approve" ? (by ? String(by).slice(0,80) : "operator") : null;
  // approve does NOT execute anything — MANUAL_APPROVAL_ONLY. Execution stub is P26.5.
  const r = await p.query(
    `UPDATE approval_actions SET status=$2, updated_at=$3, approved_by=COALESCE($4,approved_by) WHERE id=$1 RETURNING *`,
    [id, next, now, approvedBy]
  );
  return { ok: true, item: rowTo(r.rows[0]) };
}
export const approve = (id: string, by?: string) => transition(id, "approve", by);
export const reject = (id: string, by?: string) => transition(id, "reject", by);
export const cancel = (id: string, by?: string) => transition(id, "cancel", by);

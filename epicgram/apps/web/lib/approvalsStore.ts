import fs from "node:fs";
import path from "node:path";
import {
  APPROVAL_SEED, canApprove, canReject, canCancel, newApprovalId,
  type ApprovalAction, type ApprovalStatus, type RiskLevel
} from "@/lib/approvals";

// P26.1 fs fallback store for the Approval Gate. Used when Postgres (DATABASE_URL)
// is unavailable. Non-destructive: seeds once, then persists to a JSON file.
// No external side effects — approve/reject/cancel only mutate local state.

const FILE = path.join(process.cwd(), ".approval-data.json");

type DB = { approvals: ApprovalAction[] };

function load(): DB {
  try {
    if (fs.existsSync(FILE)) return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch { /* ignore, reseed */ }
  const seed: DB = { approvals: APPROVAL_SEED.map(a => ({ ...a })) };
  save(seed);
  return seed;
}
function save(db: DB) {
  try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); } catch { /* best effort */ }
}

export function list(status?: ApprovalStatus | null): ApprovalAction[] {
  const db = load();
  const all = db.approvals.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return status ? all.filter(a => a.status === status) : all;
}

export function get(id: string): ApprovalAction | null {
  return load().approvals.find(a => a.id === id) ?? null;
}

export function create(input: Partial<ApprovalAction>): { ok: boolean; item?: ApprovalAction; message?: string } {
  const db = load();
  const now = new Date().toISOString();
  const item: ApprovalAction = {
    id: newApprovalId(),
    type: String(input.type ?? "generic.action").slice(0, 80),
    title: String(input.title ?? "Без названия").slice(0, 200),
    description: String(input.description ?? "").slice(0, 1000),
    riskLevel: (input.riskLevel ?? "low") as RiskLevel,
    sourceAgent: String(input.sourceAgent ?? "AI-Operator").slice(0, 80),
    targetModule: String(input.targetModule ?? "unspecified").slice(0, 80),
    payload: (input.payload && typeof input.payload === "object" ? input.payload : {}) as Record<string, unknown>,
    status: "waiting_approval",
    createdAt: now, updatedAt: now, approvedBy: null, executionResult: null,
  };
  db.approvals.unshift(item);
  save(db);
  return { ok: true, item };
}

function transition(id: string, action: "approve" | "reject" | "cancel", by?: string) {
  const db = load();
  const item = db.approvals.find(a => a.id === id);
  if (!item) return { ok: false, message: "approval not found" };
  const guard = action === "approve" ? canApprove : action === "reject" ? canReject : canCancel;
  if (!guard(item.status)) return { ok: false, message: `cannot ${action} from status ${item.status}` };
  item.status = (action === "approve" ? "approved" : action === "reject" ? "rejected" : "cancelled") as ApprovalStatus;
  item.updatedAt = new Date().toISOString();
  if (action === "approve") item.approvedBy = by ? String(by).slice(0, 80) : "operator";
  // NOTE: approve does NOT execute anything. Execution is a later stub (P26.5).
  save(db);
  return { ok: true, item };
}

export const approve = (id: string, by?: string) => transition(id, "approve", by);
export const reject = (id: string, by?: string) => transition(id, "reject", by);
export const cancel = (id: string, by?: string) => transition(id, "cancel", by);

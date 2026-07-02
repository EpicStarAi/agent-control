import * as db from "@/lib/approvalsDb";
import * as store from "@/lib/approvalsStore";
import type { ApprovalAction, ApprovalStatus } from "@/lib/approvals";

// P26.1 data facade: prefer Postgres when DATABASE_URL is set and reachable,
// otherwise degrade to the fs store. Every result carries `source: "db"|"fallback"`.
// Mirrors the missionData facade so the Approval Gate behaves identically to
// Mission Center under DB / fallback conditions.

type Src = "db" | "fallback";

export async function listApprovals(status?: ApprovalStatus | null): Promise<{ approvals: ApprovalAction[]; source: Src }> {
  if (db.enabled()) { try { return { approvals: await db.list(status ?? null), source: "db" }; } catch { /* fall through */ } }
  return { approvals: store.list(status ?? null), source: "fallback" };
}

export async function getApproval(id: string): Promise<{ approval: ApprovalAction | null; source: Src }> {
  if (db.enabled()) { try { return { approval: await db.get(id), source: "db" }; } catch { /* fall through */ } }
  return { approval: store.get(id), source: "fallback" };
}

export async function createApproval(input: Partial<ApprovalAction>): Promise<{ ok: boolean; item?: ApprovalAction; message?: string; source: Src }> {
  if (db.enabled()) { try { const r = await db.create(input); return { ...r, source: "db" }; } catch { /* fall through */ } }
  return { ...store.create(input), source: "fallback" };
}

async function act(kind: "approve" | "reject" | "cancel", id: string, by?: string): Promise<{ ok: boolean; item?: ApprovalAction; message?: string; source: Src }> {
  if (db.enabled()) {
    try {
      const r = kind === "approve" ? await db.approve(id, by) : kind === "reject" ? await db.reject(id, by) : await db.cancel(id, by);
      return { ...r, source: "db" };
    } catch { /* fall through */ }
  }
  const r = kind === "approve" ? store.approve(id, by) : kind === "reject" ? store.reject(id, by) : store.cancel(id, by);
  return { ...r, source: "fallback" };
}

export const approveApproval = (id: string, by?: string) => act("approve", id, by);
export const rejectApproval = (id: string, by?: string) => act("reject", id, by);
export const cancelApproval = (id: string, by?: string) => act("cancel", id, by);

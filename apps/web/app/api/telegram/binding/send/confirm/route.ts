// POST /api/telegram/binding/send/confirm — STEP 2 of the send approval gate.
// The user confirms an existing approval. Double-confirm actions require two
// distinct confirm calls (stage: pending -> confirmed1 -> confirmed). Nothing about
// the payload (text/media/chat/action) can change here — only the stage advances.
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal, resolveBoundAccount } from "@/lib/telegramGuard";
import * as ap from "@/lib/telegramSendApprovals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const H = { "cache-control": "private, no-store, must-revalidate", pragma: "no-cache" };

export async function POST(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/send/confirm", "POST");
  if (!auth.ok) return auth.response;
  const principal = auth.principal;

  const bound = await resolveBoundAccount(principal);
  if (bound.kind === "mismatch") return NextResponse.json({ ok: false, reason: "owner_mismatch" }, { status: 403, headers: H });
  if (bound.kind !== "ok") return NextResponse.json({ ok: false, reason: "no_binding" }, { status: 409, headers: H });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400, headers: H }); }
  const approvalId = String(body.approvalId ?? "").trim();
  const token = String(body.token ?? "");
  if (!approvalId || !token) return NextResponse.json({ ok: false, reason: "approval_id_and_token_required" }, { status: 400, headers: H });

  let a;
  try {
    a = await ap.getApproval(approvalId);
  } catch (error) {
    if (ap.isApprovalStorageUnavailable(error)) {
      return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "approval_storage_unavailable" }, { status: 503, headers: H });
    }
    throw error;
  }
  const deny = async (code: string, http = 409) => {
    await ap.audit({ approvalId, workspaceId: principal.workspaceId, userId: principal.userId, accountId: bound.accountId, actionType: a?.actionType ?? null, stage: "confirm", outcome: "denied", errorCode: code });
    return NextResponse.json({ ok: false, reason: code }, { status: http, headers: H });
  };
  if (!a) return deny("approval_not_found", 404);
  if (a.userId !== principal.userId || a.workspaceId !== principal.workspaceId) return deny("not_your_approval", 403);
  if (a.accountId !== bound.accountId) return deny("account_mismatch", 403);
  if (a.tokenHash !== ap.sha256(token)) return deny("bad_token", 403);
  if (a.status === "consumed") return deny("already_consumed");
  if (a.status === "rejected") return deny("rejected");
  if (ap.isExpired(a)) { await ap.markExpired(a.id); return deny("expired"); }
  if (a.status !== "pending") return deny("bad_status");

  // Advance stage. Double-confirm actions need two calls.
  if (a.requiresSecondConfirm && a.confirmStage === "pending") {
    await ap.setStage(a.id, "confirmed1", "pending");
    await ap.audit({ approvalId: a.id, workspaceId: principal.workspaceId, userId: principal.userId, accountId: a.accountId, chatId: a.chatId, actionType: a.actionType, payloadHash: a.payloadHash, confirmStage: "confirmed1", stage: "confirm", outcome: "ok" });
    return NextResponse.json({ ok: true, stage: "confirmed1", needsSecondConfirmation: true, message: "Требуется финальное подтверждение необратимого действия." }, { headers: H });
  }

  await ap.setStage(a.id, "confirmed", "confirmed");
  await ap.audit({ approvalId: a.id, workspaceId: principal.workspaceId, userId: principal.userId, accountId: a.accountId, chatId: a.chatId, actionType: a.actionType, payloadHash: a.payloadHash, confirmStage: "confirmed", stage: "confirm", outcome: "ok" });
  return NextResponse.json({ ok: true, stage: "confirmed", needsSecondConfirmation: false, readyToExecute: true }, { headers: H });
}

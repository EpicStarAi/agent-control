// POST /api/telegram/binding/send — STEP 3: execute a confirmed approval.
// Re-verifies EVERYTHING at execute time: auth user, slot ownership, allowlist,
// recomputed payload hash, TTL, single-use. operatorApproved is set ONLY here,
// server-side, after all checks pass. Sends STRICTLY through the bound per-account
// runtime — never the legacy singleton. Global kill-switch: TELEGRAM_MUTATION.
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal, resolveBoundAccount, telegramMutationsEnabled, denyMutation } from "@/lib/telegramGuard";
import { assertChatBelongsToBoundAccount, sendTextThroughSlot } from "@/lib/telegramBindingService";
import { getRuntimeFlags } from "@/lib/runtimeFlags";
import * as ap from "@/lib/telegramSendApprovals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const H = { "cache-control": "private, no-store, must-revalidate", pragma: "no-cache" };

export async function POST(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/send", "POST");
  if (!auth.ok) return auth.response;
  const principal = auth.principal;

  // Global mutation kill-switch. Default OFF.
  if (!telegramMutationsEnabled()) return denyMutation("/api/telegram/binding/send", "POST", principal, "send_disabled");
  if (!getRuntimeFlags().telegramSendEnabled) return denyMutation("/api/telegram/binding/send", "POST", principal, "send_flag_disabled");

  const bound = await resolveBoundAccount(principal);
  if (bound.kind === "mismatch") return NextResponse.json({ sent: false, reason: "owner_mismatch" }, { status: 403, headers: H });
  if (bound.kind !== "ok") return NextResponse.json({ sent: false, reason: "no_binding" }, { status: 409, headers: H });
  const accountId = bound.accountId;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ sent: false, reason: "bad_json" }, { status: 400, headers: H }); }
  const approvalId = String(body.approvalId ?? "").trim();
  const token = String(body.token ?? "");
  const chatId = String(body.chatId ?? "").trim();
  const actionType = String(body.actionType ?? "send_text").trim();
  const text = typeof body.text === "string" ? body.text : null;
  const mediaRef = typeof body.mediaRef === "string" ? body.mediaRef : null;
  const caption = typeof body.caption === "string" ? body.caption : null;

  let a;
  try {
    a = await ap.getApproval(approvalId);
  } catch (error) {
    if (ap.isApprovalStorageUnavailable(error)) {
      return NextResponse.json({ sent: false, reason: error instanceof Error ? error.message : "approval_storage_unavailable" }, { status: 503, headers: H });
    }
    throw error;
  }
  const deny = async (code: string, http = 409) => {
    await ap.audit({ approvalId, workspaceId: principal.workspaceId, userId: principal.userId, accountId, chatId, actionType, confirmStage: a?.confirmStage ?? null, stage: "execute", outcome: "denied", errorCode: code });
    return NextResponse.json({ sent: false, reason: code }, { status: http, headers: H });
  };
  if (!approvalId || !token) return deny("approval_id_and_token_required", 400);
  if (!a) return deny("approval_not_found", 404);
  if (a.userId !== principal.userId || a.workspaceId !== principal.workspaceId) return deny("not_your_approval", 403);
  if (a.accountId !== accountId) return deny("account_mismatch", 403);
  if (a.tokenHash !== ap.sha256(token)) return deny("bad_token", 403);
  if (a.chatId !== chatId || a.actionType !== actionType) return deny("payload_binding_mismatch", 409);
  if (ap.isExpired(a)) { await ap.markExpired(a.id); return deny("expired"); }
  if (a.status === "consumed") return deny("replay_denied");
  if (a.status !== "confirmed") return deny("not_confirmed");

  // Re-check the allowlist at execute time too.
  try {
    if (!(await ap.isAllowed({ userId: principal.userId, accountId, chatId, actionType }))) return deny("not_allowlisted", 403);
  } catch (error) {
    if (ap.isApprovalStorageUnavailable(error)) {
      return NextResponse.json({ sent: false, reason: error instanceof Error ? error.message : "approval_storage_unavailable" }, { status: 503, headers: H });
    }
    throw error;
  }

  // Re-check chat ownership at execute time too. A prepared approval must not
  // survive a binding switch, logout, authorization loss or inaccessible chat.
  const ownedChat = await assertChatBelongsToBoundAccount(principal, chatId);
  if (!ownedChat.ok) return deny(ownedChat.reason, 403);
  if (ownedChat.accountId !== accountId) return deny("account_mismatch", 403);

  // Recompute the hash from the ACTUAL payload — text/media/caption cannot be swapped post-approval.
  const recomputed = ap.payloadHash({ accountId, chatId, actionType, text, mediaRef, caption });
  if (recomputed !== a.payloadHash) return deny("payload_hash_mismatch", 409);

  // Media is not yet executable by the per-account runtime. Fail BEFORE consuming
  // so the approval is not burned; never fall back to any legacy path.
  if (ap.MEDIA_ACTIONS.has(actionType)) {
    await ap.audit({ approvalId: a.id, workspaceId: principal.workspaceId, userId: principal.userId, accountId, chatId, actionType, payloadHash: a.payloadHash, confirmStage: a.confirmStage, stage: "execute", outcome: "failed", errorCode: "runtime_media_unsupported" });
    return NextResponse.json({ sent: false, reason: "runtime_media_unsupported", message: "Отправка медиа не поддержана per-account runtime (нужна доработка бэкенда)." }, { status: 501, headers: H });
  }

  // Atomic single-use consume: only one execute can win.
  const won = await ap.consumeApproval(a.id);
  if (!won) return deny("replay_denied");

  // Send strictly through the bound slot. operatorApproved is set server-side inside the helper.
  const result = await sendTextThroughSlot(accountId, chatId, String(text ?? ""), actionType);
  await ap.audit({
    approvalId: a.id, workspaceId: principal.workspaceId, userId: principal.userId, accountId, chatId, actionType,
    payloadHash: a.payloadHash, confirmStage: a.confirmStage, stage: "execute",
    outcome: result.ok ? "ok" : "failed", errorCode: result.ok ? null : (result.code ?? "send_failed"),
    telegramMessageId: result.telegramMessageId,
  });

  return NextResponse.json({
    sent: result.ok,
    approvalId: a.id,
    accountIdMasked: accountId.slice(0, 4) + "***" + accountId.slice(-2),
    chatId,
    actionType,
    telegramMessageId: result.telegramMessageId,
    code: result.ok ? "SENT" : (result.code ?? "SEND_FAILED"),
    message: result.message ?? null,
  }, { status: result.ok ? 200 : 409, headers: H });
}

// POST /api/telegram/binding/send/prepare — STEP 1 of the send approval gate.
// Resolves the bound account server-side, verifies chat ownership + allowlist,
// builds an IMMUTABLE payload, hashes it, and mints a single-use TTL approval.
// It NEVER sends. accountId is never taken from the client.
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal, resolveBoundAccount } from "@/lib/telegramGuard";
import { assertChatBelongsToBoundAccount } from "@/lib/telegramBindingService";
import * as ap from "@/lib/telegramSendApprovals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const H = { "cache-control": "private, no-store, must-revalidate", pragma: "no-cache" };

export async function POST(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/send/prepare", "POST");
  if (!auth.ok) return auth.response;
  const principal = auth.principal;

  const bound = await resolveBoundAccount(principal);
  if (bound.kind === "mismatch") return NextResponse.json({ ok: false, reason: "owner_mismatch" }, { status: 403, headers: H });
  if (bound.kind !== "ok") return NextResponse.json({ ok: false, reason: "no_binding" }, { status: 409, headers: H });
  const accountId = bound.accountId;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400, headers: H }); }
  const chatId = String(body.chatId ?? "").trim();
  const actionType = String(body.actionType ?? "send_text").trim();
  const text = typeof body.text === "string" ? body.text : null;
  const mediaRef = typeof body.mediaRef === "string" ? body.mediaRef : null;
  const caption = typeof body.caption === "string" ? body.caption : null;

  if (!chatId) return NextResponse.json({ ok: false, reason: "chat_id_required" }, { status: 400, headers: H });
  if (!ap.ALL_ACTIONS.has(actionType)) return NextResponse.json({ ok: false, reason: "unknown_action" }, { status: 400, headers: H });
  const isMedia = ap.MEDIA_ACTIONS.has(actionType);
  if (!isMedia && (!text || !text.trim())) return NextResponse.json({ ok: false, reason: "text_required" }, { status: 400, headers: H });

  // Allowlist: bound to user + account + chat + action. Never global.
  let allowed = false;
  try {
    allowed = await ap.isAllowed({ userId: principal.userId, accountId, chatId, actionType });
  } catch (error) {
    if (ap.isApprovalStorageUnavailable(error)) {
      return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "approval_storage_unavailable" }, { status: 503, headers: H });
    }
    throw error;
  }
  if (!allowed) {
    await ap.audit({ workspaceId: principal.workspaceId, userId: principal.userId, accountId, chatId, actionType, stage: "prepare", outcome: "denied", errorCode: "not_allowlisted" });
    return NextResponse.json({ ok: false, reason: "not_allowlisted" }, { status: 403, headers: H });
  }

  const ownedChat = await assertChatBelongsToBoundAccount(principal, chatId);
  if (!ownedChat.ok) {
    await ap.audit({ workspaceId: principal.workspaceId, userId: principal.userId, accountId, chatId, actionType, stage: "prepare", outcome: "denied", errorCode: ownedChat.reason });
    return NextResponse.json({ ok: false, reason: ownedChat.reason }, { status: 403, headers: H });
  }
  const chat = ownedChat.chat;
  const category = String(chat.category ?? chat.type ?? "chat");
  const isChannel = Boolean(chat.isChannel) || category === "channel";

  // Channel publish must use the publish_channel action (double-confirm), not send_text.
  if (isChannel && actionType === "send_text") {
    return NextResponse.json({ ok: false, reason: "use_publish_channel_for_channel" }, { status: 400, headers: H });
  }

  const requiresSecondConfirm = ap.DOUBLE_CONFIRM_ACTIONS.has(actionType) || isChannel;
  const ph = ap.payloadHash({ accountId, chatId, actionType, text, mediaRef, caption });
  // Preview is redacted: marker + action + type only. No message body is stored.
  const preview = `action=${actionType} category=${category} title_present=${Boolean(chat.title)} media=${isMedia ? (mediaRef ? "ref" : "missing") : "no"}`;

  let created;
  try {
    created = await ap.createApproval({
      workspaceId: principal.workspaceId, userId: principal.userId, accountId, chatId, actionType,
      payloadHash: ph, preview, requiresSecondConfirm,
    });
  } catch (error) {
    if (ap.isApprovalStorageUnavailable(error)) {
      return NextResponse.json({ ok: false, reason: error instanceof Error ? error.message : "approval_storage_unavailable" }, { status: 503, headers: H });
    }
    throw error;
  }
  await ap.audit({ approvalId: created.id, workspaceId: principal.workspaceId, userId: principal.userId, accountId, chatId, actionType, payloadHash: ph, confirmStage: "pending", stage: "prepare", outcome: "ok" });

  return NextResponse.json({
    ok: true,
    approvalId: created.id,
    token: created.token,
    payloadHash: ph,
    requiresSecondConfirm,
    expiresAt: created.expiresAt,
    mediaSupported: !isMedia,
    preview: { accountIdMasked: accountId.slice(0, 4) + "***" + accountId.slice(-2), chatId, chatTitle: chat.title ?? null, category, actionType },
  }, { headers: H });
}

// POST /api/telegram/binding/send/allowlist
// Owner-only local allowlist registration for a chat that belongs to the
// current bound TDLib account. This does not send and does not trust accountId
// from the client.

import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal, resolveBoundAccount } from "@/lib/telegramGuard";
import { assertChatBelongsToBoundAccount } from "@/lib/telegramBindingService";
import * as ap from "@/lib/telegramSendApprovals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const H = { "cache-control": "private, no-store, must-revalidate", pragma: "no-cache" };

export async function POST(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/send/allowlist", "POST");
  if (!auth.ok) return auth.response;
  const principal = auth.principal;
  if (principal.role !== "owner") {
    return NextResponse.json({ ok: false, reason: "owner_role_required" }, { status: 403, headers: H });
  }

  const bound = await resolveBoundAccount(principal);
  if (bound.kind === "mismatch") return NextResponse.json({ ok: false, reason: "owner_mismatch" }, { status: 403, headers: H });
  if (bound.kind !== "ok") return NextResponse.json({ ok: false, reason: "no_binding" }, { status: 409, headers: H });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400, headers: H }); }

  const chatId = String(body.chatId ?? "").trim();
  const actionType = String(body.actionType ?? "send_text").trim();
  const label = typeof body.label === "string" ? body.label.slice(0, 160) : undefined;
  if (!chatId) return NextResponse.json({ ok: false, reason: "chat_id_required" }, { status: 400, headers: H });
  if (!ap.ALL_ACTIONS.has(actionType)) return NextResponse.json({ ok: false, reason: "unknown_action" }, { status: 400, headers: H });

  const ownedChat = await assertChatBelongsToBoundAccount(principal, chatId);
  if (!ownedChat.ok || ownedChat.accountId !== bound.accountId) {
    return NextResponse.json({ ok: false, reason: ownedChat.ok ? "account_mismatch" : ownedChat.reason }, { status: 403, headers: H });
  }

  await ap.addAllowlist({
    workspaceId: principal.workspaceId,
    userId: principal.userId,
    accountId: bound.accountId,
    chatId,
    actionType,
    label: label ?? String(ownedChat.chat.title ?? "Telegram chat"),
  });

  return NextResponse.json({
    ok: true,
    accountIdMasked: bound.accountId.slice(0, 4) + "***" + bound.accountId.slice(-2),
    chatId,
    actionType,
    chatTitle: ownedChat.chat.title ?? null,
  }, { headers: H });
}

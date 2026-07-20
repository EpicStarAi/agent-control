import { NextResponse } from "next/server";
import {
  getPrincipal,
  resolveBoundAccount,
  telegramMutationsEnabled,
  denyMutation,
} from "@/lib/telegramGuard";
import { assertChatBelongsToBoundAccount } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";

// P3.8b: schedule enqueue proxy. Forwards an operator-approved schedule request
// to the backend queue. It ONLY enqueues — it NEVER sends a Telegram message and
// never calls /api/telegram/send. Actual publish happens later via manual tick.
//
// Because a queued item is a send that will happen, this is treated as a mutator
// and gated exactly like /api/telegram/binding/send:
//   1. authenticated session required            -> 401
//   2. global TELEGRAM_MUTATION kill-switch       -> 403 when disabled
//   3. owner-matched, ready binding required      -> 403 when absent/mismatched
// The target account is resolved SERVER-SIDE from the caller's binding; the
// client-supplied accountId is ignored entirely. operatorApproved is likewise
// set by the server and is only ever reachable AFTER the gate above passes —
// it is no longer an unconditional, client-trusted flag.
const API_BASE_URL =
  process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

const H = { "cache-control": "no-store" } as const;

export async function POST(req: Request) {
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
      { status: 401, headers: H }
    );
  }

  if (!telegramMutationsEnabled()) {
    return denyMutation("/api/operator/schedule", "POST", principal, "schedule_disabled");
  }

  const bound = await resolveBoundAccount(principal);
  if (bound.kind !== "ok") {
    return NextResponse.json(
      { ok: false, ownerMatched: bound.kind !== "mismatch", error: "no_binding", message: "К вашему профилю не привязан owner-matched Telegram-аккаунт." },
      { status: 403, headers: H }
    );
  }
  // Server-resolved slot — the client cannot choose which account to schedule on.
  const accountId = bound.accountId;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const text = typeof body?.text === "string" ? body.text : "";
  const dueAt = typeof body?.dueAt === "string" ? body.dueAt : "";
  const auditId = typeof body?.auditId === "string" ? body.auditId : undefined;
  // Use the operator-selected chat only — AI-provided arbitrary target is ignored.
  const chatId = typeof body?.chatId === "string" ? body.chatId : "";

  // Safe log only — no full private message bodies.
  console.log(
    `[operator/schedule] chatId=${chatId || "-"} dueAt=${dueAt || "-"} auditId=${auditId || "-"} len=${text.length}`,
  );

  if (!chatId) return NextResponse.json({ ok: false, error: "no_selected_chat" }, { status: 200, headers: H });
  if (!dueAt) return NextResponse.json({ ok: false, error: "no_dueAt" }, { status: 200, headers: H });
  if (!text.trim()) return NextResponse.json({ ok: false, error: "no_text" }, { status: 200, headers: H });

  const ownedChat = await assertChatBelongsToBoundAccount(principal, chatId);
  if (!ownedChat.ok) {
    return NextResponse.json({ ok: false, error: ownedChat.reason }, { status: 403, headers: H });
  }
  if (ownedChat.accountId !== accountId) {
    return NextResponse.json({ ok: false, error: "account_mismatch" }, { status: 403, headers: H });
  }
  const chatTitle = typeof ownedChat.chat.title === "string" ? ownedChat.chat.title : "";

  try {
    const upstream = await fetch(`${API_BASE_URL}/ai/schedule/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        // Server-authorized only after auth + mutation gate + owner-matched
        // binding above. Never taken from the request body.
        operatorApproved: true,
        actionType: "schedule_post",
        accountId,
        chatId,
        chatTitle,
        text,
        dueAt,
        auditId,
      }),
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(
      data ?? { ok: false, error: "backend_non_json" },
      { status: 200, headers: H },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "schedule_backend_offline" }, { status: 200, headers: H });
  }
}

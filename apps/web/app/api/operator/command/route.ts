import { NextResponse } from "next/server";

// AI Operator command → REAL LLM runtime, as a Telegram Context Agent.
// The operator works WITH the currently open Telegram chat: the route forwards
// the chat's recent messages (from tgContext) as history and the operator's
// command as the instruction to the backend AI runtime (POST /ai/suggest →
// generateDraftReply). It NEVER sends to Telegram — draft/suggestion only,
// operator approval stays mandatory. No streaming (backend uses stream:false).
export const dynamic = "force-dynamic";

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

type TgMsg = { content?: string; isOutgoing?: boolean; ts?: unknown };

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const text =
    typeof body?.text === "string"
      ? body.text
      : typeof body?.command === "string"
        ? body.command
        : "";

  const tg = body?.tgContext ?? null;
  const chatId = typeof tg?.chatId === "string" && tg.chatId ? tg.chatId : "";
  const accountId = typeof tg?.accountId === "string" ? tg.accountId : "";
  const chatTitle = typeof tg?.chatTitle === "string" && tg.chatTitle ? tg.chatTitle : "Telegram chat";
  const tgMessages: TgMsg[] = Array.isArray(tg?.messages) ? tg.messages : [];

  // Telegram Context Agent requires an open chat to work against.
  if (!chatId) {
    console.log(`[AI REQUEST] operator/command ok=false error=no_active_chat`);
    return NextResponse.json(
      {
        ok: false,
        text: "No active chat selected",
        error: "no_active_chat",
        approval_required: true,
        mode: "MANUAL_APPROVAL_ONLY",
        can_send: false,
        auto_send: false,
      },
      { status: 200 }
    );
  }

  // Chat messages become the conversation context; the operator's command is the instruction.
  const history = tgMessages
    .slice(-20)
    .map((m) => ({ content: String(m?.content ?? ""), isOutgoing: Boolean(m?.isOutgoing) }))
    .filter((m) => m.content.trim().length > 0);

  const started = Date.now();
  try {
    const upstream = await fetch(`${API_BASE_URL}/ai/suggest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId: chatId, chatTitle, history, instruction: text }),
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    const latency = Date.now() - started;

    // [AI REQUEST] activeChatId + messagesCount + provider/model/latency
    console.log(
      `[AI REQUEST] operator/command activeChatId=${chatId} accountId=${accountId} messagesCount=${history.length} model=${data?.model ?? "?"} status=${upstream.status} ok=${Boolean(data?.ok)} latency_ms=${latency}`
    );

    if (upstream.ok && data?.ok && data?.draft) {
      return NextResponse.json({
        ok: true,
        text: data.draft,
        model: data.model ?? null,
        latency_ms: latency,
        activeChatId: chatId,
        messagesCount: history.length,
        approval_required: true,
        mode: "MANUAL_APPROVAL_ONLY",
        runtime_mode: "READ_ONLY",
        actions: [],
        can_send: false,
        auto_send: false,
        bulk_actions: false,
      });
    }

    const errMsg = data?.error || `Мозг недоступен (HTTP ${upstream.status}).`;
    return NextResponse.json(
      {
        ok: false,
        text: `⚠ ${errMsg}`,
        error: errMsg,
        provider_status: upstream.status,
        latency_ms: latency,
        activeChatId: chatId,
        messagesCount: history.length,
        approval_required: true,
        mode: "MANUAL_APPROVAL_ONLY",
        can_send: false,
        auto_send: false,
      },
      { status: 200 }
    );
  } catch (e) {
    const latency = Date.now() - started;
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[AI REQUEST] operator/command activeChatId=${chatId} ok=false latency_ms=${latency} error=backend_unreachable ${msg}`);
    return NextResponse.json(
      {
        ok: false,
        text: "⚠ Нет связи с AI backend (8788). Запусти npm run api:dev.",
        error: "backend_offline",
        latency_ms: latency,
        approval_required: true,
        mode: "MANUAL_APPROVAL_ONLY",
        can_send: false,
        auto_send: false,
      },
      { status: 200 }
    );
  }
}

import { NextResponse } from "next/server";
import { getPrincipal, resolveBoundAccount } from "@/lib/telegramGuard";

export const dynamic = "force-dynamic";

const API_BASE_URL =
  process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

type TgMsg = {
  content?: string;
  text?: string;
  message?: string;
  isOutgoing?: boolean;
  role?: string;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMessage(m: TgMsg) {
  const content =
    normalizeText(m?.content) ||
    normalizeText(m?.text) ||
    normalizeText(m?.message);

  return {
    content,
    isOutgoing: Boolean(m?.isOutgoing || m?.role === "user" || m?.role === "operator"),
  };
}

// P3.4b: deterministic tool-intent detection. Commands matching these route to
// backend Tool Router v1 (/ai/route); everything else keeps the /ai/suggest
// draft flow. Cyrillic-safe (no \w/\b around Cyrillic).
function isToolCommand(command: string): boolean {
  const s = command.toLowerCase();
  return (
    /послед.*сообщ|last.*mess/.test(s) ||
    /суммар|summar|summary|резюм|проанализируй чат|analyze chat/.test(s) ||
    /контент.?план|content.?plan/.test(s) ||
    /подготов.*пост|prepare.?post|(^|\s)пост/.test(s) ||
    /конкурент|competitor/.test(s) ||
    /расписан|schedule|график.*публик|запланир|календар.*контент/.test(s)
  );
}

// Fix [MED]: "проанализируй/анализ" must yield a real LLM analysis, not a raw
// message dump. The backend detectTool() picks get_last_messages whenever the text
// contains "последн", so we force the summarize_chat tool for analyze intent.
function isAnalyzeIntent(command: string): boolean {
  const s = command.toLowerCase();
  return /проанализир|анализ|analy[sz]e|разбор|осмысл|выжимк/.test(s);
}

// Render a read-only tool result (no proposedAction) as a plain, readable text.
function renderToolResult(routed: any): string {
  const text = normalizeText(routed?.result?.text);
  const items: any[] = Array.isArray(routed?.result?.items) ? routed.result.items : [];
  const tool = routed?.tool;
  if (tool === "get_last_messages" || tool === "read_selected_chat") {
    if (!items.length) return text || "Контекст выбранного чата пуст.";
    const lines = items.map(
      (m: any) => `${m?.from === "operator" ? "Оператор" : "Собеседник"}: ${normalizeText(m?.content)}`,
    );
    return [text, ...lines].filter(Boolean).join("\n");
  }
  // parse_competitors / generate_content_plan / prepare_post / propose_schedule /
  // summarize_chat now carry a rich human-readable result.text from content-tools.
  return text || "Готово.";
}

export async function POST(req: Request) {
  // Auth (defence in depth). The operator command dispatcher is not open to
  // anonymous callers even though it only produces drafts / approval cards.
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  // The account is resolved SERVER-SIDE from the caller's owner-matched binding.
  // The client-supplied accountId is ignored entirely. No ready binding -> 403
  // (this endpoint acts on a real slot, so it denies hard rather than soft-empty).
  const bound = await resolveBoundAccount(principal);
  if (bound.kind !== "ok") {
    return NextResponse.json(
      { ok: false, ownerMatched: bound.kind !== "mismatch", error: "no_binding", message: "К вашему профилю не привязан owner-matched Telegram-аккаунт." },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }
  const accountId = bound.accountId;

  let body: any = {};

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const command =
    normalizeText(body?.text) ||
    normalizeText(body?.command) ||
    normalizeText(body?.message);

  const tg = body?.tgContext ?? {};

  const chatId =
    typeof tg?.chatId === "string" && tg.chatId
      ? tg.chatId
      : typeof body?.chatId === "string" && body.chatId
        ? body.chatId
        : typeof body?.conversationId === "string" && body.conversationId
          ? body.conversationId
          : "";

  // accountId is the server-resolved bound slot (above) — the request body's
  // tgContext.accountId / accountId are deliberately NOT read here.

  const chatTitle =
    typeof tg?.chatTitle === "string" && tg.chatTitle
      ? tg.chatTitle
      : typeof body?.chatTitle === "string" && body.chatTitle
        ? body.chatTitle
        : typeof body?.conversationTitle === "string" && body.conversationTitle
          ? body.conversationTitle
          : "Telegram chat";

  const tgMessages: TgMsg[] = Array.isArray(tg?.messages)
    ? tg.messages
    : Array.isArray(body?.messages)
      ? body.messages
      : Array.isArray(body?.history)
        ? body.history
        : [];

  if (!chatId) {
    return NextResponse.json(
      {
        ok: false,
        text: "No active chat selected",
        error: "no_active_chat",
        approval_required: true,
        mode: "MANUAL_APPROVAL_ONLY",
        runtime_mode: "READ_ONLY",
        actions: [],
        can_send: false,
        auto_send: false,
        bulk_actions: false,
      },
      { status: 200 },
    );
  }

  const messages = tgMessages
    .slice(-20)
    .map(normalizeMessage)
    .filter((m) => m.content.length > 0);

  const started = Date.now();

  // P3.4b: tool-intent commands go to the non-destructive Tool Router v1.
  // It NEVER sends. Draft/prepare come back as an approval-card draft; read-only
  // tools (summary / last messages / competitors / plan) render as info only.
  if (isToolCommand(command) || isAnalyzeIntent(command)) {
    try {
      const routedRes = await fetch(`${API_BASE_URL}/ai/route`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command, instruction: command, chatId, chatTitle, messages, tool: isAnalyzeIntent(command) ? "summarize_chat" : undefined }),
        cache: "no-store",
      });
      const routed = await routedRes.json().catch(() => null);
      const tool = normalizeText(routed?.tool) || "?";
      const latency = Date.now() - started;
      console.log(
        `[operator/command] target=/ai/route tool=${tool} chatId=${chatId} account=${accountId || "-"} msgs=${messages.length} status=${routedRes.status} ok=${Boolean(routed?.ok)} can_send=false auto_send=false ${latency}ms`,
      );

      if (routedRes.ok && routed?.ok) {
        const pa = routed?.proposedAction;
        const paType = pa?.type ?? null;
        const proposedText = normalizeText(pa?.text);

        // telegram_send → sendable approval-card (existing behavior, still gated)
        if (pa && paType === "telegram_send" && proposedText) {
          return NextResponse.json({
            ok: true,
            text: proposedText,
            draft: proposedText,
            // Real external action → client shows the approval card ONLY when
            // pendingAction is present.
            pendingAction: { actionType: "telegram_send", chatId, chatTitle, text: proposedText, auditId: routed?.auditId ?? null },
            tool,
            auditId: routed?.auditId ?? null,
            model: routed?.model ?? null,
            latency_ms: latency,
            activeChatId: chatId,
            messagesCount: messages.length,
            approval_required: true,
            mode: "MANUAL_APPROVAL_ONLY",
            runtime_mode: "READ_ONLY",
            actions: [],
            can_send: false,
            auto_send: false,
            bulk_actions: false,
          });
        }

        // P3.7a: publish_post → SENDABLE approval-card, but ONLY to the currently
        // selected chat/channel. AI never chooses the target — we publish to the
        // operator-selected chatId. No selected chat → blocked info (no target).
        if (pa && paType === "publish_post" && proposedText) {
          if (!chatId) {
            return NextResponse.json({
              ok: true,
              text: `${proposedText}\n\n⚠ publish_post: нет выбранного чата/канала — публикация заблокирована.`,
              readonly: true,
              tool,
              actionType: "publish_post",
              auditId: routed?.auditId ?? null,
              model: routed?.model ?? null,
              latency_ms: latency,
              activeChatId: chatId,
              messagesCount: messages.length,
              approval_required: false,
              mode: "MANUAL_APPROVAL_ONLY",
              runtime_mode: "READ_ONLY",
              actions: [],
              can_send: false,
              auto_send: false,
              bulk_actions: false,
            });
          }
          return NextResponse.json({
            ok: true,
            text: proposedText,
            draft: proposedText,
            pendingAction: { actionType: "publish_post", chatId, chatTitle, text: proposedText, auditId: routed?.auditId ?? null },
            tool,
            actionType: "publish_post",
            targetChatId: chatId,
            targetChatTitle: chatTitle,
            auditId: routed?.auditId ?? null,
            model: routed?.model ?? null,
            latency_ms: latency,
            activeChatId: chatId,
            messagesCount: messages.length,
            approval_required: true,
            mode: "MANUAL_APPROVAL_ONLY",
            runtime_mode: "READ_ONLY",
            actions: [],
            can_send: false,
            auto_send: false,
            bulk_actions: false,
          });
        }

        // schedule_post → informational proposal, BLOCKED (no executor). Never
        // a sendable card; nothing is scheduled.
        if (pa && paType === "schedule_post") {
          const reason = normalizeText(routed?.policy?.reason) || "заблокировано policy (исполнителя нет)";
          const bodyText = proposedText || renderToolResult(routed);
          return NextResponse.json({
            ok: true,
            text: `${bodyText}\n\n⚠ schedule_post: ${reason}. Ничего не запланировано.`,
            readonly: true,
            tool,
            actionType: "schedule_post",
            auditId: routed?.auditId ?? null,
            model: routed?.model ?? null,
            latency_ms: latency,
            activeChatId: chatId,
            messagesCount: messages.length,
            approval_required: false,
            mode: "MANUAL_APPROVAL_ONLY",
            runtime_mode: "READ_ONLY",
            actions: [],
            can_send: false,
            auto_send: false,
            bulk_actions: false,
          });
        }

        // read-only tool result → informational, NOT a send draft
        return NextResponse.json({
          ok: true,
          text: renderToolResult(routed),
          readonly: true,
          tool,
          auditId: routed?.auditId ?? null,
          model: routed?.model ?? null,
          latency_ms: latency,
          activeChatId: chatId,
          messagesCount: messages.length,
          approval_required: false,
          mode: "MANUAL_APPROVAL_ONLY",
          runtime_mode: "READ_ONLY",
          actions: [],
          can_send: false,
          auto_send: false,
          bulk_actions: false,
        });
      }

      const rErr = normalizeText(routed?.error) || `Tool router HTTP ${routedRes.status}`;
      return NextResponse.json(
        {
          ok: false,
          text: `⚠ ${rErr}`,
          error: rErr,
          tool,
          approval_required: true,
          mode: "MANUAL_APPROVAL_ONLY",
          runtime_mode: "READ_ONLY",
          actions: [],
          can_send: false,
          auto_send: false,
          bulk_actions: false,
        },
        { status: 200 },
      );
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          ok: false,
          text: "⚠ Нет связи с Tool Router.",
          error: "tool_router_offline",
          detail,
          approval_required: true,
          mode: "MANUAL_APPROVAL_ONLY",
          runtime_mode: "READ_ONLY",
          actions: [],
          can_send: false,
          auto_send: false,
          bulk_actions: false,
        },
        { status: 200 },
      );
    }
  }

  try {
    const upstream = await fetch(`${API_BASE_URL}/ai/suggest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chatId,
        chatTitle,
        command,
        messages,
      }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => null);
    const latency = Date.now() - started;

    console.log(
      `[AI REQUEST] operator/command chatId=${chatId} account=${accountId || "-"} msgs=${messages.length} model=${data?.model ?? "?"} status=${upstream.status} ok=${Boolean(data?.ok)} ${latency}ms`,
    );

    const draft =
      normalizeText(data?.draft) ||
      normalizeText(data?.text) ||
      normalizeText(data?.message);

    if (upstream.ok && data?.ok && draft) {
      return NextResponse.json({
        ok: true,
        // A prepared draft is INFORMATIONAL — draft preparation never requires
        // approval. No pendingAction → client renders it as a plain reply.
        readonly: true,
        text: draft,
        draft,
        auditId: data?.auditId ?? null,
        model: data?.model ?? null,
        character: data?.character ?? null,
        latency_ms: latency,
        activeChatId: chatId,
        messagesCount: messages.length,
        approval_required: false,
        mode: "MANUAL_APPROVAL_ONLY",
        runtime_mode: "READ_ONLY",
        actions: [],
        can_send: false,
        auto_send: false,
        bulk_actions: false,
      });
    }

    const errMsg =
      normalizeText(data?.error) ||
      normalizeText(data?.message) ||
      `AI backend returned HTTP ${upstream.status}`;

    return NextResponse.json(
      {
        ok: false,
        text: `⚠ ${errMsg}`,
        error: errMsg,
        provider_status: upstream.status,
        approval_required: true,
        mode: "MANUAL_APPROVAL_ONLY",
        runtime_mode: "READ_ONLY",
        actions: [],
        can_send: false,
        auto_send: false,
        bulk_actions: false,
      },
      { status: 200 },
    );
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);

    return NextResponse.json(
      {
        ok: false,
        text: "⚠ Нет связи с AI backend.",
        error: "backend_offline",
        detail,
        approval_required: true,
        mode: "MANUAL_APPROVAL_ONLY",
        runtime_mode: "READ_ONLY",
        actions: [],
        can_send: false,
        auto_send: false,
        bulk_actions: false,
      },
      { status: 200 },
    );
  }
}

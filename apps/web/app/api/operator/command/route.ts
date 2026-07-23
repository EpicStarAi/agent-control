import { NextResponse } from "next/server";
import { getPrincipal, resolveBoundAccount } from "@/lib/telegramGuard";
import { assertChatBelongsToBoundAccount, getMessages } from "@/lib/telegramBindingService";

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

type AiAttachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
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

function normalizeAttachments(value: unknown): AiAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      name: normalizeText(item?.name).slice(0, 160) || "clipboard-image",
      type: normalizeText(item?.type).slice(0, 80) || "image/png",
      size: Number.isFinite(Number(item?.size)) ? Number(item.size) : 0,
      dataUrl: normalizeText(item?.dataUrl),
    }))
    .filter((item) => item.type.startsWith("image/") && item.dataUrl.startsWith("data:image/") && item.dataUrl.length <= 3_600_000)
    .slice(0, 3);
}

function normalizeOperatorHistory(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: any) => ({
      content: normalizeText(item?.content || item?.text || item?.message),
      isOutgoing: item?.role === "op" || item?.role === "assistant" || item?.isOutgoing === true,
    }))
    .filter((item) => item.content.length > 0)
    .slice(-16);
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
  const analysis = s.match(/проанализир|анализ|analy[sz]e|разбор|осмысл|выжимк/);
  if (!analysis || analysis.index === undefined) return false;

  const targetPattern = /чат|переписк|сообщен|диалог|контакт|канал/g;
  let target = targetPattern.exec(s);
  while (target) {
    if (Math.abs(target.index - analysis.index) <= 72) return true;
    target = targetPattern.exec(s);
  }
  return false;
}

function isSystemAuditIntent(command: string): boolean {
  const s = command.toLowerCase();
  return /аудит|проверь.*epic.?gram|read[\s-]?only.*(?:проверк|audit)|с чего (?:нач|старт)|что (?:делаем|дальше)|начн[её]м работу|первый шаг/.test(s);
}

function renderSystemAudit(data: any): string {
  const rows = Array.isArray(data?.result?.rows) ? data.result.rows : [];
  if (!rows.length) return normalizeText(data?.result?.text) || "READ-ONLY аудит EPICGRAM не вернул результатов.";
  return [
    "READ-ONLY аудит EPICGRAM",
    "Компонент | Статус | Результат | Решение",
    "--- | --- | --- | ---",
    ...rows.map((row: any) => [row?.component, row?.status, row?.detail, row?.solution]
      .map((value) => String(value ?? "-").replace(/\|/g, "/").replace(/\s+/g, " ").trim())
      .join(" | ")),
  ].join("\n");
}

function localOperatorReply(command: string): string | null {
  const s = command.toLowerCase().trim();
  if (!s) return null;
  if (/^(привет|приветик|приветики|здаров|здоров|hello|hi)/.test(s)) {
    return "На связи. EPIC💀CLAW снова в ручном режиме. Без рекламной каши: скажи, что проверяем, какой чат открыть или какой черновик подготовить.";
  }
  if (/с чего (?:нач|старт)|что (?:делаем|дальше)|начн[её]м работу|первый шаг/.test(s)) {
    return [
      "Начнём с безопасной проверки и одного выбранного чата:",
      "1. «Проверь EPICGRAM» — проверю UI, API, TDLib, n8n, OpenClaw и AI.",
      "2. Выбери нужный Telegram-чат слева.",
      "3. «Прочитай выбранный чат» — загружу последние сообщения.",
      "4. «Суммаризируй чат» — выделю контекст и открытые вопросы.",
      "5. «Подготовь черновик ответа» — создам текст без отправки.",
      "Начинай командой: «Проверь EPICGRAM».",
    ].join("\n");
  }
  if (/operator tools|tools где|где tools|где панел|панел.*tools|кнопк.*tools|allowlist где/.test(s)) {
    return "Панель Operator Tools находится в окне EPIC💀CLAW сразу под вкладками проектов. В новой версии в шапке оператора есть кнопка TOOLS — нажми её, и окно прокрутит к панели. Если кнопки нет, открой fresh URL с refresh=tools-panel-visible.";
  }
  if (/что произошло.*оператор|оператор.*что произошло|верни.*оператор|кто был|шо ты мел|что ты мел|несеш|несёш|бред|реклам|не в адекват|неадекват/.test(s)) {
    return "Да, вижу. Я убрал свободную болтовню через слабую локальную модель: она и давала этот странный рекламный поток. Теперь управляющий диалог отвечаю я как EPIC💀CLAW, а LLM включаем только для конкретных черновиков, анализа и выбранных Telegram-чатов.";
  }
  if (/без изменений|по.?прежнему|ничего.*не (измен|помен)|все так же|всё так же/.test(s)) {
    return "Вижу: нужное изменение в интерфейсе не отобразилось. Я не буду подменять проверку общими советами. Обнови страницу клиента один раз: после обновления EPIC💀CLAW сбросит старый диалог, а обычные сообщения будут обрабатываться отдельно от выбранного Telegram-чата. Затем повтори проблемную команду — ответ должен появиться в окне оператора, а не в composer.";
  }
  if (/статус|ты кто|кто ты|на связи|(^|\s)готов(?:\?|$|\s+(?:ли|к работе))/.test(s)) {
    return "Я EPIC💀CLAW AI Operator внутри EPIC☠GRAM. Режим: manual approval only, Telegram подключён через owner-bound TDLib, отправка только после твоего действия.";
  }
  return null;
}

function isLowQualityOperatorReply(text: string): boolean {
  const s = text.toLowerCase();
  return /проверьте подключение к интернету|перезагрузите устройство|обратитесь в службу поддержки|hootsuite|buffer|social media management tools|рекламн(ый|ая|ые) инвестиц/.test(s);
}

function localOperatorFallback(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) {
    return "Я на связи. Выбери Telegram-чат или напиши конкретную задачу: проверить статус, разобрать скрин, подготовить ответ, посмотреть n8n/OpenClaw/Ollama.";
  }
  if (/анализ|разбор|проверь|посмотри|разбер/.test(trimmed.toLowerCase())) {
    return "Сделаю. Уточни объект анализа: текущий Telegram-чат, скрин, n8n workflow, OpenClaw, Ollama или весь клиент. Если это чат — выбери его слева, если скрин — вставь его в окно оператора.";
  }
  return "Принял. Я сейчас в стабильном операторском режиме. Дай конкретную команду: открыть чат, проверить статус, подготовить ответ, разобрать скрин или посмотреть интеграции.";
}

function operatorOnlyResponse(text: string, model = "epicgram-local-operator-guard") {
  return NextResponse.json({
    ok: true,
    readonly: true,
    operatorOnly: true,
    text,
    draft: text,
    model,
    approval_required: false,
    mode: "MANUAL_APPROVAL_ONLY",
    runtime_mode: "READ_ONLY",
    actions: [],
    can_send: false,
    auto_send: false,
    bulk_actions: false,
  });
}

async function operatorConversationResponse(input: {
  workspaceId: string;
  command: string;
  history: Array<{ content: string; isOutgoing: boolean }>;
  attachments: AiAttachment[];
}) {
  const started = Date.now();
  try {
    const upstream = await fetch(`${API_BASE_URL}/ai/suggest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mode: "operator_chat",
        conversationId: `operator:${input.workspaceId}`,
        chatTitle: "EPIC💀CLAW Operator Workspace",
        command: input.command,
        history: input.history,
        attachments: input.attachments,
      }),
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    const text = normalizeText(data?.draft) || normalizeText(data?.text) || normalizeText(data?.message);

    if (upstream.ok && data?.ok && text && !isLowQualityOperatorReply(text)) {
      return NextResponse.json({
        ok: true,
        readonly: true,
        operatorOnly: true,
        text,
        draft: text,
        model: data?.model ?? null,
        latency_ms: Date.now() - started,
        approval_required: false,
        mode: "MANUAL_APPROVAL_ONLY",
        runtime_mode: "OPERATOR_CHAT",
        actions: [],
        can_send: false,
        auto_send: false,
        bulk_actions: false,
      }, { headers: { "cache-control": "private, no-store, max-age=0" } });
    }

    return operatorOnlyResponse(localOperatorFallback(input.command));
  } catch {
    return operatorOnlyResponse("Не смог получить ответ локального мозга. Инструменты клиента остаются доступны: проверь состояние, прочитай чат, покажи n8n или OpenClaw.");
  }
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
  const attachments = normalizeAttachments(body?.attachments?.length ? body.attachments : tg?.attachments);
  const hasVisualAttachments = attachments.length > 0;
  if (!hasVisualAttachments && isSystemAuditIntent(command)) {
    try {
      const auditResponse = await fetch(new URL("/api/operator-tools", req.url), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: req.headers.get("cookie") ?? "",
        },
        body: JSON.stringify({
          tool: "system_audit",
          instruction: command,
          chatId: normalizeText(tg?.chatId) || normalizeText(body?.chatId) || normalizeText(body?.conversationId),
          chatTitle: normalizeText(tg?.chatTitle) || normalizeText(body?.chatTitle),
          clientState: body?.clientState ?? {
            section: "client",
            activeAccountId: normalizeText(tg?.accountId) || normalizeText(body?.accountId),
            selectedTelegramChatId: normalizeText(tg?.chatId) || normalizeText(body?.chatId),
            selectedTelegramChatTitle: normalizeText(tg?.chatTitle) || normalizeText(body?.chatTitle),
          },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(30_000),
      });
      const audit = await auditResponse.json().catch(() => null);
      if (auditResponse.ok && audit?.ok) {
        return operatorOnlyResponse(renderSystemAudit(audit), "epicgram-system-audit");
      }
      return operatorOnlyResponse(`READ-ONLY аудит недоступен: ${normalizeText(audit?.error) || `HTTP ${auditResponse.status}`}.`);
    } catch (error) {
      return operatorOnlyResponse(`READ-ONLY аудит недоступен: ${error instanceof Error ? error.message : String(error)}.`);
    }
  }
  const localReply = localOperatorReply(command);
  if (localReply && !hasVisualAttachments) {
    return operatorOnlyResponse(localReply);
  }

  const operatorHistory = normalizeOperatorHistory(body?.operatorHistory);
  const needsTelegramContext = !hasVisualAttachments && (isToolCommand(command) || isAnalyzeIntent(command));
  if (!needsTelegramContext) {
    if (!hasVisualAttachments) {
      const agentBinding = await resolveBoundAccount(principal);
      if (agentBinding.kind === "ok") {
        try {
          const agentResponse = await fetch(`${API_BASE_URL}/operator/command`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              text: command,
              history: operatorHistory,
              accountId: agentBinding.accountId,
            }),
            cache: "no-store",
            signal: AbortSignal.timeout(60_000),
          });
          const agent = await agentResponse.json().catch(() => null);
          const agentText = normalizeText(agent?.text) || normalizeText(agent?.reply);
          const agentTool = normalizeText(agent?.tool) || "reply";

          if (agentResponse.ok && agent?.ok && agent?.kind === "pending" && agent?.action) {
            const actionChatId = normalizeText(agent.action.chatId);
            const actionText = normalizeText(agent.action.text);
            const owned = actionChatId ? await assertChatBelongsToBoundAccount(principal, actionChatId) : null;
            if (!owned?.ok || !actionText) {
              return operatorOnlyResponse("Агент подготовил некорректное действие. Отправка заблокирована.", "epicgram-operator-agent");
            }
            return NextResponse.json({
              ok: true,
              text: agentText || actionText,
              draft: actionText,
              tool: `operator_agent.${agentTool}`,
              pendingAction: {
                actionType: "telegram_send",
                chatId: actionChatId,
                chatTitle: normalizeText(owned.chat.title) || normalizeText(agent.action.chatTitle) || actionChatId,
                text: actionText,
                auditId: null,
              },
              model: "epicgram-operator-agent",
              approval_required: true,
              mode: "MANUAL_APPROVAL_ONLY",
              runtime_mode: "TOOL_AGENT",
              actions: [],
              can_send: false,
              auto_send: false,
              bulk_actions: false,
            });
          }

          if (agentResponse.ok && agent?.ok && agentText) {
            return NextResponse.json({
              ok: true,
              readonly: true,
              operatorOnly: true,
              text: agentText,
              draft: agentText,
              tool: `operator_agent.${agentTool}`,
              model: "epicgram-operator-agent",
              approval_required: false,
              mode: "MANUAL_APPROVAL_ONLY",
              runtime_mode: "TOOL_AGENT",
              actions: [],
              can_send: false,
              auto_send: false,
              bulk_actions: false,
            }, { headers: { "cache-control": "private, no-store, max-age=0" } });
          }
        } catch {
          // Fall back to the normal operator conversation below.
        }
      }
    }
    return operatorConversationResponse({
      workspaceId: principal.workspaceId,
      command,
      history: operatorHistory,
      attachments,
    });
  }

  // Telegram tools resolve the account SERVER-SIDE from the caller's binding.
  // Plain operator chat above intentionally works without a Telegram account.
  const bound = await resolveBoundAccount(principal);
  if (bound.kind !== "ok") {
    return NextResponse.json(
      { ok: false, ownerMatched: bound.kind !== "mismatch", error: "no_binding", message: "К вашему профилю не привязан owner-matched Telegram-аккаунт." },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }
  const accountId = bound.accountId;

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

  if (chatId.startsWith("p_")) {
    return operatorOnlyResponse(
      hasVisualAttachments
        ? "Скрин/файл получил, но проектное окно сейчас не будет гонять его через нестабильную локальную модель. Выбери реальный Telegram-чат или коротко напиши, что именно на скрине проверить."
        : localOperatorFallback(command),
    );
  }

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

  const ownedChat = await assertChatBelongsToBoundAccount(principal, chatId);
  if (!ownedChat.ok) {
    return NextResponse.json(
      {
        ok: false,
        text: `⚠ ${ownedChat.reason}`,
        error: ownedChat.reason,
        approval_required: false,
        mode: "MANUAL_APPROVAL_ONLY",
        runtime_mode: "READ_ONLY",
        actions: [],
        can_send: false,
        auto_send: false,
        bulk_actions: false,
      },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }

  const chatTitle = normalizeText(ownedChat.chat.title) || "Telegram chat";
  const serverContext = await getMessages(principal, chatId, 40);
  if (!serverContext.ok) {
    return NextResponse.json(
      {
        ok: false,
        text: `⚠ ${serverContext.reason}`,
        error: serverContext.reason,
        approval_required: false,
        mode: "MANUAL_APPROVAL_ONLY",
        runtime_mode: "READ_ONLY",
        actions: [],
        can_send: false,
        auto_send: false,
        bulk_actions: false,
      },
      { status: 409, headers: { "cache-control": "no-store" } },
    );
  }

  const messages = (serverContext.messages as TgMsg[])
    .slice(-20)
    .map(normalizeMessage)
    .filter((m) => m.content.length > 0);

  const started = Date.now();

  // P3.4b: tool-intent commands go to the non-destructive Tool Router v1.
  // It NEVER sends. Draft/prepare come back as an approval-card draft; read-only
  // tools (summary / last messages / competitors / plan) render as info only.
  if (!hasVisualAttachments && (isToolCommand(command) || isAnalyzeIntent(command))) {
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
        attachments,
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

import { NextResponse } from "next/server";
import { getPrincipal, resolveBoundAccount, guardedJson } from "@/lib/telegramGuard";
import { assertChatBelongsToBoundAccount, getMessages } from "@/lib/telegramBindingService";
import * as approvals from "@/lib/telegramSendApprovals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";
const OPENCLAW_BASE_URL = process.env.EPICGRAM_OPENCLAW_BASE_URL ?? "http://127.0.0.1:8787";
const H = { "cache-control": "private, no-store, max-age=0, must-revalidate", pragma: "no-cache" };

type ToolName =
  | "system_audit"
  | "inspect_state"
  | "read_chat"
  | "summarize_chat"
  | "prepare_draft"
  | "create_approval"
  | "n8n_draft_approval"
  | "n8n_status"
  | "n8n_workflows"
  | "openclaw_status";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function redactSecrets(value: string): string {
  return String(value || "")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{16,}/gi, "Bearer [REDACTED_SECRET]")
    .replace(/\b(?:xai|sk|sk-proj|ghp|github_pat|hf|AIza|ya29|xox[baprs])[-_A-Za-z0-9]{16,}\b/g, "[REDACTED_SECRET]")
    .replace(/\b\d{8,12}:[A-Za-z0-9_-]{24,}\b/g, "[REDACTED_TELEGRAM_BOT_TOKEN]")
    .replace(/\b[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g, "[REDACTED_JWT]")
    .replace(/\b[A-Fa-f0-9]{48,}\b/g, "[REDACTED_HEX_SECRET]");
}

function messagesForAi(messages: Array<Record<string, unknown>>) {
  return messages
    .map((m) => ({ content: redactSecrets(text(m.content ?? m.text ?? m.message)), isOutgoing: Boolean(m.isOutgoing ?? m.outgoing ?? m.is_outgoing) }))
    .filter((m) => m.content.length > 0);
}

function renderMessages(messages: Array<Record<string, unknown>>, limit = 10) {
  const rows = messagesForAi(messages).slice(-limit);
  if (!rows.length) return "В выбранном чате нет доступного текстового контекста.";
  return rows.map((m, index) => `${index + 1}. ${m.isOutgoing ? "Оператор" : "Собеседник"}: ${m.content}`).join("\n");
}

function localSummary(history: Array<{ content: string; isOutgoing: boolean }>, chatTitle: string) {
  const rows = history.slice(-12);
  if (!rows.length) return "Контекст выбранного чата пуст — суммаризировать нечего.";
  const links = rows.flatMap((m) => m.content.match(/https?:\/\/\S+/g) ?? []).slice(0, 5);
  const secretCount = rows.filter((m) => /\[REDACTED_/.test(m.content)).length;
  const topics = [
    links.length ? `ссылки/ресурсы: ${links.length}` : null,
    secretCount ? `секреты в истории: ${secretCount} сообщение(й) скрыто redaction-фильтром` : null,
    rows.some((m) => /n8n|openclaw|qclaw|ollama|api|grok/i.test(m.content)) ? "интеграции/API/локальные агенты" : null,
    rows.some((m) => /rozetka|камера|телефон|ноут|vps|оборуд/i.test(m.content)) ? "оборудование/покупки/инфраструктура" : null,
  ].filter(Boolean);
  return [
    `Локальное резюме чата «${chatTitle}» (brain offline):`,
    `Сообщений в контексте: ${rows.length}.`,
    topics.length ? `Темы: ${topics.join("; ")}.` : "Темы: короткий рабочий контекст без явной классификации.",
    "Риск: в истории были похожие на секреты/API-ключи данные; они скрыты перед показом и передачей в AI.",
    "Следующий шаг: уточнить задачу или подготовить черновик без раскрытия секретов.",
  ].join("\n");
}

function localDraft(history: Array<{ content: string; isOutgoing: boolean }>, instruction: string) {
  const lastIncoming = [...history].reverse().find((m) => !m.isOutgoing)?.content;
  const base = lastIncoming || instruction || "Принял задачу.";
  return `Принял. По текущему контексту вижу задачу: ${base.slice(0, 180)}${base.length > 180 ? "…" : ""}\n\nПредлагаю продолжить без раскрытия ключей и с ручным подтверждением всех действий.`;
}

async function backendJson(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, body };
}

async function routeAi(tool: string, input: Record<string, unknown>) {
  return backendJson("/ai/route", { method: "POST", body: JSON.stringify({ ...input, tool }) });
}

async function latestN8nExecution() {
  const n8nUrl = text(process.env.N8N_URL) || "http://127.0.0.1:5678";
  const key = text(process.env.N8N_API_KEY);
  if (!key) return { ok: false, status: null, reason: "N8N_API_KEY_NOT_CONFIGURED" };
  try {
    const response = await fetch(`${n8nUrl.replace(/\/$/, "")}/api/v1/executions?limit=1`, {
      headers: { "X-N8N-API-KEY": key },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const body = await response.json().catch(() => null);
    const execution = Array.isArray(body?.data) ? body.data[0] : null;
    return {
      ok: response.ok && Boolean(execution),
      status: text(execution?.status) || null,
      workflowId: text(execution?.workflowId) || null,
      startedAt: text(execution?.startedAt) || null,
      reason: response.ok ? null : `n8n_executions_http_${response.status}`,
    };
  } catch (error) {
    return { ok: false, status: null, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function findN8nDraftWebhookUrl() {
  const explicit = text(process.env.N8N_EPICGRAM_DRAFT_WEBHOOK_URL) || text(process.env.EPICGRAM_N8N_DRAFT_WEBHOOK_URL);
  if (explicit) return { ok: true, url: explicit, source: "env" };

  const n8nUrl = text(process.env.N8N_URL) || "http://127.0.0.1:5678";
  const key = text(process.env.N8N_API_KEY);
  if (!key) return { ok: false, reason: "N8N_API_KEY_REQUIRED_OR_SET_N8N_EPICGRAM_DRAFT_WEBHOOK_URL" };

  try {
    const listResponse = await fetch(`${n8nUrl}/api/v1/workflows?limit=100`, {
      headers: { "X-N8N-API-KEY": key },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!listResponse.ok) return { ok: false, reason: `n8n_workflows_http_${listResponse.status}` };
    const list = await listResponse.json().catch(() => null);
    const workflow = (Array.isArray(list?.data) ? list.data : []).find((item: any) => item?.name === "EPICGRAM_AI_DRAFT_APPROVAL");
    if (!workflow?.id) return { ok: false, reason: "EPICGRAM_AI_DRAFT_APPROVAL_NOT_FOUND" };

    const detailResponse = await fetch(`${n8nUrl}/api/v1/workflows/${encodeURIComponent(String(workflow.id))}`, {
      headers: { "X-N8N-API-KEY": key },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!detailResponse.ok) return { ok: false, reason: `n8n_workflow_http_${detailResponse.status}` };
    const detail = await detailResponse.json().catch(() => null);
    if (detail && detail.active === false) return { ok: false, reason: "EPICGRAM_AI_DRAFT_APPROVAL_INACTIVE" };
    const webhookNode = (Array.isArray(detail?.nodes) ? detail.nodes : []).find((node: any) => {
      const type = String(node?.type || "").toLowerCase();
      return type.includes("webhook") && !type.includes("respond");
    });
    const path = text(webhookNode?.parameters?.path) || text(webhookNode?.webhookId);
    const method = text(webhookNode?.parameters?.httpMethod).toUpperCase() || "POST";
    if (!path) return { ok: false, reason: "EPICGRAM_AI_DRAFT_APPROVAL_WEBHOOK_PATH_NOT_FOUND" };
    if (method && method !== "POST") return { ok: false, reason: `EPICGRAM_AI_DRAFT_APPROVAL_WEBHOOK_METHOD_${method}` };
    return { ok: true, url: `${n8nUrl}/webhook/${encodeURIComponent(path)}`, source: "workflow_discovery" };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function extractN8nDraft(body: any): string {
  const data = body?.data ?? body?.result ?? body;
  if (Array.isArray(data)) return extractN8nDraft(data[0]);
  return redactSecrets(
    text(data?.draft_text) ||
    text(data?.draftText) ||
    text(data?.text) ||
    text(data?.message) ||
    text(data?.reply) ||
    text(data?.output)
  );
}

async function callN8nDraftWorkflow(payload: Record<string, unknown>) {
  const target = await findN8nDraftWebhookUrl();
  if (!target.ok || !target.url) return { ok: false, reason: target.reason || "n8n_draft_webhook_not_configured" };
  try {
    const response = await fetch(target.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      source: target.source,
      draft: extractN8nDraft(body),
      rawStatus: body?.status ?? body?.result?.status ?? null,
      reason: response.ok ? null : `n8n_webhook_http_${response.status}`,
    };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function safeState(input: Record<string, unknown>) {
  const clientState = typeof input.clientState === "object" && input.clientState ? input.clientState as Record<string, unknown> : {};
  return {
    section: text(clientState.section) || null,
    selectedTelegramChatId: text(clientState.selectedTelegramChatId) || null,
    selectedTelegramChatTitle: text(clientState.selectedTelegramChatTitle) || null,
    activeAccountId: text(clientState.activeAccountId) ? "server-bound" : null,
    visibleChatsCount: Number(clientState.visibleChatsCount ?? 0) || 0,
    operatorWindow: typeof clientState.operatorWindow === "object" ? clientState.operatorWindow : null,
  };
}

export async function POST(req: Request) {
  const principal = await getPrincipal();
  if (!principal) {
    return guardedJson({ ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." }, 401);
  }

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { body = {}; }

  const tool = text(body.tool) as ToolName;
  const chatId = text(body.chatId);
  const chatTitle = text(body.chatTitle) || "Telegram chat";
  const instruction = text(body.instruction) || text(body.command) || text(body.text);

  const bound = await resolveBoundAccount(principal);
  const accountId = bound.kind === "ok" ? bound.accountId : null;

  if (tool === "system_audit") {
    const [api, telegram, n8n, operator, infra, openclaw, n8nLatest] = await Promise.all([
      backendJson("/health").catch((error) => ({ ok: false, status: 502, body: { error: String(error) } })),
      backendJson("/telegram/status").catch((error) => ({ ok: false, status: 502, body: { error: String(error) } })),
      backendJson("/infra/n8n").catch((error) => ({ ok: false, status: 502, body: { error: String(error) } })),
      backendJson("/operator/status").catch((error) => ({ ok: false, status: 502, body: { error: String(error) } })),
      backendJson("/infra/status").catch((error) => ({ ok: false, status: 502, body: { error: String(error) } })),
      fetch(`${OPENCLAW_BASE_URL}/health`, { cache: "no-store", signal: AbortSignal.timeout(5_000) })
        .then(async (response) => ({ ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) }))
        .catch((error) => ({ ok: false, status: 502, body: { error: String(error) } })),
      latestN8nExecution(),
    ]);

    const telegramState = telegram.body as Record<string, any>;
    const readyAccounts = Array.isArray(telegramState?.accounts)
      ? telegramState.accounts.filter((item: any) => item?.authorizationState === "authorizationStateReady")
      : [];
    const telegramReady = telegram.ok && telegramState?.authorizationState === "authorizationStateReady";
    const uniqueTelegramUsers = new Set(readyAccounts.map((item: any) => String(item?.id || "")).filter(Boolean));
    const duplicateSlots = Math.max(0, readyAccounts.length - uniqueTelegramUsers.size);
    const n8nState = n8n.body as Record<string, any>;
    const operatorEnvelope = operator.body as Record<string, any>;
    const operatorState = operatorEnvelope?.operator ?? operatorEnvelope;
    const infraServices = (infra.body as Record<string, any>)?.services ?? {};
    const offlineServices = Object.entries(infraServices)
      .filter(([, value]: [string, any]) => value?.online === false)
      .map(([name]) => name);

    let selectedChat = { status: "WARN", detail: "чат не выбран", solution: "Выберите чат для проверки чтения и allowlist." };
    let allowlist = { status: "WARN", detail: "не проверен без выбранного чата", solution: "Выберите чат; добавление в allowlist нужно только перед отправкой." };
    if (accountId && chatId) {
      const owned = await assertChatBelongsToBoundAccount(principal, chatId);
      if (owned.ok) {
        const messages = await getMessages(principal, chatId, 12);
        const isChannel = Boolean(owned.chat.isChannel) || owned.chat.category === "channel" || owned.chat.type === "channel";
        const actionType = isChannel ? "publish_post" : "telegram_send";
        const allowed = await approvals.isAllowed({ userId: principal.userId, accountId, chatId, actionType }).catch(() => false);
        selectedChat = messages.ok
          ? { status: "OK", detail: `доступен, сообщений прочитано: ${messages.messages.length}`, solution: "Не требуется." }
          : { status: "WARN", detail: `чат найден, чтение: ${messages.reason}`, solution: "Обновите чат и повторите проверку." };
        allowlist = allowed
          ? { status: "OK", detail: `${actionType}: разрешён`, solution: "Не требуется." }
          : { status: "WARN", detail: `${actionType}: не разрешён`, solution: "Это нормально для READ-ONLY; добавляйте только перед намеренной отправкой." };
      } else {
        selectedChat = { status: "FAIL", detail: owned.reason, solution: "Выберите чат текущего привязанного аккаунта." };
      }
    }

    const rows = [
      { component: "UI", status: "OK", detail: `раздел ${safeState(body).section || "client"}, чатов видно: ${safeState(body).visibleChatsCount}`, solution: "Не требуется." },
      { component: "EPICGRAM API", status: api.ok ? "OK" : "FAIL", detail: api.ok ? "backend отвечает" : `HTTP ${api.status}`, solution: api.ok ? "Не требуется." : "Перезапустите backend на порту 8788." },
      { component: "Telegram/TDLib", status: telegramReady ? (duplicateSlots ? "WARN" : "OK") : "FAIL", detail: telegramReady ? `авторизован; ready slots: ${readyAccounts.length}${duplicateSlots ? `; дубликатов: ${duplicateSlots}` : ""}` : "runtime не готов", solution: telegramReady ? (duplicateSlots ? "Позже удалить лишние слоты после проверки владельцем." : "Не требуется.") : "Повторно проверьте TDLib-авторизацию." },
      { component: "Выбранный чат", ...selectedChat },
      { component: "Allowlist", ...allowlist },
      { component: "n8n", status: n8nState?.online ? (n8nLatest.status === "success" ? "OK" : Number(n8nState?.failed || 0) > 0 ? "WARN" : "OK") : "FAIL", detail: n8nState?.online ? `workflows: ${n8nState?.workflows ?? 0}; latest: ${n8nLatest.status || "unknown"}; history success: ${n8nState?.success ?? 0}, failed: ${n8nState?.failed ?? 0}` : "offline", solution: n8nState?.online ? (n8nLatest.status === "success" ? "Текущий workflow работает; старые failed executions сохранены как история." : "Проверьте последний failed execution.") : "Запустите n8n на порту 5678." },
      { component: "OpenClaw", status: openclaw.ok ? "OK" : "FAIL", detail: openclaw.ok ? "health отвечает" : `HTTP ${openclaw.status}`, solution: openclaw.ok ? "Не требуется." : "Запустите OpenClaw на порту 8787." },
      { component: "AI-модель", status: operatorState?.modelOnline ? "OK" : "FAIL", detail: operatorState?.modelOnline ? `online: ${operatorState?.activeModel || operatorState?.primaryModel}` : `offline: ${(operatorState?.errors || []).join(", ") || "model unavailable"}`, solution: operatorState?.modelOnline ? "Не требуется." : "Перезапустите или обновите Ollama и повторите chat completion." },
      { component: "Approval", status: operatorState?.approvalRequired === true && operatorState?.autoSendAllowed === false ? "OK" : "WARN", detail: `manual approval: ${operatorState?.approvalRequired === true ? "ON" : "OFF"}; auto-send: ${operatorState?.autoSendAllowed === true ? "ON" : "OFF"}`, solution: "Оставить manual approval включённым." },
      { component: "Инфраструктура", status: offlineServices.length ? "WARN" : "OK", detail: offlineServices.length ? `offline: ${offlineServices.join(", ")}` : "все зарегистрированные сервисы online", solution: offlineServices.length ? "Поднимать только сервисы, необходимые текущему сценарию." : "Не требуется." },
    ];

    return NextResponse.json({
      ok: true,
      tool,
      readonly: true,
      result: { text: "READ-ONLY аудит EPICGRAM завершён.", rows },
      safety: { secretsReturned: false, writesExecuted: false, telegramMessagesReadOnly: true, sentToTelegram: false },
    }, { headers: H });
  }

  if (tool === "inspect_state") {
    return NextResponse.json({
      ok: true,
      tool,
      readonly: true,
      result: {
        text: "Состояние клиента прочитано.",
        clientState: safeState(body),
        telegramBinding: { bound: bound.kind === "ok", ownerMatched: bound.kind !== "mismatch", account: accountId ? "server-bound-ready" : null },
      },
      safety: { secretsReturned: false, writesExecuted: false, approvalRequiredForWrites: true },
    }, { headers: H });
  }

  if (tool === "n8n_status" || tool === "n8n_workflows") {
    const path = tool === "n8n_status" ? "/infra/n8n" : "/infra/n8n/workflows";
    const upstream = await backendJson(path);
    return NextResponse.json({
      ok: upstream.ok,
      tool,
      readonly: true,
      result: upstream.body,
      safety: { secretsReturned: false, writesExecuted: false, n8nExecutionAllowed: false },
    }, { status: upstream.ok ? 200 : 502, headers: H });
  }

  if (tool === "openclaw_status") {
    const [operator, infra] = await Promise.all([
      backendJson("/operator/status").catch((error) => ({ ok: false, status: 502, body: { error: String(error) } })),
      backendJson("/infra/status").catch((error) => ({ ok: false, status: 502, body: { error: String(error) } })),
    ]);
    return NextResponse.json({
      ok: operator.ok || infra.ok,
      tool,
      readonly: true,
      result: { text: "OpenClaw/operator runtime status прочитан.", operator: operator.body, infra: infra.body },
      safety: { secretsReturned: false, writesExecuted: false },
    }, { headers: H });
  }

  if (!accountId) {
    return NextResponse.json({ ok: false, tool, error: bound.kind === "mismatch" ? "owner_mismatch" : "no_binding", text: "Telegram account не привязан к текущей EPICGRAM-сессии." }, { status: bound.kind === "mismatch" ? 403 : 409, headers: H });
  }
  if (!chatId) {
    return NextResponse.json({ ok: false, tool, error: "chat_required", text: "Для этого инструмента нужен выбранный Telegram-чат." }, { status: 409, headers: H });
  }

  const owned = await assertChatBelongsToBoundAccount(principal, chatId);
  if (!owned.ok) return NextResponse.json({ ok: false, tool, error: owned.reason, text: owned.reason }, { status: 403, headers: H });

  const msgResult = await getMessages(principal, chatId, 40);
  if (!msgResult.ok) return NextResponse.json({ ok: false, tool, error: msgResult.reason, text: msgResult.reason }, { status: 409, headers: H });

  const messages = (msgResult.messages as Array<Record<string, unknown>>) ?? [];
  const history = messagesForAi(messages);

  if (tool === "read_chat") {
    return NextResponse.json({
      ok: true,
      tool,
      readonly: true,
      result: {
        text: `Чат «${owned.chat.title || chatTitle}»: последние сообщения.\n${renderMessages(messages, 12)}`,
        chatId,
        chatTitle: owned.chat.title || chatTitle,
        messagesCount: history.length,
      },
      safety: { secretsReturned: false, writesExecuted: false },
    }, { headers: H });
  }

  if (tool === "n8n_draft_approval") {
    const safePayload = {
      workspace_id: `epicgram-${principal.workspaceId || "local"}`,
      chat_id: chatId,
      chat_title: owned.chat.title || chatTitle,
      messages: history.slice(-20).map((m) => ({ from: m.isOutgoing ? "operator" : "contact", text: m.content })),
      task: "prepare_reply",
      instruction: instruction || "prepare a concise Telegram reply draft",
      approval_required: true,
      source: "epicgram_operator_tools",
    };
    const n8n = await callN8nDraftWorkflow(safePayload);
    const draft = n8n.ok && n8n.draft ? n8n.draft : localDraft(history, instruction);
    const isChannel = Boolean(owned.chat.isChannel) || owned.chat.category === "channel" || owned.chat.type === "channel";
    return NextResponse.json({
      ok: true,
      tool,
      readonly: false,
      result: {
        text: draft,
        chatId,
        chatTitle: owned.chat.title || chatTitle,
        n8n: n8n.ok ? { status: "delivered", source: n8n.source, workflowStatus: n8n.rawStatus } : { status: "fallback", reason: n8n.reason },
      },
      pendingAction: draft ? { actionType: isChannel ? "publish_post" : "telegram_send", chatId, chatTitle: owned.chat.title || chatTitle, text: draft, auditId: null } : null,
      safety: { secretsReturned: false, writesExecuted: false, approvalRequiredForWrites: true, sentToTelegram: false },
    }, { headers: H });
  }

  if (tool === "summarize_chat" || tool === "prepare_draft" || tool === "create_approval") {
    const routerTool = tool === "summarize_chat" ? "summarize_chat" : "draft_reply";
    const upstream = await routeAi(routerTool, {
      instruction: instruction || (tool === "summarize_chat" ? "Суммаризируй выбранный чат." : "Подготовь короткий черновик ответа."),
      chatId,
      chatTitle: owned.chat.title || chatTitle,
      history,
    });
    const routed = upstream.body as Record<string, any>;
    const proposed = routed?.proposedAction;
    const rawDraft = text(proposed?.text) || text(routed?.result?.text);
    const aiDegraded = routed?.model === "epicgram-local-operator-guard" || /brain_|offline|guard/i.test(String(routed?.reason || rawDraft));
    const draft = redactSecrets(
      tool === "summarize_chat" && (!rawDraft || aiDegraded)
        ? localSummary(history, text(owned.chat.title) || chatTitle)
        : (!rawDraft || aiDegraded)
          ? localDraft(history, instruction)
          : rawDraft
    );
    const isChannel = Boolean(owned.chat.isChannel) || owned.chat.category === "channel" || owned.chat.type === "channel";
    return NextResponse.json({
      ok: upstream.ok && routed?.ok !== false,
      tool,
      readonly: tool !== "create_approval",
      result: { text: draft || text(routed?.error) || "Готово.", chatId, chatTitle: owned.chat.title || chatTitle, auditId: routed?.auditId ?? null, model: routed?.model ?? null },
      pendingAction: tool === "create_approval" && draft ? { actionType: isChannel ? "publish_post" : "telegram_send", chatId, chatTitle: owned.chat.title || chatTitle, text: draft, auditId: routed?.auditId ?? null } : null,
      safety: { secretsReturned: false, writesExecuted: false, approvalRequiredForWrites: true },
    }, { headers: H });
  }

  return NextResponse.json({ ok: false, error: "unknown_tool", tool }, { status: 400, headers: H });
}

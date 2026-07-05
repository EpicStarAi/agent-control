// EPIC☠️GRAM AI reply generation (EPIC☠STAR persona).
//
// Calls the configured OpenAI-compatible endpoint (EPICGRAM_AI_BASE_URL — our
// self-hosted epicstar-brain proxy to Ollama, or any OpenAI-style server) and
// returns a DRAFT reply. This module never sends anything to Telegram. Sending
// is a separate, operator-gated action (see telegram-runtime.sendMessage).

import { appendMemory, getRecentMemory } from "./memory-store.mjs";

const DEFAULT_TIMEOUT_MS = 45000;

const PERSONA_SYSTEM_PROMPT = `Ты — EPIC☠STAR: цифровая персона-первопилот владельца, архитектор AI-экосистем,
и одновременно AI-ассистент оператора Telegram. Ты работаешь С ТЕКУЩИМ ОТКРЫТЫМ ЧАТОМ:
сообщения выше — это реальная переписка (incoming = собеседник, outgoing = оператор/наш аккаунт).

Твои задачи по команде оператора:
- «проанализируй чат» — разбери, о чём идёт речь, тон, намерения собеседника, риски.
- «сделай краткое резюме» — 2–4 пункта: суть, статус, открытые вопросы.
- «подготовь ответ» / «подготовь черновик» — предложи один уместный черновик ответа на последнее входящее.
- «что требует внимания?» — назови, что важно/срочно/рискованно в этом чате.
- «какой следующий шаг?» — предложи конкретное следующее действие оператора.
Если команда не распознана — веди себя как ассистент по этому чату и помоги по существу.

Правила: пиши живо, по делу, голосом EPIC☠STAR (системно, на шаг вперёд, без воды),
на языке собеседника (обычно русский). Не выдумывай факты о собеседнике; мало контекста —
предложи нейтральный безопасный вариант. Никаких незаконных, вредоносных или спам-действий.

КРИТИЧНО: ты генерируешь ТОЛЬКО черновик/анализ для оператора и НИКОГДА не отправляешь
сообщения сам. Финальное решение и отправку делает человек-оператор (approval-gate обязателен).`;

function configuredValue(value) {
  if (!value) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;
  if (normalized === "...") return false;
  if (normalized.startsWith("replace-with-")) return false;
  return true;
}

function aiConfig() {
  return {
    enabled: process.env.EPICGRAM_AI_ENABLED === "true",
    provider: process.env.EPICGRAM_AI_PROVIDER || "openai",
    baseUrl: process.env.EPICGRAM_AI_BASE_URL || null,
    model: process.env.EPICGRAM_OPENAI_MODEL || "gpt-4.1-mini",
    apiKey: process.env.EPICGRAM_AI_API_KEY || process.env.OPENAI_API_KEY || null,
    sendMode: process.env.EPICGRAM_AI_SEND_MODE || "operator_approval_required"
  };
}

// Build the chat-completions message list from recent Telegram history + memory.
function buildMessages({ chatTitle, history = [], memory = [], instruction }) {
  const messages = [{ role: "system", content: PERSONA_SYSTEM_PROMPT }];

  if (memory.length > 0) {
    const memoryText = memory
      .map((m) => `(${m.role}) ${m.content}`)
      .join("\n")
      .slice(0, 4000);
    messages.push({
      role: "system",
      content: `Память по этому диалогу (для контекста, не повторяй дословно):\n${memoryText}`
    });
  }

  if (chatTitle) {
    messages.push({ role: "system", content: `Чат: ${chatTitle}.` });
  }

  // Map recent Telegram messages: incoming -> user, outgoing -> assistant.
  for (const item of history.slice(-20)) {
    const content = String(item?.content ?? "").trim();
    if (!content) continue;
    messages.push({ role: item?.isOutgoing ? "assistant" : "user", content });
  }

  messages.push({
    role: "user",
    content:
      instruction?.trim() ||
      "Предложи один уместный вариант ответа на последнее входящее сообщение в этом чате."
  });

  return messages;
}

/**
 * Generate a draft reply. Returns { ok, draft, model, raw } or { ok:false, error }.
 * Never sends to Telegram.
 */
export async function generateDraftReply({ conversationId, chatTitle, history = [], instruction } = {}) {
  const config = aiConfig();

  if (!config.enabled) {
    return { ok: false, status: 409, error: "AI отключён. Установите EPICGRAM_AI_ENABLED=true в .env.local." };
  }

  const isSelfHosted = config.provider !== "openai" && configuredValue(config.baseUrl);
  if (!isSelfHosted && !configuredValue(config.apiKey)) {
    return { ok: false, status: 409, error: "AI включён, но не настроен base URL мозга или API-ключ на backend." };
  }
  if (!configuredValue(config.baseUrl) && isSelfHosted) {
    return { ok: false, status: 409, error: "EPICGRAM_AI_BASE_URL не настроен для self-hosted мозга." };
  }

  // OpenAI-compatible endpoint. EPICGRAM_AI_BASE_URL already points at the full
  // chat-completions path for the self-hosted brain (…/v1/chat/completions).
  const endpoint = config.baseUrl;
  const memory = await getRecentMemory(conversationId, 20).catch(() => []);
  const messages = buildMessages({ chatTitle, history, memory, instruction });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const headers = { "content-type": "application/json" };
    if (configuredValue(config.apiKey)) headers.authorization = `Bearer ${config.apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: config.model, stream: false, messages }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status: 502,
        error: `Мозг ответил ${response.status}. Проверьте, что epicstar-brain слушает на ${endpoint}.`,
        raw: data
      };
    }

    const draft =
      data?.choices?.[0]?.message?.content?.trim() ??
      data?.message?.content?.trim() ??
      data?.response?.trim() ??
      "";

    if (!draft) {
      return { ok: false, status: 502, error: "Мозг вернул пустой ответ.", raw: data };
    }

    // Persist context + the generated draft into dialogue memory.
    const lastIncoming = [...history].reverse().find((m) => m && !m.isOutgoing && m.content);
    if (lastIncoming?.content) {
      await appendMemory(conversationId, { role: "user", content: lastIncoming.content }).catch(() => {});
    }
    await appendMemory(conversationId, {
      role: "assistant",
      content: draft,
      meta: { stage: "draft", model: config.model }
    }).catch(() => {});

    return { ok: true, draft, model: config.model, sendMode: config.sendMode };
  } catch (error) {
    const aborted = error?.name === "AbortError";
    return {
      ok: false,
      status: aborted ? 504 : 502,
      error: aborted
        ? `Мозг не ответил за ${DEFAULT_TIMEOUT_MS / 1000}с (${endpoint}).`
        : `Не удалось обратиться к мозгу на ${endpoint}: ${error instanceof Error ? error.message : String(error)}`
    };
  } finally {
    clearTimeout(timeout);
  }
}

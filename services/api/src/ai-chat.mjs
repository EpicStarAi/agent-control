// EPIC☠️GRAM AI reply generation (EPIC☠STAR persona).
//
// Calls the configured OpenAI-compatible endpoint (EPICGRAM_AI_BASE_URL — our
// self-hosted epicstar-brain proxy to Ollama, or any OpenAI-style server) and
// returns a DRAFT reply. This module never sends anything to Telegram. Sending
// is a separate, operator-gated action (see telegram-runtime.sendMessage).

import { appendMemory, getRecentMemory } from "./memory-store.mjs";

const DEFAULT_TIMEOUT_MS = 45000;

const PERSONA_SYSTEM_PROMPT = `Ты — EPIC☠STAR: цифровая персона-первопилот владельца, архитектор AI-экосистем.
Ты помогаешь оператору отвечать в Telegram и управлять рабочей средой EPIC☠GRAM. Пиши живо, по делу,
узнаваемым голосом EPIC☠STAR: системно, на шаг вперёд, без воды. Отвечай на языке собеседника
(обычно русский). Ты генерируешь ТОЛЬКО черновик ответа или техническую подсказку для оператора —
ты НИКОГДА не отправляешь сообщения сам. Финальное решение и отправку делает человек-оператор.
Не выдумывай факты, не рекламируй сторонние сервисы и не уходи в маркетинговые списки, если тебя
прямо об этом не попросили. Если контекста мало — предложи нейтральный, безопасный вариант.
Никаких незаконных, вредоносных или спам-действий.`;

const OPERATOR_CHAT_SYSTEM_PROMPT = `Ты — EPIC💀CLAW, внутренний AI-оператор клиента EPIC☠GRAM и технический помощник владельца.
Отвечай именно владельцу в окне оператора, а не собеседнику выбранного Telegram-чата. Не создавай Telegram-черновик,
если владелец прямо этого не попросил. Не пересказывай постороннюю историю, не выдумывай результаты инструментов,
не утверждай, что что-то проверил или выполнил, если tool не возвращал такой результат. Пиши по-русски, коротко,
конкретно и без рекламных списков, шаблонной вежливости, шуток и отвлечённых советов. Если владелец сообщает о баге,
признай конкретную проблему и предложи следующий проверяемый шаг. Отправка в Telegram всегда остаётся ручной.`;

function configuredValue(value) {
  if (!value) return false;
  const normalized = String(value).trim();
  if (!normalized) return false;
  if (normalized === "...") return false;
  if (normalized.startsWith("replace-with-")) return false;
  return true;
}

function aiConfig() {
  const provider = process.env.EPICGRAM_AI_PROVIDER || "openai";
  const model = process.env.EPICGRAM_AI_MODEL || process.env.EPICGRAM_OPENAI_MODEL || process.env.OPERATOR_PRIMARY_MODEL || "gpt-4.1-mini";
  return {
    enabled: process.env.EPICGRAM_AI_ENABLED === "true",
    provider,
    baseUrl: process.env.EPICGRAM_AI_BASE_URL || null,
    model,
    visionModel: process.env.EPICGRAM_AI_VISION_MODEL || (provider === "ollama" ? "llava:7b" : model),
    maxTokens: Math.max(64, Math.min(1200, Number(process.env.EPICGRAM_AI_MAX_TOKENS || 320))),
    apiKey: process.env.EPICGRAM_AI_API_KEY || process.env.OPENAI_API_KEY || null,
    sendMode: process.env.EPICGRAM_AI_SEND_MODE || "operator_approval_required"
  };
}

function localFallbackDraft({ instruction, attachments = [], mode = "telegram_draft" } = {}, reason = "brain_offline") {
  const text = String(instruction || "").trim().toLowerCase();
  const hasImages = normalizeImageAttachments(attachments).length > 0;
  const operatorChat = mode === "operator_chat";

  if (/^(хай|hi|hello|привет|приветик|приветики|здаров|здоров)/i.test(text)) {
    return {
      ok: true,
      draft: operatorChat
        ? "На связи. Могу проверить клиент, выбранный чат, n8n, OpenClaw или подготовить черновик."
        : "На связи. EPIC💀CLAW работает в локальном guard-режиме: Telegram подключён, отправка только вручную.",
      model: "epicgram-local-operator-guard",
      sendMode: "operator_approval_required",
      degraded: true,
      reason
    };
  }

  if (hasImages) {
    return {
      ok: true,
      draft: "Скрин получил, но визуальный мозг сейчас недоступен. Могу проверить интерфейс по тексту ошибки/URL или после перезапуска Ollama/Open WebUI.",
      model: "epicgram-local-operator-guard",
      sendMode: "operator_approval_required",
      degraded: true,
      reason
    };
  }

  return {
    ok: true,
    draft: "Принял. Локальный мозг сейчас offline/падает, поэтому отвечаю безопасным guard-режимом. Напиши конкретно: открыть чат, проверить статус, подготовить черновик или разобрать ошибку.",
    model: "epicgram-local-operator-guard",
    sendMode: "operator_approval_required",
    degraded: true,
    reason
  };
}

function normalizeImageAttachments(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      name: String(item?.name || "clipboard-image").slice(0, 160),
      type: String(item?.type || "image/png").slice(0, 80),
      size: Number.isFinite(Number(item?.size)) ? Number(item.size) : 0,
      dataUrl: String(item?.dataUrl || "")
    }))
    .filter((item) => item.type.startsWith("image/") && item.dataUrl.startsWith("data:image/") && item.dataUrl.length <= 3_600_000)
    .slice(0, 3);
}

// Build the chat-completions message list from recent Telegram history + memory.
function buildMessages({ chatTitle, history = [], memory = [], instruction, attachments = [], mode = "telegram_draft" }) {
  const operatorChat = mode === "operator_chat";
  const messages = [{ role: "system", content: operatorChat ? OPERATOR_CHAT_SYSTEM_PROMPT : PERSONA_SYSTEM_PROMPT }];

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

  const cleanInstruction =
    instruction?.trim() ||
    "Предложи один уместный вариант ответа на последнее входящее сообщение в этом чате.";
  const operatorInstruction = operatorChat
    ? `Текущий запрос владельца: ${cleanInstruction}\n\nОтветь на запрос как технический оператор EPIC☠GRAM. Не подменяй ответ Telegram-черновиком.`
    : `Текущая команда оператора: ${cleanInstruction}\n\nОтветь именно на эту команду. Если это обычное сообщение оператору, не превращай его в рекламный обзор.`;
  const images = normalizeImageAttachments(attachments);

  if (images.length > 0) {
    const imageInstruction = operatorChat
      ? "Проанализируй изображения и верни короткий конкретный результат прямо в окно оператора: что видно, в чём проблема и что делать дальше. Не создавай Telegram-черновик без прямой просьбы владельца."
      : "Проанализируй изображения визуально. Если нужен ответ собеседнику — дай готовый черновик; если это интерфейс — дай короткие выводы и действия.";
    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `${operatorInstruction}\n\nОператор приложил ${images.length} изображение(я) из буфера. ${imageInstruction}`
        },
        ...images.map((image) => ({
          type: "image_url",
          image_url: { url: image.dataUrl }
        }))
      ]
    });
  } else {
    messages.push({
      role: "user",
      content: operatorInstruction
    });
  }

  return messages;
}

/**
 * Generate a draft reply. Returns { ok, draft, model, raw } or { ok:false, error }.
 * Never sends to Telegram.
 */
export async function generateDraftReply({ conversationId, chatTitle, history = [], instruction, attachments = [], mode = "telegram_draft" } = {}) {
  const config = aiConfig();
  const images = normalizeImageAttachments(attachments);
  const selectedModel = images.length > 0 ? config.visionModel : config.model;

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
  // The operator window already sends its visible history. Reusing persisted
  // Telegram/draft memory here can contaminate the control conversation.
  const memory = mode === "operator_chat"
    ? []
    : await getRecentMemory(conversationId, 20).catch(() => []);
  const messages = buildMessages({ chatTitle, history, memory, instruction, attachments, mode });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const headers = { "content-type": "application/json" };
    if (configuredValue(config.apiKey)) headers.authorization = `Bearer ${config.apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: selectedModel, stream: false, temperature: 0.2, max_tokens: config.maxTokens, messages }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      return localFallbackDraft({ instruction, attachments, mode }, `brain_http_${response.status}`);
    }

    let draft =
      data?.choices?.[0]?.message?.content?.trim() ??
      data?.message?.content?.trim() ??
      data?.response?.trim() ??
      "";

    if (!draft) {
      return localFallbackDraft({ instruction, attachments, mode }, "brain_empty_response");
    }

    let resultModel = selectedModel;
    if (images.length > 0 && selectedModel !== config.model) {
      const refinementResponse = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model,
          stream: false,
          temperature: 0.1,
          max_tokens: config.maxTokens,
          messages: [
            { role: "system", content: OPERATOR_CHAT_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                `Запрос владельца: ${String(instruction || "Проанализируй скриншот").trim()}`,
                `Первичный визуальный анализ модели ${selectedModel}: ${draft}`,
                "Верни только короткий ответ на русском языке для окна оператора. Сохрани наблюдаемые факты, не добавляй новые и явно отметь, если текст или детали на скриншоте распознаны неуверенно.",
              ].join("\n\n"),
            },
          ],
        }),
        signal: controller.signal,
      }).catch(() => null);
      if (refinementResponse?.ok) {
        const refinedData = await refinementResponse.json().catch(() => null);
        const refinedDraft =
          refinedData?.choices?.[0]?.message?.content?.trim() ??
          refinedData?.message?.content?.trim() ??
          refinedData?.response?.trim() ??
          "";
        if (refinedDraft) {
          draft = refinedDraft;
          resultModel = `${selectedModel} + ${config.model}`;
        }
      }
    }

    // Persist context + the generated draft into dialogue memory.
    const lastIncoming = [...history].reverse().find((m) => m && !m.isOutgoing && m.content);
    if (lastIncoming?.content) {
      await appendMemory(conversationId, { role: "user", content: lastIncoming.content }).catch(() => {});
    }
    await appendMemory(conversationId, {
      role: "assistant",
      content: draft,
      meta: { stage: "draft", model: resultModel }
    }).catch(() => {});

    return { ok: true, draft, model: resultModel, sendMode: config.sendMode };
  } catch (error) {
    const aborted = error?.name === "AbortError";
    return localFallbackDraft({ instruction, attachments, mode }, aborted ? "brain_timeout" : "brain_fetch_failed");
  } finally {
    clearTimeout(timeout);
  }
}

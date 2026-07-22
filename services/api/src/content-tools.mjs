// EPIC☠️GRAM — Content Draft Tools (P3.6a). BACKEND-ONLY, DRAFT/PROPOSAL-ONLY.
//
// competitor analysis / content plan / post draft / schedule proposal. These
// functions NEVER publish, schedule, send, create channels, or crawl private
// data. They only parse operator-provided/public context and produce drafts +
// pending_approval proposals. Execution stays blocked by policy + approval.

const LLM_TIMEOUT_MS = 45000;

// Self-contained LLM helper (no memory side-effects). Mirrors tool-router's.
async function llmComplete(system, user, role = "content") {
  const provider = process.env.EPICGRAM_AI_PROVIDER || "openai";
  const endpoint = process.env.EPICGRAM_AI_BASE_URL || null;
  const model = process.env.EPICGRAM_AI_MODEL || process.env.EPICGRAM_OPENAI_MODEL || process.env.OPERATOR_PRIMARY_MODEL || "gpt-4.1-mini";
  const apiKey = process.env.EPICGRAM_AI_API_KEY || process.env.OPENAI_API_KEY || null;
  const selfHosted = provider !== "openai" && endpoint;
  if (!endpoint || (!apiKey && !selfHosted && provider !== "ollama")) {
    return { ok: false, error: "no_ai_route", model };
  }
  const headers = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, stream: false, temperature: 0.7, messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ] }),
      signal: ctrl.signal
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) return { ok: false, error: `llm_${resp.status}`, model };
    const text = (data?.choices?.[0]?.message?.content ?? data?.message?.content ?? data?.response ?? "").trim();
    return text ? { ok: true, text, model } : { ok: false, error: "empty", model };
  } catch (e) {
    return { ok: false, error: e?.name === "AbortError" ? "timeout" : String(e?.message || e), model };
  } finally {
    clearTimeout(to);
  }
}

function extractJsonObject(t) {
  if (!t) return null;
  const s = String(t).replace(/```json|```/g, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}
function extractJsonArray(t) {
  if (!t) return null;
  const s = String(t).replace(/```json|```/g, "");
  const a = s.indexOf("["), b = s.lastIndexOf("]");
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch { return null; }
}
function historyText(msgs, cap = 3000) {
  return (msgs || []).map((m) => `${m.isOutgoing ? "Оператор" : "Собеседник"}: ${m.content}`).join("\n").slice(0, cap);
}
const arr = (a, n) => (Array.isArray(a) ? a.slice(0, n).map((x) => String(x)) : []);

// ---- 1. parse_competitors --------------------------------------------------
// Parses ONLY operator-provided text/URLs/notes/context. No crawl, no scrape.
export async function parseCompetitors(ctx) {
  const p = ctx.payload || {};
  const providedUrls = Array.isArray(p.urls) ? p.urls.join("\n") : String(p.urls || "");
  const blob = [ctx.instruction, p.text, p.notes, providedUrls, ...ctx.msgs.map((m) => m.content)]
    .filter(Boolean).join("\n");
  const uniq = (a) => [...new Set(a)];
  const urls = uniq([...blob.matchAll(/https?:\/\/[^\s]+/gi)].map((x) => x[0]));
  const tme = uniq([...blob.matchAll(/(?:https?:\/\/)?t\.me\/[^\s]+/gi)].map((x) => x[0]));
  const handles = uniq([...blob.matchAll(/@[a-zA-Z0-9_]{3,}/g)].map((x) => x[0]));
  const items = [
    ...urls.map((v) => ({ type: "url", value: v })),
    ...tme.map((v) => ({ type: "telegram", value: v })),
    ...handles.map((v) => ({ type: "handle", value: v }))
  ];

  const sys = "Ты — конкурентный аналитик EPIC☠️GRAM. Анализируй ТОЛЬКО предоставленный оператором текст/ссылки/заметки. Не выдумывай данные, которых нет; не притворяйся, что заходил на сайты. Верни СТРОГО JSON без обёрток: {\"positioning\":\"\",\"strengths\":[],\"weaknesses\":[],\"contentAngles\":[],\"risks\":[],\"opportunities\":[]}.";
  const usr = `Материал о конкурентах (только это, без веб-обхода):\n${blob.slice(0, 6000) || "(пусто)"}`;
  const r = await llmComplete(sys, usr, "control");
  const j = (r.ok && extractJsonObject(r.text)) || {};
  const analysis = {
    positioning: String(j.positioning || "").slice(0, 600),
    strengths: arr(j.strengths, 8),
    weaknesses: arr(j.weaknesses, 8),
    contentAngles: arr(j.contentAngles, 8),
    risks: arr(j.risks, 8),
    opportunities: arr(j.opportunities, 8)
  };
  const lines = [
    "Конкурентный анализ (по предоставленному тексту, без веб-обхода):",
    analysis.positioning ? `Позиционирование: ${analysis.positioning}` : "",
    analysis.strengths.length ? `Сильные: ${analysis.strengths.join("; ")}` : "",
    analysis.weaknesses.length ? `Слабые: ${analysis.weaknesses.join("; ")}` : "",
    analysis.contentAngles.length ? `Контент-углы: ${analysis.contentAngles.join("; ")}` : "",
    analysis.risks.length ? `Риски: ${analysis.risks.join("; ")}` : "",
    analysis.opportunities.length ? `Возможности: ${analysis.opportunities.join("; ")}` : "",
    items.length ? `Источники: ${items.map((i) => i.value).join(", ")}` : "Явных ссылок/handle не найдено."
  ].filter(Boolean);
  return { ok: true, text: lines.join("\n"), items, extra: analysis, proposedAction: null, model: r.model || null };
}

// ---- 2. generate_content_plan ----------------------------------------------
export async function generateContentPlan(ctx) {
  const p = ctx.payload || {};
  const m = String(ctx.instruction).match(/\d+/);
  let days = Number(p.days) || (m ? Number(m[0]) : 7);
  days = Math.max(1, Math.min(30, Number.isFinite(days) ? days : 7));
  const niche = p.niche || "";
  const persona = p.persona || "";
  const goal = p.goal || "";
  const competitorNotes = p.competitorNotes || "";
  const chatCtx = ctx.msgs.length ? `\nКонтекст диалога:\n${historyText(ctx.msgs)}` : "";

  const sys = `Ты — контент-стратег EPIC☠️GRAM. Составь контент-план на ${days} дней. Верни СТРОГО JSON-массив из ${days} объектов без текста вокруг. Каждый объект: {"day":<число>,"topic":"","hook":"","format":"пост|reels|видео|стрим|карусель","goal":"","cta":""}.`;
  const usr = [
    ctx.instruction ? `Запрос: ${ctx.instruction}` : "",
    niche ? `Ниша: ${niche}` : "",
    persona ? `Персона: ${persona}` : "",
    goal ? `Цель: ${goal}` : "",
    competitorNotes ? `Заметки о конкурентах: ${competitorNotes}` : "",
    chatCtx
  ].filter(Boolean).join("\n") || `Составь план на ${days} дней.`;

  const r = await llmComplete(sys, usr, "content");
  if (!r.ok) return { ok: false, error: r.error, model: r.model };
  const rawArr = extractJsonArray(r.text) || [];
  const plan = rawArr.slice(0, days).map((x, i) => ({
    day: Number(x.day) || i + 1,
    topic: String(x.topic || x.title || "").slice(0, 160),
    hook: String(x.hook || "").slice(0, 200),
    format: String(x.format || "пост").slice(0, 40),
    goal: String(x.goal || "").slice(0, 160),
    cta: String(x.cta || "").slice(0, 160)
  }));
  const text = plan.length
    ? [`Контент-план на ${plan.length} дней (черновик):`, ...plan.map((d) => `День ${d.day}: ${d.topic} (${d.format})${d.hook ? " · " + d.hook : ""}${d.cta ? " · CTA: " + d.cta : ""}`)].join("\n")
    : "Модель вернула пустой план — попробуй уточнить запрос.";
  return { ok: plan.length > 0, text, items: plan, extra: { plan }, proposedAction: null, model: r.model };
}

// ---- 3. prepare_post -------------------------------------------------------
export async function preparePost(ctx) {
  const p = ctx.payload || {};
  const topic = p.topic || ctx.instruction || "короткий пост для канала";
  const targetChannel = p.targetChannel || p.channel || "";
  const persona = p.persona || "";
  const style = p.style || "";
  const planItem = p.planItem ? (typeof p.planItem === "string" ? p.planItem : JSON.stringify(p.planItem)) : "";

  const sys = "Ты — контент-редактор EPIC☠️GRAM. Подготовь ЧЕРНОВИК поста для канала. Верни СТРОГО JSON без обёрток: {\"title\":\"\",\"body\":\"\",\"format\":\"пост|reels|видео|карусель\",\"hashtags\":[]}.";
  const usr = [
    `Тема: ${topic}`,
    targetChannel ? `Канал: ${targetChannel}` : "",
    persona ? `Персона: ${persona}` : "",
    style ? `Стиль: ${style}` : "",
    planItem ? `Пункт плана: ${planItem}` : "",
    ctx.msgs.length ? `Контекст:\n${historyText(ctx.msgs, 1500)}` : ""
  ].filter(Boolean).join("\n");

  const r = await llmComplete(sys, usr, "content");
  if (!r.ok) return { ok: false, error: r.error, model: r.model };
  const j = extractJsonObject(r.text) || { body: r.text };
  const title = String(j.title || "").slice(0, 160);
  const body = String(j.body || r.text || "").trim();
  const format = String(j.format || "пост").slice(0, 40);
  const hashtags = Array.isArray(j.hashtags) ? j.hashtags.slice(0, 12).map((h) => String(h)) : [];
  const metadata = { targetChannel: targetChannel || null, format, hashtags, persona: persona || null, style: style || null };
  const displayText = [title, body, hashtags.length ? hashtags.join(" ") : "", `[${format}${targetChannel ? " → " + targetChannel : ""}]`].filter(Boolean).join("\n\n");

  // DRAFT ONLY. publish_post proposal is pending_approval and NEVER executed here.
  const proposedAction = body
    ? { type: "publish_post", status: "pending_approval", targetChannel: targetChannel || null, text: body, metadata }
    : null;
  return { ok: !!body, text: displayText, items: [{ title, format, hashtags }], extra: { title, body, format, hashtags, metadata }, proposedAction, model: r.model };
}

// ---- 4. propose_schedule ---------------------------------------------------
export async function proposeSchedule(ctx) {
  const p = ctx.payload || {};
  const channel = p.channel || p.targetChannel || "";
  const timezone = p.timezone || "UTC";
  const frequency = p.frequency || "";
  const posts = Array.isArray(p.posts) ? p.posts : [];

  const sys = "Ты — планировщик контента EPIC☠️GRAM. Предложи ЧЕРНОВИК расписания публикаций (никаких реальных действий). Верни СТРОГО JSON-массив: [{\"time\":\"YYYY-MM-DD HH:mm\",\"title\":\"\",\"rationale\":\"\"}]. Используй относительные разумные слоты, не более 14 пунктов.";
  const usr = [
    ctx.instruction ? `Запрос: ${ctx.instruction}` : "",
    channel ? `Канал: ${channel}` : "",
    `Таймзона: ${timezone}`,
    frequency ? `Частота: ${frequency}` : "",
    posts.length ? `Посты: ${posts.map((x) => (typeof x === "string" ? x : x.title || "")).filter(Boolean).join("; ")}` : ""
  ].filter(Boolean).join("\n") || "Предложи разумное расписание публикаций на неделю.";

  const r = await llmComplete(sys, usr, "content");
  if (!r.ok) return { ok: false, error: r.error, model: r.model };
  const rawArr = extractJsonArray(r.text) || [];
  const schedulePlan = rawArr.slice(0, 14).map((x) => ({
    time: String(x.time || "").slice(0, 40),
    title: String(x.title || "").slice(0, 160),
    rationale: String(x.rationale || "").slice(0, 200)
  }));
  const text = schedulePlan.length
    ? ["Предложенное расписание (черновик, не исполняется):", ...schedulePlan.map((s) => `${s.time} — ${s.title}${s.rationale ? " · " + s.rationale : ""}`)].join("\n")
    : "Не удалось составить расписание — уточни запрос.";

  // DRAFT ONLY. schedule_post proposal is pending_approval and NEVER executed here.
  const proposedAction = schedulePlan.length
    ? { type: "schedule_post", status: "pending_approval", channel: channel || null, timezone, schedulePlan }
    : null;
  return { ok: schedulePlan.length > 0, text, items: schedulePlan, extra: { schedulePlan }, proposedAction, model: r.model };
}

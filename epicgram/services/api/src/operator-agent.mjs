// EPIC☠STAR AI-Operator: turns operator chat into real Telegram actions.
// Read actions run immediately; write actions (send_message) are proposed and
// require explicit operator confirmation (confirmAction) before execution.
import { getChats, getMessages, sendMessage, getStatus } from "./telegram-runtime.mjs";

const SYS = `Ты — EPIC☠STAR, AI-оператор Telegram-клиента. Тебе дают команду оператора и список доступных чатов (формат "Название :: id").
Верни СТРОГО ОДИН JSON-объект, без markdown и без пояснений, одного из видов:
{"action":"reply","text":"<живой ответ оператору>"}
{"action":"list_chats"}
{"action":"read_messages","chatId":"<id из списка>","chatTitle":"<название>"}
{"action":"send_message","chatId":"<id из списка>","chatTitle":"<название>","text":"<текст сообщения>"}
Правила: chatId бери ТОЛЬКО из переданного списка, не выдумывай. Если чат непонятен — верни action reply с уточняющим вопросом. Отправку (send_message) ты лишь ПРЕДЛАГАЕШЬ — выполнит оператор после подтверждения. Голос дерзкий, короткий, без токсика.`;

function aiCfg() {
  return {
    url: process.env.EPICGRAM_AI_BASE_URL,
    key: process.env.EPICGRAM_AI_API_KEY || process.env.OPENAI_API_KEY || null,
    model: process.env.EPICGRAM_OPENAI_MODEL || "openai/gpt-4o-mini"
  };
}

function parseJson(s) {
  if (!s) return null;
  let t = String(s).trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (m) t = m[0];
  try { return JSON.parse(t); } catch { return null; }
}

// Pick a Telegram account slot that is actually authorized (ready), not just the
// "active" slot — the active one may be an empty unauthenticated slot.
async function resolveReadyAccount(accountId) {
  if (accountId) return accountId;
  try {
    const st = await getStatus();
    const data = st && st.body ? st.body : st;
    const accs = (data && data.accounts) || [];
    const ready = accs.find((a) => a.authorizationState === "authorizationStateReady" || a.status === "ready");
    if (ready) return ready.slotId || ready.id || accountId;
    if (data && data.activeAccountId) return data.activeAccountId;
  } catch {}
  return accountId;
}

async function callBrain(messages) {
  const c = aiCfg();
  if (!c.url) return "";
  const headers = { "content-type": "application/json" };
  if (c.key) headers.authorization = `Bearer ${c.key}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const resp = await fetch(c.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: c.model, stream: false, temperature: 0.3, messages }),
      signal: controller.signal
    });
    const d = await resp.json().catch(() => null);
    return d?.choices?.[0]?.message?.content?.trim() ?? d?.message?.content?.trim() ?? "";
  } finally { clearTimeout(timer); }
}

export async function runOperator({ text, history = [], accountId } = {}) {
  accountId = await resolveReadyAccount(accountId);
  let chats = [];
  try {
    const cs = await getChats({ accountId });
    chats = (cs?.body?.chats || []).slice(0, 40).map((c) => ({ id: String(c.id ?? c.chatId ?? ""), title: c.title || c.name || c.displayName || String(c.id ?? "") }));
  } catch {}
  const chatList = chats.length ? chats.map((c) => `- ${c.title} :: ${c.id}`).join("\n") : "(чатов нет / аккаунт не авторизован)";
  const msgs = [{ role: "system", content: SYS }, { role: "system", content: "Доступные чаты:\n" + chatList }];
  for (const h of history.slice(-10)) msgs.push({ role: h.isOutgoing ? "assistant" : "user", content: String(h.content || "") });
  msgs.push({ role: "user", content: String(text || "Привет") });

  const raw = await callBrain(msgs);
  const j = parseJson(raw) || { action: "reply", text: raw || "…" };

  if (j.action === "list_chats") {
    return { kind: "reply", text: chats.length ? ("Доступные чаты:\n" + chats.map((c) => "• " + c.title).join("\n")) : "Нет доступных чатов — проверь авторизацию Telegram." };
  }
  if (j.action === "read_messages" && j.chatId) {
    try {
      const mm = await getMessages({ accountId, chatId: j.chatId });
      const arr = (mm?.body?.messages || []).slice(-8).map((m) => "• " + (m.text || m.content || "[медиа]")).join("\n");
      return { kind: "reply", text: `Последние сообщения «${j.chatTitle || j.chatId}»:\n` + (arr || "(пусто)") };
    } catch { return { kind: "reply", text: "Не смог прочитать этот чат." }; }
  }
  if (j.action === "send_message" && j.chatId && j.text) {
    return {
      kind: "pending",
      reply: `Готов отправить в «${j.chatTitle || j.chatId}»:\n«${j.text}»`,
      action: { tool: "send_message", chatId: String(j.chatId), chatTitle: j.chatTitle || "", text: String(j.text), accountId: accountId || "" }
    };
  }
  return { kind: "reply", text: j.text || raw || "…" };
}

export async function confirmAction({ action, accountId } = {}) {
  if (!action || action.tool !== "send_message") return { ok: false, message: "неизвестное действие" };
  const acc = await resolveReadyAccount(accountId || action.accountId);
  const res = await sendMessage({ accountId: acc, chatId: action.chatId, text: action.text, operatorApproved: true });
  const ok = res?.status >= 200 && res?.status < 300 && res?.body?.sent !== false;
  return { ok, status: res?.status, message: ok ? "Отправлено ✅" : (res?.body?.message || "Не удалось отправить") };
}

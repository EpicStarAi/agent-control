// AI Operator Chat route — real OpenAI tool-calling agent for EPICGRAM.
// READ tools execute automatically. WRITE tools surface an approval proposal (never auto-execute).
// Model is configurable via OPENAI_MODEL env var; falls back to gpt-5.4-mini.
// SAFETY: never sends Telegram messages itself, never exposes secrets/tokens.

import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// ── model config from env ──────────────────────────────────────────────────────
const MODEL          = process.env["OPENAI_MODEL"]           ?? "gpt-5.4-mini";
const FALLBACK_MODEL = process.env["OPENAI_FALLBACK_MODEL"]  ?? "gpt-5.4-mini";
const MAX_TOKENS     = parseInt(process.env["OPENAI_MAX_OUTPUT_TOKENS"] ?? "2048", 10);
const API_BASE       = process.env["EPICGRAM_API_BASE_URL"]  ?? "http://127.0.0.1:8788";

// ── system prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the EPICGRAM AI Operator — an intelligent execution engine embedded inside the EPICGRAM Telegram management platform.

You have access to tools that let you read real Telegram workspace state AND propose write actions for user approval.
Use read tools proactively to answer questions accurately instead of guessing.

READ TOOLS (execute automatically):
- get_status, list_accounts, list_chats, get_chat_history, get_audit_log, search_chats, get_workspace_stats
- find_unanswered_messages — finds chats where the last message is incoming (you haven't replied)

WRITE TOOLS (always surface an approval card — never auto-execute):
- propose_send_message — draft a new message to a chat
- propose_forward_message — forward a message to another chat
- propose_set_reaction — add an emoji reaction to a message
- propose_pin_message — pin a message in a chat
- propose_edit_message — edit one of your own sent messages
- propose_delete_message — delete one or more messages

WORKFLOW for write actions:
1. Use a read tool first to confirm the chat/message exists (e.g. get_chat_history to find the message ID)
2. Call the propose_ tool with exact IDs — this surfaces a confirmation card to the user
3. Wait for user to confirm; execution happens client-side after confirmation
4. You NEVER execute writes yourself — only propose them

SAFETY RULES (never violate):
- NEVER expose secrets, API keys, session tokens, phone numbers, passwords, or TDLib database paths.
- Always get exact chatId and messageId from tools before proposing a write action.
- For find_unanswered_messages: report the count and chat names, then ask if user wants to act on them.

Navigation: when the user wants to open a section/chat, end your message with a single action tag:
<action>{"kind":"navigate","target":"dialogs"}</action>  (targets: dialogs, groups, channels, private, contacts, bots, accounts, settings, analytics)
<action>{"kind":"open_chat","query":"CHAT NAME"}</action>

Language: respond in Russian by default. Match user's language otherwise.
Be concise, direct, and practical.`;

// ── memory helpers ─────────────────────────────────────────────────────────────
async function fetchMemory(conversationId: string, limit = 10): Promise<string> {
  try {
    const r = await fetch(`${API_BASE}/ai/memory?conversationId=${encodeURIComponent(conversationId)}&limit=${limit}`);
    if (!r.ok) return "";
    const data = await r.json() as any;
    const entries: any[] = data.entries ?? [];
    if (entries.length === 0) return "";
    return "\n\n--- Память из прошлых сессий ---\n" + entries.map((e: any) => `${e.role}: ${String(e.content).slice(0, 300)}`).join("\n");
  } catch { return ""; }
}

async function saveMemoryTurn(conversationId: string, userText: string, assistantText: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/ai/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, role: "user", content: userText.slice(0, 500) }),
    });
    await fetch(`${API_BASE}/ai/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, role: "assistant", content: assistantText.slice(0, 500) }),
    });
  } catch {}
}

// ── tool definitions ───────────────────────────────────────────────────────────
const TOOLS: any[] = [
  {
    type: "function",
    function: {
      name: "get_status",
      description: "Get current Telegram runtime status: accounts, connection state, TDLib readiness",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_accounts",
      description: "List all Telegram account slots with their status and display names",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_chats",
      description: "List Telegram chats (dialogs, groups, channels, bots) for an account",
      parameters: {
        type: "object",
        properties: {
          accountId: { type: "string", description: "Account slot ID. Use active account if omitted." },
          limit: { type: "number", description: "Max chats to return (default 30, max 100)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_chat_history",
      description: "Read recent message history for a specific chat",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId: { type: "string", description: "Telegram chat/dialog ID" },
          accountId: { type: "string", description: "Account slot ID" },
          limit: { type: "number", description: "Number of messages (default 20, max 50)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_audit_log",
      description: "Read the EPICGRAM operator audit log (recent actions)",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Number of entries to return (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_chats",
      description: "Search chats by name, username or topic. Returns matching chats.",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query:     { type: "string", description: "Search string (name, username, keyword)" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
          limit:     { type: "number", description: "Max results (default 15)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_workspace_stats",
      description: "Get a quick summary: total chats, unread count, accounts by status",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "find_unanswered_messages",
      description: "Find chats where the last message is incoming (not sent by you) — i.e. conversations you haven't replied to yet.",
      parameters: {
        type: "object",
        properties: {
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
          limit:     { type: "number", description: "Max chats to scan (default 100)" },
        },
      },
    },
  },
  // WRITE tools — each surfaces an approval card, never auto-executes
  {
    type: "function",
    function: {
      name: "propose_send_message",
      description: "Propose sending a new message to a chat. ALWAYS requires user approval before execution.",
      parameters: {
        type: "object",
        required: ["chatId", "text"],
        properties: {
          chatId:    { type: "string", description: "Target chat ID" },
          chatTitle: { type: "string", description: "Chat display name for the approval card" },
          accountId: { type: "string", description: "Account to send from" },
          text:      { type: "string", description: "Message text to send" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_forward_message",
      description: "Propose forwarding a message to another chat. ALWAYS requires user approval.",
      parameters: {
        type: "object",
        required: ["fromChatId", "messageId", "toChatId"],
        properties: {
          fromChatId:  { type: "string", description: "Source chat ID containing the message" },
          messageId:   { type: "string", description: "ID of the message to forward" },
          toChatId:    { type: "string", description: "Target chat ID to forward to" },
          toChatTitle: { type: "string", description: "Target chat display name for the approval card" },
          accountId:   { type: "string", description: "Account slot ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_set_reaction",
      description: "Propose adding an emoji reaction to a message. ALWAYS requires user approval.",
      parameters: {
        type: "object",
        required: ["chatId", "messageId", "emoji"],
        properties: {
          chatId:    { type: "string", description: "Chat ID containing the message" },
          chatTitle: { type: "string", description: "Chat display name" },
          messageId: { type: "string", description: "Message ID to react to" },
          emoji:     { type: "string", description: "Emoji to react with (e.g. 👍 ❤️ 🔥 👏 😊 🎉 🤔 😢)" },
          accountId: { type: "string", description: "Account slot ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_pin_message",
      description: "Propose pinning a message in a chat. ALWAYS requires user approval.",
      parameters: {
        type: "object",
        required: ["chatId", "messageId"],
        properties: {
          chatId:              { type: "string", description: "Chat ID" },
          chatTitle:           { type: "string", description: "Chat display name" },
          messageId:           { type: "string", description: "Message ID to pin" },
          disableNotification: { type: "boolean", description: "Pin silently without notification (default false)" },
          accountId:           { type: "string", description: "Account slot ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_edit_message",
      description: "Propose editing one of your own previously sent messages. ALWAYS requires user approval.",
      parameters: {
        type: "object",
        required: ["chatId", "messageId", "text"],
        properties: {
          chatId:    { type: "string", description: "Chat ID containing the message" },
          chatTitle: { type: "string", description: "Chat display name" },
          messageId: { type: "string", description: "Message ID to edit (must be your own message)" },
          text:      { type: "string", description: "New message text" },
          accountId: { type: "string", description: "Account slot ID" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_delete_message",
      description: "Propose deleting one or more messages. ALWAYS requires user approval.",
      parameters: {
        type: "object",
        required: ["chatId", "messageIds"],
        properties: {
          chatId:     { type: "string", description: "Chat ID containing the messages" },
          chatTitle:  { type: "string", description: "Chat display name" },
          messageIds: { type: "array", items: { type: "string" }, description: "Array of message IDs to delete" },
          revoke:     { type: "boolean", description: "Delete for all participants (true) or only for yourself (false). Default true." },
          accountId:  { type: "string", description: "Account slot ID" },
        },
      },
    },
  },
];

// ── tool executor (READ tools only — no writes) ───────────────────────────────
async function executeTool(name: string, args: Record<string, any>): Promise<{ result: string; approvalCard?: object }> {
  const get = (path: string): Promise<any> =>
    fetch(`${API_BASE}${path}`, { headers: { "Accept": "application/json" } })
      .then(r => r.json() as Promise<any>).catch(() => ({ error: "fetch failed" }));

  switch (name) {
    case "get_status": {
      const data = await get("/telegram/status");
      const accs = (data.accounts ?? []).map((a: any) => `${a.slotId}: ${a.displayName || a.label || "—"} (${a.status})`);
      return { result: JSON.stringify({ runtime: data.runtime, tdlibConfigured: data.tdlibConfigured, accounts: accs, message: data.message }) };
    }

    case "list_accounts": {
      const data = await get("/telegram/accounts/list").catch(() => null)
        ?? await get("/telegram/status");
      const accs = (data.accounts ?? data.body?.accounts ?? []).map((a: any) => ({
        slotId: a.slotId, name: a.displayName || a.label, phone: a.phoneMasked, status: a.status, active: a.active,
      }));
      return { result: JSON.stringify({ accounts: accs, activeAccountId: data.activeAccountId }) };
    }

    case "list_chats": {
      const accountId = args.accountId || "";
      const data = await get(`/telegram/chats?accountId=${encodeURIComponent(accountId)}&limit=${Math.min(args.limit ?? 30, 100)}`);
      const chats = (data.chats ?? data.dialogs ?? []).slice(0, 50).map((c: any) => ({
        id: c.id, title: c.title, category: c.category, memberCount: c.memberCount,
        unreadCount: c.unreadCount, lastMessage: c.lastMessage?.content?.slice?.(0, 80),
      }));
      return { result: JSON.stringify({ accountId: accountId || "active", chatsCount: chats.length, chats }) };
    }

    case "get_chat_history": {
      const { chatId, accountId = "", limit = 20 } = args;
      const data = await get(`/telegram/messages?chatId=${encodeURIComponent(chatId)}&accountId=${encodeURIComponent(accountId)}&limit=${Math.min(limit, 50)}`);
      const msgs = (data.messages ?? []).map((m: any) => ({
        id: m.id, from: m.senderId || m.from, text: (m.content || m.text || "").slice(0, 200), date: m.date,
      }));
      return { result: JSON.stringify({ chatId, messagesCount: msgs.length, messages: msgs }) };
    }

    case "get_audit_log": {
      const data = await get(`/ai/audit?n=${args.limit ?? 10}`);
      return { result: JSON.stringify(data).slice(0, 2000) };
    }

    case "search_chats": {
      const accountId = args.accountId || "";
      const data = await get(`/telegram/chats?accountId=${encodeURIComponent(accountId)}&limit=100`);
      const all = (data.chats ?? data.dialogs ?? []) as any[];
      const q = String(args.query || "").toLowerCase().trim();
      const found = all.filter((c: any) =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.username || "").toLowerCase().includes(q)
      ).slice(0, args.limit ?? 15).map((c: any) => ({
        id: c.id, title: c.title, category: c.category, unreadCount: c.unreadCount ?? 0,
        memberCount: c.memberCount, username: c.username,
      }));
      return { result: JSON.stringify({ query: args.query, found: found.length, chats: found }) };
    }

    case "get_workspace_stats": {
      const statusData = await get("/telegram/status");
      const chatsData = await get("/telegram/chats?limit=200");
      const all = (chatsData.chats ?? chatsData.dialogs ?? []) as any[];
      const unread = all.reduce((s: number, c: any) => s + (c.unreadCount ?? 0), 0);
      const byCategory = all.reduce((acc: any, c: any) => {
        const cat = c.category || "private";
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});
      const accounts = (statusData.accounts ?? []).map((a: any) => ({
        slotId: a.slotId, name: a.displayName || a.label, status: a.status, active: a.active,
      }));
      return { result: JSON.stringify({ totalChats: all.length, unread, byCategory, accounts }) };
    }

    case "find_unanswered_messages": {
      const accountId = args.accountId || "";
      const scanLimit = Math.min(args.limit ?? 100, 200);
      const data = await get(`/telegram/chats?accountId=${encodeURIComponent(accountId)}&limit=${scanLimit}`);
      const all = (data.chats ?? data.dialogs ?? []) as any[];
      // Unanswered = last message is incoming (not outgoing) AND chat has content
      const unanswered = all.filter((c: any) => {
        const lm = c.lastMessage;
        if (!lm) return false;
        return lm.isOutgoing === false && lm.content;
      }).slice(0, 30).map((c: any) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        unreadCount: c.unreadCount ?? 0,
        lastMessagePreview: (c.lastMessage?.content || "").slice(0, 80),
        lastMessageDate: c.lastMessage?.date,
      }));
      return { result: JSON.stringify({ unansweredCount: unanswered.length, chats: unanswered }) };
    }

    case "propose_send_message": {
      const card = {
        type: "APPROVAL_REQUIRED",
        tool: "send_message",
        payload: { chatId: args.chatId, chatTitle: args.chatTitle, accountId: args.accountId, text: args.text },
        warning: "Сообщение НЕ будет отправлено автоматически. Требуется ручное подтверждение оператора.",
      };
      return { result: "Approval card создана. Отправка заблокирована до подтверждения оператора.", approvalCard: card };
    }

    case "propose_forward_message": {
      const card = {
        type: "APPROVAL_REQUIRED",
        tool: "forward_message",
        payload: { fromChatId: args.fromChatId, messageId: args.messageId, toChatId: args.toChatId, toChatTitle: args.toChatTitle, accountId: args.accountId },
        warning: "Сообщение будет переслано только после подтверждения.",
      };
      return { result: "Approval card создана для пересылки сообщения.", approvalCard: card };
    }

    case "propose_set_reaction": {
      const card = {
        type: "APPROVAL_REQUIRED",
        tool: "set_reaction",
        payload: { chatId: args.chatId, chatTitle: args.chatTitle, messageId: args.messageId, emoji: args.emoji, accountId: args.accountId },
        warning: "Реакция будет добавлена только после подтверждения.",
      };
      return { result: `Approval card создана для реакции ${args.emoji}.`, approvalCard: card };
    }

    case "propose_pin_message": {
      const card = {
        type: "APPROVAL_REQUIRED",
        tool: "pin_message",
        payload: { chatId: args.chatId, chatTitle: args.chatTitle, messageId: args.messageId, disableNotification: args.disableNotification ?? false, accountId: args.accountId },
        warning: "Сообщение будет закреплено только после подтверждения.",
      };
      return { result: "Approval card создана для закрепления сообщения.", approvalCard: card };
    }

    case "propose_edit_message": {
      const card = {
        type: "APPROVAL_REQUIRED",
        tool: "edit_message",
        payload: { chatId: args.chatId, chatTitle: args.chatTitle, messageId: args.messageId, text: args.text, accountId: args.accountId },
        warning: "Сообщение будет изменено только после подтверждения.",
      };
      return { result: "Approval card создана для редактирования сообщения.", approvalCard: card };
    }

    case "propose_delete_message": {
      const card = {
        type: "APPROVAL_REQUIRED",
        tool: "delete_message",
        payload: { chatId: args.chatId, chatTitle: args.chatTitle, messageIds: args.messageIds, revoke: args.revoke ?? true, accountId: args.accountId },
        warning: `${(args.messageIds ?? []).length} сообщение(ий) будет удалено только после подтверждения.`,
      };
      return { result: "Approval card создана для удаления сообщений.", approvalCard: card };
    }

    default:
      return { result: `Tool "${name}" not implemented.` };
  }
}

// ── main route ────────────────────────────────────────────────────────────────
router.post("/operator/chat", async (req, res) => {
  const { messages, context, settings, attachments, conversationId } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    context?: {
      tgReady?: boolean; accountCount?: number; activeAccount?: string;
      currentSection?: string; selectedChatId?: string; selectedChatTitle?: string;
    };
    settings?: { model?: string; temperature?: number; customSystemPrompt?: string };
    attachments?: { name: string; type: string; dataUrl: string }[];
    conversationId?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages required" });
    return;
  }

  // SSE setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sse = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Resolve model and temperature (client settings override env defaults)
    const resolvedModel = settings?.model?.trim() || MODEL;
    const resolvedTemp  = typeof settings?.temperature === "number"
      ? Math.min(Math.max(settings.temperature, 0), 2)
      : 0.7;

    // Fetch cross-session memory (if conversationId provided)
    const convId = (conversationId || "").trim();
    const memoryBlock = convId ? await fetchMemory(convId, 12) : "";

    // Build context addendum
    const ctxLines: string[] = [];
    if (context) {
      ctxLines.push("\n--- Current workspace state ---");
      ctxLines.push(`Telegram: ${context.tgReady === true ? "✅ готов" : context.tgReady === false ? "❌ не готов" : "⏳ неизвестно"}`);
      if (context.accountCount !== undefined) ctxLines.push(`Аккаунтов: ${context.accountCount}`);
      if (context.activeAccount)   ctxLines.push(`Активный аккаунт: ${context.activeAccount}`);
      if (context.currentSection)  ctxLines.push(`Раздел: ${context.currentSection}`);
      if (context.selectedChatId)  ctxLines.push(`Открытый чат: ${context.selectedChatTitle || context.selectedChatId}`);
    }

    // Compose system prompt (custom prefix + base + memory)
    const systemContent = settings?.customSystemPrompt
      ? `${settings.customSystemPrompt.trim()}\n\n${SYSTEM_PROMPT}${ctxLines.join("\n")}${memoryBlock}`
      : SYSTEM_PROMPT + ctxLines.join("\n") + memoryBlock;

    // Build message list — last user message may carry image attachments (vision)
    const filteredHistory = messages.slice(-20).filter(m => m.role === "user" || m.role === "assistant");
    const imageAtts = (attachments ?? []).filter(a => a.type.startsWith("image/")).slice(0, 4);

    const historyMsgs: any[] = filteredHistory.map((m, idx) => {
      // Inject images into the last user message if present
      if (imageAtts.length > 0 && m.role === "user" && idx === filteredHistory.length - 1) {
        return {
          role: "user",
          content: [
            { type: "text", text: m.content },
            ...imageAtts.map(a => ({ type: "image_url", image_url: { url: a.dataUrl, detail: "auto" } })),
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    // Add non-image attachment info to system context
    const otherAtts = (attachments ?? []).filter(a => !a.type.startsWith("image/"));
    if (otherAtts.length > 0) {
      ctxLines.push(`\nПрикреплённые файлы: ${otherAtts.map(a => a.name).join(", ")}`);
    }

    const chatMessages: any[] = [
      { role: "system", content: systemContent },
      ...historyMsgs,
    ];

    let approvalCards: object[] = [];

    // ── agentic tool-call loop (max 4 iterations) ──────────────────────────────
    for (let iter = 0; iter < 4; iter++) {
      let useModel = resolvedModel;
      let response: any;

      try {
        response = await (openai as any).chat.completions.create({
          model: useModel,
          max_completion_tokens: MAX_TOKENS,
          temperature: resolvedTemp,
          messages: chatMessages,
          tools: TOOLS,
          tool_choice: "auto",
          stream: false,
        });
      } catch (err: any) {
        // Model not found → try fallback
        if (err?.status === 404 && FALLBACK_MODEL && FALLBACK_MODEL !== MODEL) {
          useModel = FALLBACK_MODEL;
          response = await (openai as any).chat.completions.create({
            model: useModel,
            max_completion_tokens: MAX_TOKENS,
            temperature: resolvedTemp,
            messages: chatMessages,
            tools: TOOLS,
            tool_choice: "auto",
            stream: false,
          });
        } else throw err;
      }

      const choice = response.choices[0];
      const msg = choice.message;

      // No tool calls → stream final text
      if (!msg.tool_calls || msg.tool_calls.length === 0) {
        const text = msg.content ?? "";

        // Stream character by character in chunks
        const CHUNK = 8;
        for (let i = 0; i < text.length; i += CHUNK) {
          sse({ content: text.slice(i, i + CHUNK) });
          await new Promise(r => setTimeout(r, 1));
        }

        // Emit approval cards if any write tools were called
        if (approvalCards.length > 0) {
          sse({ approvalCards });
        }

        sse({ done: true, model: useModel });
        res.end();

        // Persist this turn to cross-session memory (fire-and-forget)
        if (convId && text.trim()) {
          const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
          if (lastUserMsg) saveMemoryTurn(convId, lastUserMsg.content, text).catch(() => {});
        }

        return;
      }

      // Has tool calls → execute them
      chatMessages.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });

      for (const tc of msg.tool_calls) {
        const toolName = tc.function.name;
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}

        // Signal to frontend that a tool is being called
        sse({ toolCall: { name: toolName, args } });

        const { result, approvalCard } = await executeTool(toolName, args);
        if (approvalCard) approvalCards.push(approvalCard);

        chatMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
      // Continue loop → model will process tool results
    }

    // Fallback if loop exhausted without a final text response
    sse({ content: "⚠️ Цикл выполнения завершён без итогового ответа. Попробуй снова." });
    sse({ done: true });
    res.end();

  } catch (err: any) {
    const msg = err?.message ?? "Internal error";
    sse({ error: msg, done: true });
    res.end();
  }
});

export default router;

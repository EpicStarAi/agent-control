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
const SYSTEM_PROMPT = `You are the EPICGRAM AI Operator — an intelligent assistant embedded inside the EPICGRAM Telegram management platform.

You have access to tools that let you read real Telegram workspace state: accounts, chats, messages, status.
Use them proactively to answer questions accurately instead of guessing.

STRICT SAFETY RULES (never violate):
- You are ADVISORY and READ-ONLY by default.
- WRITE operations (send_message, create_channel, etc.) require explicit user approval — propose them as structured actions, never execute them yourself.
- NEVER expose secrets, API keys, session tokens, phone numbers, passwords, or TDLib database paths.
- All sends require MANUAL approval via the approval gate. Remind user of this clearly.

Navigation: when the user wants to open a section/chat, end your message with a single action tag:
<action>{"kind":"navigate","target":"dialogs"}</action>  (targets: dialogs, groups, channels, private, contacts, bots, accounts, settings, analytics)
<action>{"kind":"open_chat","query":"CHAT NAME"}</action>

Language: respond in Russian by default. Match user's language otherwise.
Be concise, direct, and practical.`;

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
  // WRITE tool — surfaces an approval card, never auto-executes
  {
    type: "function",
    function: {
      name: "propose_send_message",
      description: "Propose sending a message to a chat. This ALWAYS requires user approval before execution.",
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
      const data = await get(`/ai/audit?limit=${args.limit ?? 10}`);
      return { result: JSON.stringify(data).slice(0, 2000) };
    }

    case "propose_send_message": {
      // WRITE tool — return approval card, never execute
      const card = {
        type: "APPROVAL_REQUIRED",
        tool: "send_message",
        payload: { chatId: args.chatId, chatTitle: args.chatTitle, accountId: args.accountId, text: args.text },
        warning: "Сообщение НЕ будет отправлено автоматически. Требуется ручное подтверждение оператора.",
      };
      return { result: "Approval card создана. Отправка заблокирована до подтверждения оператора.", approvalCard: card };
    }

    default:
      return { result: `Tool "${name}" not implemented.` };
  }
}

// ── main route ────────────────────────────────────────────────────────────────
router.post("/operator/chat", async (req, res) => {
  const { messages, context } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    context?: {
      tgReady?: boolean; accountCount?: number; activeAccount?: string;
      currentSection?: string; selectedChatId?: string; selectedChatTitle?: string;
    };
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

    const chatMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT + ctxLines.join("\n") },
      ...messages.slice(-20).filter(m => m.role === "user" || m.role === "assistant"),
    ];

    let approvalCards: object[] = [];

    // ── agentic tool-call loop (max 4 iterations) ──────────────────────────────
    for (let iter = 0; iter < 4; iter++) {
      let useModel = MODEL;
      let response: any;

      try {
        response = await (openai as any).chat.completions.create({
          model: useModel,
          max_completion_tokens: MAX_TOKENS,
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

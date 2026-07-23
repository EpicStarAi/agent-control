// AI Operator Chat route — real OpenAI tool-calling agent for EPICGRAM.
// READ tools execute automatically. WRITE tools surface an approval proposal (never auto-execute).
// Model is configurable via OPENAI_MODEL env var; falls back to gpt-5.4-mini.
// SAFETY: never sends Telegram messages itself, never exposes secrets/tokens.

import { Router } from "express";
import { openai, generateImageBuffer } from "@workspace/integrations-openai-ai-server";

// pdf-parse v1 runs a self-test on require() that reads a local fixture file.
// Import it lazily (inside the handler) to avoid crashing the server at startup.
type PdfParseResult = { text: string; numpages: number };
async function parsePdf(buf: Buffer): Promise<PdfParseResult> {
  const mod = await import("pdf-parse");
  const parse = (mod as any).default ?? mod;
  return parse(buf) as Promise<PdfParseResult>;
}

const router = Router();

// ── model config from env ──────────────────────────────────────────────────────
const MODEL          = process.env["OPENAI_MODEL"]           ?? "gpt-5.4-mini";
const FALLBACK_MODEL = process.env["OPENAI_FALLBACK_MODEL"]  ?? "gpt-5.4-mini";
const MAX_TOKENS     = parseInt(process.env["OPENAI_MAX_OUTPUT_TOKENS"] ?? "2048", 10);
const API_BASE       = process.env["EPICGRAM_API_BASE_URL"]  ?? "http://127.0.0.1:8788";

// ── system prompt ──────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the EPICGRAM AI Operator — an intelligent execution engine embedded inside the EPICGRAM Telegram management platform. You are not just an assistant; you are an active operator that reads, analyses, and acts on Telegram data.

═══ EXECUTION MODEL ════════════════════════════════════════════
Each operation follows this cycle:
  Planned → Awaiting Confirmation → Executing → Completed / Failed

For READ operations: execute immediately, report results.
For WRITE operations: plan → propose (show confirmation card) → wait for user → report outcome.
Always start complex tasks by reading real data first. Never guess or invent data.

═══ READ TOOLS (auto-execute) ══════════════════════════════════
• get_status            — Telegram runtime, TDLib readiness
• list_accounts         — all account slots and their status
• list_chats            — dialogs, groups, channels, bots
• get_chat_history      — full message history for a chat
• get_audit_log         — recent operator actions
• search_chats          — find chats by name or keyword
• get_workspace_stats   — unread count, chat categories, account summary
• find_unanswered_messages — chats where the last message is incoming (you haven't replied)
• analyse_chat          — get structured analysis: summary, key decisions, open questions
• extract_tasks         — extract action items with owners and implied deadlines from a chat
• get_daily_summary     — full daily digest: unread, top chats, unanswered, recent actions

═══ MEDIA TOOLS (auto-execute, return results inline) ══════════════
• generate_image     — generate an image with DALL-E/gpt-image-1; returns the image inline in chat

═══ WRITE TOOLS (ALWAYS require approval card — NEVER auto-execute) ═══
• propose_send_message     — draft a new message
• propose_forward_message  — forward a message to another chat
• propose_set_reaction     — add emoji reaction to a message
• propose_pin_message      — pin a message
• propose_edit_message     — edit your own message
• propose_delete_message   — delete one or more messages
• propose_create_chat      — create a group, supergroup, or channel

═══ BOT CREATION WIZARD ═════════════════════════════════════════
When user asks to create/setup a bot ("создай бота", "настрой бота", "setup bot"):
  1. Call start_bot_setup with the bot's purpose
  2. Guide user through BotFather steps (open @BotFather → /newbot → name → username → copy token)
  3. When user pastes the token, call register_bot_token
  4. Confirm registration and suggest next setup steps (commands, description)

═══ FILE & IMAGE PATTERNS ══════════════════════════════════════
When user uploads an IMAGE:
  — Vision is enabled automatically; describe it, extract text (OCR), or analyse content.
  — Offer follow-up quick actions: describe, create similar, describe objects/text found.

When user uploads a PDF:
  — The document text is injected automatically as a <document> block.
  — Summarise it, extract key points, or answer questions about its contents.

When user asks to generate / "сгенерируй" / "нарисуй" an image:
  1. Call generate_image with a detailed English prompt (images generate better in English).
  2. The image appears inline in the chat — confirm what was generated.
  3. Offer to regenerate with variations if requested.

═══ ANALYSIS PATTERNS ══════════════════════════════════════════
When asked to "перескажи чат" / "summarise":
  1. Call get_chat_history (or analyse_chat) with appropriate chatId
  2. Produce Russian summary: key topics, decisions, open questions

When asked "извлеки задачи" / "extract tasks":
  1. Call extract_tasks with the chatId
  2. Present numbered list: [who] [what] [by when]

When asked "кому я не ответил" / "who did I not reply to":
  1. Call find_unanswered_messages
  2. List each chat with last message preview
  3. Offer to draft a reply for any of them

When asked "ежедневный отчёт" / "daily report":
  1. Call get_daily_summary
  2. Structure: unread total → top urgent chats → unanswered → next steps

═══ RULES MEMORY ════════════════════════════════════════════════
When the user says something like "правило: …":
  — Acknowledge the rule and confirm it is saved for future use.
  — Apply any matching saved rules when drafting messages or suggesting responses.
  — Rules examples: "Анне отвечай официально", "важные чаты открывать сразу", "всегда предлагать короткий ответ"

═══ WRITE WORKFLOW ═════════════════════════════════════════════
1. Read real data to get exact IDs (chatId, messageId).
2. Call the appropriate propose_ tool — this surfaces a clickable confirmation card in the UI.
3. Execution happens client-side after user clicks the button on the card.
4. You NEVER call Telegram APIs directly.

⚠️ CRITICAL UI RULE — NEVER ask the user to type ANY word, phrase, or "confirmation" text.
The propose_ tools automatically surface clickable Allow/Deny buttons in the UI.
DO NOT say "напишите «Подтверждение»", "type CONFIRM", "нажмите «Подтверждение»", or any
equivalent. This is strictly forbidden. If a write operation is needed, CALL the propose_ tool
immediately — the system handles confirmation via UI buttons, not text input.

═══ SAFETY ══════════════════════════════════════════════════════
- NEVER expose secrets, session tokens, phone numbers, passwords, or TDLib paths.
- Only use IDs obtained from tools — never invent IDs.

Navigation actions (use at the end of response when user wants to navigate):
<action>{"kind":"navigate","target":"dialogs"}</action>  — targets: dialogs, groups, channels, private, contacts, bots, accounts, settings, analytics
<action>{"kind":"open_chat","query":"CHAT NAME"}</action>

Language: respond in Russian by default. Match user's language otherwise.
Be concise, direct, and practical. Avoid unnecessary disclaimers.`;

// ── memory helpers ─────────────────────────────────────────────────────────────
const RULES_CONV_ID = "ai_operator_rules";

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

async function fetchRulesMemory(): Promise<string> {
  try {
    const r = await fetch(`${API_BASE}/ai/memory?conversationId=${encodeURIComponent(RULES_CONV_ID)}&limit=30`);
    if (!r.ok) return "";
    const data = await r.json() as any;
    const rules: any[] = (data.entries ?? []).filter((e: any) => e.role === "rule");
    if (rules.length === 0) return "";
    return "\n\n--- Правила пользователя (применять всегда) ---\n" + rules.map((e: any) => `• ${String(e.content).slice(0, 200)}`).join("\n");
  } catch { return ""; }
}

async function saveRule(ruleText: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/ai/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: RULES_CONV_ID, role: "rule", content: ruleText.slice(0, 300) }),
    });
  } catch {}
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
  {
    type: "function",
    function: {
      name: "analyse_chat",
      description: "Fetch and structure a chat's recent messages for analysis. Returns messages with metadata so you can summarise key topics, decisions, and open questions. Use this when asked to 'перескажи чат', 'summarise', 'о чём переписывались'.",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId:    { type: "string", description: "Telegram chat ID to analyse" },
          chatTitle: { type: "string", description: "Chat display name (for context)" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
          limit:     { type: "number", description: "Number of recent messages to analyse (default 50, max 100)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "extract_tasks",
      description: "Fetch messages from a chat and structure them for task extraction. Returns messages so you can extract action items with owners and implied deadlines. Use when asked to 'извлеки задачи', 'что нужно сделать', 'список задач из переписки'.",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId:    { type: "string", description: "Telegram chat ID" },
          chatTitle: { type: "string", description: "Chat display name" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
          limit:     { type: "number", description: "Number of recent messages (default 50, max 100)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_summary",
      description: "Collect a full daily digest: workspace stats, top unread chats, unanswered conversations, and recent audit log. Use when asked for 'ежедневный отчёт', 'дайджест', 'что происходит', 'сводка за день'.",
      parameters: {
        type: "object",
        properties: {
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
  // MEDIA tools — auto-execute, return result inline
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an image using DALL-E / gpt-image-1. Use when user asks to 'сгенерируй', 'нарисуй', 'создай изображение', 'generate image', 'make a picture'. Always write the prompt in English for best results.",
      parameters: {
        type: "object",
        required: ["prompt"],
        properties: {
          prompt: { type: "string", description: "Detailed English image generation prompt" },
          size: { type: "string", enum: ["1024x1024", "512x512", "256x256"], description: "Image size (default 1024x1024)" },
        },
      },
    },
  },
  // CREATION tools — surface approval cards for creating chats/bots
  {
    type: "function",
    function: {
      name: "propose_create_chat",
      description: "Propose creating a Telegram group, supergroup, or channel. ALWAYS requires user approval before creation.",
      parameters: {
        type: "object",
        required: ["type", "title"],
        properties: {
          type:        { type: "string", enum: ["group", "supergroup", "channel"], description: "Chat type: group (basic, up to 200 members), supergroup (large, public/private), channel (broadcast)" },
          title:       { type: "string", description: "Display name of the new chat/channel" },
          username:    { type: "string", description: "Public @username (without @). Only for public supergroups and channels." },
          description: { type: "string", description: "Short description shown in the chat info" },
          accountId:   { type: "string", description: "Account slot ID to create from" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_bot_setup",
      description: "Start the guided bot creation wizard. Returns step-by-step instructions for creating a new Telegram bot via BotFather and pasting the token here. Use when user asks to 'создай бота', 'настрой бота', 'setup bot', 'new bot'.",
      parameters: {
        type: "object",
        properties: {
          purpose: { type: "string", description: "What the bot is for (e.g. 'заявки', 'уведомления', 'поддержка'). Used to suggest a name and commands." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "register_bot_token",
      description: "Validate a Bot API token the user just pasted, save it to the EPICGRAM bot registry, and configure basic commands/description. Use this after start_bot_setup when the user provides their token.",
      parameters: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string", description: "The Bot API token from BotFather (e.g. 123456:ABC-DEF…)" },
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
  // ── Contacts ──────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "list_contacts",
      description: "List all Telegram contacts for an account",
      parameters: {
        type: "object",
        properties: {
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_contacts",
      description: "Search Telegram contacts by name or username",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query:     { type: "string", description: "Search string" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
          limit:     { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_user_profile",
      description: "Get full profile of a Telegram user: bio, username, common chats count",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId:    { type: "string", description: "Telegram user ID" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "block_user",
      description: "Block or unblock a Telegram user. READ action — returns current block state after toggle.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId:    { type: "string", description: "Telegram user ID to block/unblock" },
          blocked:   { type: "boolean", description: "true to block, false to unblock (default true)" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
  // ── Chat management ────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "archive_chat",
      description: "Move a chat to/from the archive",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId:    { type: "string", description: "Chat ID" },
          archived:  { type: "boolean", description: "true to archive, false to unarchive (default true)" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mute_chat",
      description: "Mute or unmute notifications for a chat",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId:    { type: "string", description: "Chat ID" },
          muted:     { type: "boolean", description: "true to mute, false to unmute (default true)" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_chat_read",
      description: "Mark all messages in a chat as read",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId:    { type: "string", description: "Chat ID" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pin_chat",
      description: "Pin or unpin a chat in the chat list",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId:    { type: "string", description: "Chat ID" },
          pinned:    { type: "boolean", description: "true to pin, false to unpin (default true)" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
  // ── Chat members ────────────────────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "get_chat_members",
      description: "List members of a group or channel. filter: all | admins | banned | bots",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId:    { type: "string", description: "Chat/group/channel ID" },
          filter:    { type: "string", description: "all | admins | banned | bots (default all)" },
          limit:     { type: "number", description: "Max members to return (default 50, max 200)" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_invite_link",
      description: "Generate or retrieve an invite link for a group or channel",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId:    { type: "string", description: "Chat/group/channel ID" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propose_member_action",
      description: "Propose a moderation action on a group/channel member. ALWAYS requires user approval. action: ban | kick | admin | member",
      parameters: {
        type: "object",
        required: ["chatId", "userId", "action"],
        properties: {
          chatId:    { type: "string", description: "Group or channel ID" },
          chatTitle: { type: "string", description: "Chat display name for confirmation" },
          userId:    { type: "string", description: "Target user ID" },
          action:    { type: "string", description: "ban | kick | admin | member" },
          accountId: { type: "string", description: "Account slot ID. Use active if omitted." },
        },
      },
    },
  },
];

// ── tool executor ─────────────────────────────────────────────────────────────
interface ToolResult { result: string; approvalCard?: object; imageResult?: { dataUrl: string; prompt: string } }
async function executeTool(name: string, args: Record<string, any>): Promise<ToolResult> {
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

    case "analyse_chat": {
      const { chatId, chatTitle = "", accountId = "", limit = 50 } = args;
      const data = await get(`/telegram/messages?chatId=${encodeURIComponent(chatId)}&accountId=${encodeURIComponent(accountId)}&limit=${Math.min(limit, 100)}`);
      const msgs = (data.messages ?? []).map((m: any) => ({
        id: m.id,
        from: m.senderId || m.from || "unknown",
        isOutgoing: m.isOutgoing,
        text: (m.content || m.text || "").slice(0, 300),
        date: m.date,
      }));
      return { result: JSON.stringify({
        chatId,
        chatTitle,
        messageCount: msgs.length,
        messages: msgs,
        _instruction: "Analyse this conversation in Russian. Structure your response as: 1) Краткое содержание (2-3 sentences), 2) Ключевые темы (bullet list), 3) Принятые решения (if any), 4) Открытые вопросы / что осталось нерешённым.",
      }) };
    }

    case "extract_tasks": {
      const { chatId, chatTitle = "", accountId = "", limit = 50 } = args;
      const data = await get(`/telegram/messages?chatId=${encodeURIComponent(chatId)}&accountId=${encodeURIComponent(accountId)}&limit=${Math.min(limit, 100)}`);
      const msgs = (data.messages ?? []).map((m: any) => ({
        from: m.senderId || m.from || "unknown",
        isOutgoing: m.isOutgoing,
        text: (m.content || m.text || "").slice(0, 300),
        date: m.date,
      }));
      return { result: JSON.stringify({
        chatId,
        chatTitle,
        messageCount: msgs.length,
        messages: msgs,
        _instruction: "Extract all tasks and action items from this conversation in Russian. For each task: numbered list with format: [Кто] — [Что нужно сделать] — [Срок, если упомянут]. If no clear tasks found, say so briefly.",
      }) };
    }

    case "get_daily_summary": {
      const accountId = args.accountId || "";
      const [statusData, chatsData, auditData] = await Promise.all([
        get("/telegram/status"),
        get(`/telegram/chats?accountId=${encodeURIComponent(accountId)}&limit=200`),
        get("/ai/audit?n=10"),
      ]);
      const all = (chatsData.chats ?? chatsData.dialogs ?? []) as any[];
      const totalUnread = all.reduce((s: number, c: any) => s + (c.unreadCount ?? 0), 0);
      const topUnread = all
        .filter((c: any) => (c.unreadCount ?? 0) > 0)
        .sort((a: any, b: any) => (b.unreadCount ?? 0) - (a.unreadCount ?? 0))
        .slice(0, 8)
        .map((c: any) => ({ title: c.title, unread: c.unreadCount, lastMsg: (c.lastMessage?.content || "").slice(0, 60) }));
      const unanswered = all.filter((c: any) => {
        const lm = c.lastMessage;
        return lm && lm.isOutgoing === false && lm.content;
      }).slice(0, 10).map((c: any) => ({
        id: c.id, title: c.title, category: c.category,
        lastMsg: (c.lastMessage?.content || "").slice(0, 60),
      }));
      const accounts = (statusData.accounts ?? []).map((a: any) => ({
        name: a.displayName || a.label, status: a.status, active: a.active,
      }));
      return { result: JSON.stringify({
        date: new Date().toISOString().split("T")[0],
        totalChats: all.length,
        totalUnread,
        accounts,
        topUnreadChats: topUnread,
        unansweredCount: unanswered.length,
        unansweredChats: unanswered,
        recentAuditLog: auditData,
        _instruction: "Create a concise daily summary in Russian. Structure: 📊 Статистика (total chats/unread) → 🔥 Требуют внимания (top unread chats) → 📬 Ожидают ответа (unanswered) → ✅ Предлагаемые следующие шаги (2-3 concrete actions).",
      }) };
    }

    case "generate_image": {
      const { prompt, size = "1024x1024" } = args;
      if (!prompt?.trim()) return { result: "Error: prompt is required for image generation." };
      const validSize = ["1024x1024", "512x512", "256x256"].includes(size) ? size : "1024x1024";
      try {
        const buf = await generateImageBuffer(prompt.trim(), validSize as "1024x1024" | "512x512" | "256x256");
        const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
        return {
          result: `Изображение успешно сгенерировано по запросу: "${prompt.trim().slice(0, 80)}". Оно отображается в чате.`,
          imageResult: { dataUrl, prompt: prompt.trim() },
        };
      } catch (err: any) {
        return { result: `Ошибка генерации изображения: ${err?.message ?? "unknown error"}` };
      }
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

    case "propose_create_chat": {
      const typeLabel = args.type === "channel" ? "Канал" : args.type === "supergroup" ? "Супергруппа" : "Группа";
      const card = {
        type: "APPROVAL_REQUIRED",
        tool: "create_chat",
        payload: { type: args.type, title: args.title, username: args.username ?? null, description: args.description ?? null, accountId: args.accountId ?? null },
        warning: `${typeLabel} "${args.title}" будет создан в Telegram. Требуется подтверждение.`,
      };
      return { result: `Approval card создана для создания ${typeLabel.toLowerCase()} "${args.title}".`, approvalCard: card };
    }

    case "start_bot_setup": {
      const purpose = args.purpose ? ` для ${args.purpose}` : "";
      return {
        result: JSON.stringify({
          wizard: "bot_setup",
          purpose: args.purpose ?? null,
          instructions: `Для создания бота${purpose} через BotFather выполни следующие шаги:\n\n1. Открой Telegram и найди @BotFather\n2. Напиши /newbot\n3. Введи имя бота (отображаемое имя, например «EPIC Support Bot»)\n4. Введи username бота (должен заканчиваться на «bot», например «epic_support_bot»)\n5. BotFather выдаст токен вида: 123456789:AABBcc...\n6. Скопируй токен и вставь его в этот чат\n\nКогда вставишь токен — я автоматически его проверю, зарегистрирую и настрою бота.`,
          nextAction: "Жду токен от BotFather. Вставь его сюда.",
        }),
      };
    }

    case "register_bot_token": {
      const token = String(args.token ?? "").trim();
      if (!token) return { result: "Ошибка: токен не указан." };
      try {
        const r = await fetch(`${API_BASE}/telegram/register-bot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await r.json() as any;
        if (!data.ok) return { result: `Ошибка регистрации бота: ${data.message ?? "неизвестная ошибка"}` };
        const bot = data.bot;
        return {
          result: JSON.stringify({
            registered: true,
            bot: { id: bot.id, username: `@${bot.username}`, firstName: bot.firstName, canJoinGroups: bot.canJoinGroups },
            message: `Бот @${bot.username} успешно зарегистрирован в EPICGRAM. Токен сохранён. Теперь можно настроить команды через Bot API.`,
          }),
        };
      } catch (err: any) {
        return { result: `Ошибка при регистрации бота: ${err?.message ?? "network error"}` };
      }
    }

    // ── Contacts ─────────────────────────────────────────────────────────────
    case "list_contacts": {
      const accountId = args.accountId || "";
      const data = await get(`/telegram/contacts?accountId=${encodeURIComponent(accountId)}`);
      const contacts = (data.contacts ?? []).slice(0, 100).map((c: any) => ({
        id: c.id, name: c.displayName, username: c.username, phone: c.phoneMasked, isBot: c.isBot,
      }));
      return { result: JSON.stringify({ total: data.total ?? contacts.length, contacts }) };
    }

    case "search_contacts": {
      const { query = "", accountId = "", limit = 20 } = args;
      const data = await get(`/telegram/contacts/search?accountId=${encodeURIComponent(accountId)}&q=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`);
      const contacts = (data.contacts ?? []).map((c: any) => ({
        id: c.id, name: c.displayName, username: c.username, phone: c.phoneMasked,
      }));
      return { result: JSON.stringify({ query, found: contacts.length, contacts }) };
    }

    case "get_user_profile": {
      const { userId, accountId = "" } = args;
      if (!userId) return { result: "userId is required" };
      const data = await get(`/telegram/contacts/profile?accountId=${encodeURIComponent(accountId)}&userId=${encodeURIComponent(userId)}`);
      return { result: JSON.stringify(data) };
    }

    case "block_user": {
      const { userId, blocked = true, accountId = "" } = args;
      if (!userId) return { result: "userId is required" };
      const r = await fetch(`${API_BASE}/telegram/contacts/block`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, blocked, accountId }),
      });
      const data = await r.json() as any;
      return { result: JSON.stringify(data) };
    }

    // ── Chat management ────────────────────────────────────────────────────────
    case "archive_chat": {
      const { chatId, archived = true, accountId = "" } = args;
      if (!chatId) return { result: "chatId is required" };
      const r = await fetch(`${API_BASE}/telegram/chats/archive`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, archived, accountId }),
      });
      const data = await r.json() as any;
      return { result: JSON.stringify(data) };
    }

    case "mute_chat": {
      const { chatId, muted = true, accountId = "" } = args;
      if (!chatId) return { result: "chatId is required" };
      const r = await fetch(`${API_BASE}/telegram/chats/mute`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, muted, accountId }),
      });
      const data = await r.json() as any;
      return { result: JSON.stringify(data) };
    }

    case "mark_chat_read": {
      const { chatId, accountId = "" } = args;
      if (!chatId) return { result: "chatId is required" };
      const r = await fetch(`${API_BASE}/telegram/chats/read`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, accountId }),
      });
      const data = await r.json() as any;
      return { result: JSON.stringify(data) };
    }

    case "pin_chat": {
      const { chatId, pinned = true, accountId = "" } = args;
      if (!chatId) return { result: "chatId is required" };
      const r = await fetch(`${API_BASE}/telegram/chats/pin`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, pinned, accountId }),
      });
      const data = await r.json() as any;
      return { result: JSON.stringify(data) };
    }

    // ── Chat members ───────────────────────────────────────────────────────────
    case "get_chat_members": {
      const { chatId, filter = "all", limit = 50, accountId = "" } = args;
      if (!chatId) return { result: "chatId is required" };
      const data = await get(`/telegram/chat/members?chatId=${encodeURIComponent(chatId)}&filter=${filter}&limit=${Math.min(limit, 200)}&accountId=${encodeURIComponent(accountId)}`);
      const members = (data.members ?? []).slice(0, 50).map((m: any) => ({
        userId: m.member_id?.user_id ?? m.userId,
        status: m.status?._ ?? m.status,
      }));
      return { result: JSON.stringify({ total: data.total ?? members.length, filter, members }) };
    }

    case "get_invite_link": {
      const { chatId, accountId = "" } = args;
      if (!chatId) return { result: "chatId is required" };
      const data = await get(`/telegram/chat/invite-link?chatId=${encodeURIComponent(chatId)}&accountId=${encodeURIComponent(accountId)}`);
      return { result: JSON.stringify(data) };
    }

    case "propose_member_action": {
      const { chatId, chatTitle, userId, action, accountId } = args;
      if (!chatId || !userId || !action) return { result: "chatId, userId, action are required" };
      const validActions = ["ban", "kick", "admin", "member"];
      if (!validActions.includes(action)) return { result: `action must be one of: ${validActions.join(", ")}` };
      const card = {
        kind: "member_action",
        label: action === "ban" ? `Забанить пользователя в ${chatTitle ?? chatId}` :
               action === "kick" ? `Кикнуть пользователя из ${chatTitle ?? chatId}` :
               action === "admin" ? `Сделать администратором в ${chatTitle ?? chatId}` :
               `Вернуть права участника в ${chatTitle ?? chatId}`,
        description: `Действие: ${action} | Пользователь: ${userId} | Чат: ${chatTitle ?? chatId}`,
        payload: { chatId, chatTitle, userId, action, accountId },
        confirmUrl: "/telegram/chat/member-action",
      };
      return { result: `Запрос подтверждения: ${action} пользователя ${userId} в ${chatTitle ?? chatId}.`, approvalCard: card };
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
      tgReady?: boolean; accountCount?: number; activeAccount?: string; activeAccountId?: string;
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

    // Fetch cross-session memory + user rules in parallel
    const convId = (conversationId || "").trim();
    const [memoryBlock, rulesBlock] = await Promise.all([
      convId ? fetchMemory(convId, 12) : Promise.resolve(""),
      fetchRulesMemory(),
    ]);

    // Detect and save user rules ("правило: ...")
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      const ruleMatch = lastUserMsg.content.match(/^правило\s*:\s*(.+)/isu);
      if (ruleMatch) {
        saveRule(ruleMatch[1].trim()).catch(() => {});
      }
    }

    // Build context addendum
    const ctxLines: string[] = [];
    if (context) {
      ctxLines.push("\n--- Current workspace state ---");
      ctxLines.push(`Telegram: ${context.tgReady === true ? "✅ готов" : context.tgReady === false ? "❌ не готов" : "⏳ неизвестно"}`);
      if (context.accountCount !== undefined) ctxLines.push(`Аккаунтов: ${context.accountCount}`);
      if (context.activeAccount)   ctxLines.push(`Активный аккаунт: ${context.activeAccount}`);
      if (context.activeAccountId) ctxLines.push(`accountId для инструментов (используй по умолчанию во всех tool calls): ${context.activeAccountId}`);
      if (context.currentSection)  ctxLines.push(`Раздел: ${context.currentSection}`);
      if (context.selectedChatId)  ctxLines.push(`Открытый чат: ${context.selectedChatTitle || context.selectedChatId}`);
    }

    // Compose system prompt (custom prefix + base + rules + memory)
    const systemContent = settings?.customSystemPrompt
      ? `${settings.customSystemPrompt.trim()}\n\n${SYSTEM_PROMPT}${ctxLines.join("\n")}${rulesBlock}${memoryBlock}`
      : SYSTEM_PROMPT + ctxLines.join("\n") + rulesBlock + memoryBlock;

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

    // Extract text from PDF attachments and inject as <document> blocks
    const pdfAtts = (attachments ?? []).filter(a => a.type === "application/pdf" || a.name?.toLowerCase().endsWith(".pdf"));
    let pdfDocBlocks = "";
    for (const pdf of pdfAtts.slice(0, 3)) {
      try {
        const b64 = pdf.dataUrl.split(",")[1] ?? pdf.dataUrl;
        const buf = Buffer.from(b64, "base64");
        const parsed = await parsePdf(buf);
        const text = (parsed.text ?? "").trim().slice(0, 8000);
        if (text) {
          pdfDocBlocks += `\n<document name="${pdf.name}">\n${text}\n</document>\n`;
        }
      } catch { /* skip unreadable PDF */ }
    }

    // Add non-image/non-pdf attachment info to system context
    const otherAtts = (attachments ?? []).filter(a => !a.type.startsWith("image/") && a.type !== "application/pdf");
    if (otherAtts.length > 0) {
      ctxLines.push(`\nПрикреплённые файлы: ${otherAtts.map(a => a.name).join(", ")}`);
    }

    const chatMessages: any[] = [
      { role: "system", content: systemContent },
      ...historyMsgs,
    ];

    // Inject PDF text into the last user message as a document block.
    // Preserves multimodal array structure (image_url blocks) when images + PDFs arrive together.
    if (pdfDocBlocks) {
      const lastUserIdx = [...chatMessages].map((m, i) => ({ m, i })).reverse().find(({ m }) => m.role === "user");
      if (lastUserIdx) {
        const idx = lastUserIdx.i;
        const existing = chatMessages[idx];
        if (Array.isArray(existing.content)) {
          // Multimodal message — find the existing text block and append PDF text to it;
          // if there's no text block yet, prepend one so image_url items remain intact.
          const textBlock = (existing.content as any[]).find((c: any) => c.type === "text");
          if (textBlock) {
            textBlock.text = `${textBlock.text ?? ""}\n${pdfDocBlocks}`.trim();
          } else {
            (existing.content as any[]).unshift({ type: "text", text: pdfDocBlocks.trim() });
          }
        } else {
          // Plain-text message — safe to replace with a string
          const existingText = typeof existing.content === "string" ? existing.content : "";
          chatMessages[idx] = { role: "user", content: `${existingText}\n${pdfDocBlocks}`.trim() };
        }
      }
    }

    let approvalCards: object[] = [];
    let toolsWereCalled = false;

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

        // Emit completed status only if tools were used (multi-step operation)
        if (toolsWereCalled) {
          sse({ status: "completed" });
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

      // Signal execution phase to frontend
      toolsWereCalled = true;
      sse({ status: "executing" });

      for (const tc of msg.tool_calls) {
        const toolName = tc.function.name;
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}

        // Signal to frontend that a tool is being called
        sse({ toolCall: { name: toolName, args } });

        const { result, approvalCard, imageResult } = await executeTool(toolName, args);
        if (approvalCard) approvalCards.push(approvalCard);
        if (imageResult) sse({ image: imageResult });

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
    sse({ status: "error" });
    sse({ done: true });
    res.end();

  } catch (err: any) {
    const msg = err?.message ?? "Internal error";
    sse({ status: "error" });
    sse({ error: msg, done: true });
    res.end();
  }
});

export default router;

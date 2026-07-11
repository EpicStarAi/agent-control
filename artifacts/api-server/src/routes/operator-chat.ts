// AI Operator Chat route — connects the EPICGRAM operator sidebar to a real LLM.
// SAFETY: advisory-only, never sends Telegram messages, never exposes secrets/tokens.
// System prompt injects current Telegram runtime context so the AI understands the workspace.
import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `You are the EPICGRAM AI Operator — an intelligent assistant embedded inside the EPICGRAM Telegram management platform.

Your role:
- Help the operator navigate and understand the EPICGRAM workspace
- Answer questions about Telegram accounts, chats, dialogs, groups, channels, contacts
- Help analyse chat content, suggest navigation actions, summarise what's on screen
- Guide through account login flows (QR, phone, code, password)
- Explain status and errors clearly

STRICT SAFETY RULES (never violate):
- You are ADVISORY ONLY. You NEVER send Telegram messages yourself.
- You NEVER expose secrets, API keys, tokens, phone numbers, session data.
- All actual Telegram sends require explicit manual operator approval — remind user of this if they ask to send something.
- You operate in MANUAL_ONLY mode. Auto-send is permanently disabled.

Navigation actions:
- When the operator asks to open a chat, dialogs, groups, channels, etc., respond with a JSON action block at the END of your message, like:
  <action>{"kind":"navigate","target":"dialogs"}</action>
  Valid targets: "dialogs", "groups", "channels", "private", "contacts", "bots", "settings", "accounts"
- For opening a specific chat by name: <action>{"kind":"open_chat","query":"CHAT NAME"}</action>
- For other requests, just reply in plain text — no action block needed.

Language: respond in Russian by default (match the user's language if they write in English or Ukrainian).

Be concise, direct, helpful. No unnecessary preamble.`;

router.post("/operator/chat", async (req, res) => {
  try {
    const { messages, context } = req.body as {
      messages: { role: "user" | "assistant"; content: string }[];
      context?: {
        tgReady?: boolean;
        accountCount?: number;
        currentSection?: string;
        activeAccount?: string;
      };
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages required" });
      return;
    }

    // Build context injection as a system addendum
    const contextLines: string[] = [];
    if (context) {
      contextLines.push("\n--- Current workspace context ---");
      contextLines.push(`Telegram Runtime: ${context.tgReady === true ? "✅ готов" : context.tgReady === false ? "❌ не готов" : "⏳ неизвестно"}`);
      if (context.accountCount !== undefined) contextLines.push(`Аккаунтов: ${context.accountCount}`);
      if (context.activeAccount) contextLines.push(`Активный аккаунт: ${context.activeAccount}`);
      if (context.currentSection) contextLines.push(`Текущий раздел: ${context.currentSection}`);
    }

    const systemContent = SYSTEM_PROMPT + contextLines.join("\n");

    // SSE streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const stream = await openai.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemContent },
        ...messages.slice(-20), // last 20 turns to stay within context
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    const msg = err?.message ?? "Internal error";
    res.write(`data: ${JSON.stringify({ error: msg, done: true })}\n\n`);
    res.end();
  }
});

export default router;

// EPIC☠️GRAM structured chat memory (Telegram Agent v2).
//
// One JSON file per chatId under `.epicgram/chat-memory/` (gitignored, never
// committed). Holds the agent's working memory ABOUT a chat: summary, decisions,
// open questions, promises to the user, tasks, facts, plus the last classified
// intent / chat type / priority / risk. No secrets — only text the operator
// already sees. This is the AI layer only; it never touches Telegram runtime.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.cwd(), ".epicgram", "chat-memory");

function safeId(id) {
  const raw = String(id ?? "default").trim() || "default";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}
function file(id) {
  return path.join(root, `${safeId(id)}.json`);
}

export function emptyMemory(chatId = null) {
  return {
    chatId,
    chatType: "unknown",
    intent: "unknown",
    priority: "normal",
    risk: "low",
    summary: "",
    decisions: [],
    openQuestions: [],
    promises: [],
    tasks: [],
    facts: [],
    updatedAt: null,
  };
}

export async function getChatMemory(chatId) {
  try {
    const raw = await readFile(file(chatId), "utf8");
    return { ...emptyMemory(chatId), ...JSON.parse(raw), chatId };
  } catch {
    return emptyMemory(chatId);
  }
}

function cap(arr, n = 30) {
  const seen = new Set();
  const out = [];
  for (const x of arr || []) {
    const s = String(x).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out.slice(-n);
}

// Merge a fresh analysis update into the prior memory.
// Cumulative fields (decisions/promises/tasks/facts) append+dedupe;
// snapshot fields (summary/intent/chatType/priority/risk/openQuestions) replace.
export function mergeMemory(prev, update = {}) {
  const p = { ...emptyMemory(prev?.chatId), ...prev };
  const u = update || {};
  return {
    ...p,
    summary: (u.summary && String(u.summary).trim()) || p.summary,
    chatType: u.chatType && u.chatType !== "unknown" ? u.chatType : p.chatType,
    intent: u.intent && u.intent !== "unknown" ? u.intent : p.intent,
    priority: u.priority && u.priority !== "unknown" ? u.priority : p.priority,
    risk: u.risk && u.risk !== "unknown" ? u.risk : p.risk,
    openQuestions: Array.isArray(u.openQuestions) ? cap(u.openQuestions) : p.openQuestions,
    decisions: cap([...(p.decisions || []), ...(u.decisions || [])]),
    promises: cap([...(p.promises || []), ...(u.promises || [])]),
    tasks: cap([...(p.tasks || []), ...(u.tasks || [])]),
    facts: cap([...(p.facts || []), ...(u.facts || [])]),
  };
}

export async function saveChatMemory(chatId, memory) {
  await mkdir(root, { recursive: true });
  const merged = { ...emptyMemory(chatId), ...memory, chatId, updatedAt: new Date().toISOString() };
  await writeFile(file(chatId), JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

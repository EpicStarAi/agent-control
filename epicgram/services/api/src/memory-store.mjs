// EPIC☠️GRAM dialogue memory.
//
// Simple, dependency-free local store so the EPIC☠STAR persona can remember
// context across turns. One JSONL file per conversation under
// `.epicgram/memory/`. The `.epicgram/` directory is gitignored, so nothing
// here is ever committed. No secrets are stored — only conversation text the
// operator already sees in the UI.

import { mkdir, readFile, appendFile, readdir } from "node:fs/promises";
import path from "node:path";

const memoryRoot = path.resolve(process.cwd(), ".epicgram", "memory");

function safeConversationId(conversationId) {
  // Telegram chat ids can be negative; keep them filesystem-safe.
  const raw = String(conversationId ?? "default").trim() || "default";
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

function conversationFile(conversationId) {
  return path.join(memoryRoot, `${safeConversationId(conversationId)}.jsonl`);
}

/**
 * Append one memory entry for a conversation.
 * @param {string} conversationId
 * @param {{ role: "user" | "assistant" | "system" | "note", content: string, meta?: object }} entry
 */
export async function appendMemory(conversationId, entry) {
  if (!entry || !entry.content) return null;
  await mkdir(memoryRoot, { recursive: true });
  const record = {
    role: entry.role || "note",
    content: String(entry.content),
    meta: entry.meta ?? null,
    at: new Date().toISOString()
  };
  await appendFile(conversationFile(conversationId), `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

/**
 * Read the most recent memory entries for a conversation.
 * @param {string} conversationId
 * @param {number} limit
 */
export async function getRecentMemory(conversationId, limit = 20) {
  try {
    const raw = await readFile(conversationFile(conversationId), "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const parsed = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        // Skip malformed lines instead of failing the whole read.
      }
    }
    return parsed.slice(-Math.max(1, limit));
  } catch {
    return [];
  }
}

/** List conversation ids that currently have stored memory. */
export async function listConversations() {
  try {
    const files = await readdir(memoryRoot);
    return files.filter((name) => name.endsWith(".jsonl")).map((name) => name.replace(/\.jsonl$/, ""));
  } catch {
    return [];
  }
}

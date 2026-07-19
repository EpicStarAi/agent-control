// lib/agent/tools.ts — the REAL tool registry used by the /api/operator/run
// route. Read/draft tools call the existing backend Tool Router v1 (/ai/route),
// which never sends. Mutations map to publish/send but are NEVER executed here:
// the loop pauses them for the prepare->confirm->execute approval gate, so this
// registry's mutation call() is a guard that refuses to act on its own.
//
// This file uses fetch + env (server-only). It is imported by the route, not by
// unit tests (those inject fake tools).

import type { ToolCallOutcome, ToolContext, ToolDef, ToolRegistry, Verification } from "./types";
import { verifyMessageId, verifyNonEmptyResult } from "./verify";

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function ctxMessages(ctx: ToolContext): Array<Record<string, unknown>> {
  const m = ctx.run.context?.messages;
  return Array.isArray(m) ? (m as Array<Record<string, unknown>>) : [];
}

// POST to the backend tool router. Returns a normalized outcome. A transport
// error or a non-ok router response is reported as ok:false — never swallowed.
async function callRouter(
  tool: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolCallOutcome> {
  const chatId = str(args.chatId ?? ctx.run.context?.chatId);
  const chatTitle = str(args.chatTitle ?? ctx.run.context?.chatTitle) || "Telegram chat";
  const goal = ctx.run.goal;
  try {
    const res = await fetch(`${API_BASE_URL}/ai/route`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ command: goal, instruction: goal, tool, chatId, chatTitle, messages: ctxMessages(ctx) }),
      cache: "no-store"
    });
    const routed = await res.json().catch(() => null);
    if (!res.ok || !routed || routed.ok === false) {
      return { ok: false, claimed: "", error: `router_${res.status}:${str(routed?.error) || "no_result"}` };
    }
    const result = routed.result ?? {};
    const items = Array.isArray(result.items) ? result.items : [];
    const text = str(result.text);
    return {
      ok: true,
      claimed: text || `${tool}: ${items.length} элемент(ов)`,
      data: { text, items }
    };
  } catch (e) {
    return { ok: false, claimed: "", error: `router_offline:${e instanceof Error ? e.message : String(e)}` };
  }
}

function readTool(name: string, backendTool: string, risk: "read" | "draft"): ToolDef {
  return {
    name,
    risk,
    call: (args, ctx) => callRouter(backendTool, args, ctx),
    verify: async (_args, outcome): Promise<Verification | null> => {
      if (!outcome.ok) return null;
      return verifyNonEmptyResult(outcome.data, name);
    }
  };
}

// review_draft is a self-check that reads back the artifact produced by the
// prepare_post step (from the run's own recorded results) and verifies it is a
// substantive draft. No backend call — a pure state read-back.
const reviewDraftTool: ToolDef = {
  name: "review_draft",
  risk: "read",
  call: async (_args, ctx): Promise<ToolCallOutcome> => {
    const draftStep = [...ctx.run.steps].reverse().find((s) => s.tool === "prepare_post");
    const draft = draftStep ? draftStep.claimed : "";
    return {
      ok: true,
      claimed: draft ? "Черновик найден и прочитан для проверки." : "Черновик отсутствует.",
      data: { text: draft }
    };
  },
  verify: async (_args, outcome): Promise<Verification | null> => {
    const text = typeof (outcome.data as { text?: unknown })?.text === "string" ? (outcome.data as { text: string }).text : "";
    const ok = text.trim().length >= 20;
    return { method: "draft_readback", passed: ok, evidence: `draft_len=${text.trim().length}` };
  }
};

// Mutation tool: intentionally a no-op guard. The loop gates on risk=mutation
// BEFORE calling this, so it should never run; if it ever does, it refuses and
// never sends. Real publishing goes through the prepare->confirm->execute gate.
const publishPostTool: ToolDef = {
  name: "publish_post",
  risk: "mutation",
  call: async (): Promise<ToolCallOutcome> => ({
    ok: false,
    claimed: "",
    error: "mutation_requires_approval_gate",
    externalEffect: false
  }),
  verify: async (_args, outcome): Promise<Verification | null> => verifyMessageId(outcome)
};

const TOOLS: Record<string, ToolDef> = {
  get_last_messages: readTool("get_last_messages", "get_last_messages", "read"),
  summarize_chat: readTool("summarize_chat", "summarize_chat", "draft"),
  prepare_post: readTool("prepare_post", "prepare_post", "draft"),
  review_draft: reviewDraftTool,
  publish_post: publishPostTool
};

export const operatorToolRegistry: ToolRegistry = {
  get: (name: string) => TOOLS[name] ?? null
};

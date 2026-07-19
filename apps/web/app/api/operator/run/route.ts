// POST /api/operator/run — start an agent run (the loop replacing the single
// operator call).
//
// SECURITY (must not weaken):
//   * requires an authenticated principal (getPrincipal) — 401 otherwise;
//   * the Telegram slot is resolved SERVER-SIDE via resolveBoundAccount; the
//     accountId from the request body is IGNORED entirely;
//   * read/draft steps run without approval; risk=mutation steps are never
//     executed here — the loop pauses at waiting_approval for the existing
//     prepare->confirm->execute gate, which enforces telegramMutationsEnabled().
import { NextRequest } from "next/server";
import { requirePrincipal, resolveBoundAccount, guardedJson } from "@/lib/telegramGuard";
import { createRunObject, serializeRun, isTerminalStatus } from "@/lib/agentRuns";
import { runStore } from "@/lib/agentRunsDb";
import { runAgentLoop } from "@/lib/agent/runLoop";
import { createHeuristicPlanner } from "@/lib/agent/planner";
import { operatorToolRegistry } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Only chat selection + message content (for analysis) are accepted from the
// client. Nothing here influences authorization — the slot is server-resolved.
function sanitizeContext(raw: unknown): Record<string, unknown> {
  const c = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  if (typeof c.chatId === "string") out.chatId = c.chatId;
  if (typeof c.chatTitle === "string") out.chatTitle = c.chatTitle;
  if (Array.isArray(c.messages)) {
    out.messages = (c.messages as unknown[])
      .slice(-40)
      .map((m) => {
        const r = m && typeof m === "object" ? (m as Record<string, unknown>) : {};
        const content =
          (typeof r.content === "string" && r.content) ||
          (typeof r.text === "string" && r.text) ||
          (typeof r.message === "string" && r.message) ||
          "";
        return { content: String(content).slice(0, 4000), isOutgoing: Boolean(r.isOutgoing || r.role === "operator") };
      })
      .filter((m) => m.content.length > 0);
  }
  return out;
}

function numberOr(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export async function POST(req: NextRequest) {
  const auth = await requirePrincipal("/api/operator/run", "POST");
  if (!auth.ok) return auth.response;
  const principal = auth.principal;

  // Resolve the slot server-side. A mismatch (row points at a forbidden/foreign
  // slot) is a hard 403 — never fall back to a client-provided account.
  const bound = await resolveBoundAccount(principal);
  if (bound.kind === "mismatch") return guardedJson({ ok: false, reason: "owner_mismatch" }, 403);
  const accountId = bound.kind === "ok" ? bound.accountId : null;

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const goal = String((body.goal as string) ?? (body.command as string) ?? "").trim();
  if (!goal) return guardedJson({ ok: false, reason: "goal_required" }, 400);
  if (goal.length > 2000) return guardedJson({ ok: false, reason: "goal_too_long" }, 400);

  const run = createRunObject({
    userId: principal.userId,
    workspaceId: principal.workspaceId,
    accountId,
    goal,
    context: sanitizeContext(body.context ?? body.tgContext),
    maxSteps: numberOr(body.maxSteps),
    timeoutMs: numberOr(body.timeoutMs)
  });
  await runStore.createRun(run);

  // Launch the loop in the background; return the id immediately so the UI can
  // poll GET and press Cancel. The persistent Node server runs it to completion.
  const deps = { store: runStore, tools: operatorToolRegistry, planner: createHeuristicPlanner() };
  void runAgentLoop(run, deps).catch(async () => {
    // Defence in depth: never leave a run stuck 'running' on an engine error.
    try {
      const cur = await runStore.getRun(run.id);
      if (cur && !isTerminalStatus(cur.status)) {
        cur.status = "failed";
        cur.reason = "engine_error";
        cur.finishedAt = new Date().toISOString();
        await runStore.saveRun(cur);
      }
    } catch {
      /* ignore */
    }
  });

  return guardedJson({ ok: true, run: serializeRun(run) }, 201);
}

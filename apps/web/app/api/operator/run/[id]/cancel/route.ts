// POST /api/operator/run/[id]/cancel — request cancellation of a run.
// Authenticated + owner-scoped. Sets the cooperative cancel flag the loop checks
// between steps; the run transitions to `cancelled`. Anything already executed
// externally is NOT rolled back (in stage 1 no mutation auto-executes, so there
// is nothing to undo) — the run's reason records the truth either way.
import { NextRequest } from "next/server";
import { requirePrincipal, guardedJson } from "@/lib/telegramGuard";
import { serializeRun, isTerminalStatus } from "@/lib/agentRuns";
import { runStore } from "@/lib/agentRunsDb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  const auth = await requirePrincipal(`/api/operator/run/${id}/cancel`, "POST");
  if (!auth.ok) return auth.response;

  const run = await runStore.getRun(id);
  if (!run) return guardedJson({ ok: false, reason: "not_found" }, 404);
  if (run.workspaceId !== auth.principal.workspaceId || run.userId !== auth.principal.userId) {
    return guardedJson({ ok: false, reason: "forbidden" }, 403);
  }

  if (isTerminalStatus(run.status)) {
    return guardedJson({ ok: true, alreadyFinished: true, run: serializeRun(run) }, 200);
  }

  await runStore.requestCancel(id);
  const after = (await runStore.getRun(id)) ?? run;
  return guardedJson({ ok: true, cancelRequested: true, run: serializeRun(after) }, 200);
}

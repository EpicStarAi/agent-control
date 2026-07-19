// GET /api/operator/run/[id] — poll an agent run's state (plan + steps).
// Authenticated + owner-scoped: only the user+workspace that created the run may
// read it. The bound account id is masked in the response.
import { NextRequest } from "next/server";
import { requirePrincipal, guardedJson } from "@/lib/telegramGuard";
import { serializeRun } from "@/lib/agentRuns";
import { runStore } from "@/lib/agentRunsDb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  const auth = await requirePrincipal(`/api/operator/run/${id}`, "GET");
  if (!auth.ok) return auth.response;

  const run = await runStore.getRun(id);
  if (!run) return guardedJson({ ok: false, reason: "not_found" }, 404);
  if (run.workspaceId !== auth.principal.workspaceId || run.userId !== auth.principal.userId) {
    return guardedJson({ ok: false, reason: "forbidden" }, 403);
  }

  return guardedJson({ ok: true, run: serializeRun(run) }, 200);
}

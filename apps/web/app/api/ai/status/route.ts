import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

// P0: reported provider/model configuration anonymously. Gated.
export const dynamic = "force-dynamic";

// Fix [LOW]: /ai/status reports the legacy EPICGRAM_OPENAI_MODEL, but operator
// drafts actually run the model-router "control" role (DEFAULT_ROLES.control =
// anthropic/claude-sonnet-4). Merge the real control-role model in so the UI shows
// what actually answers. Read-only; no secrets surfaced.
export async function GET() {
  const auth = await requirePrincipal("/api/ai/status", "GET");
  if (!auth.ok) return auth.response;

  let status: Record<string, unknown> = {};
  try {
    const r = await fetch(`${API_BASE_URL}/ai/status`, { cache: "no-store", headers: { "content-type": "application/json" } });
    status = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) return NextResponse.json(status, { status: r.status, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json(
      { runtime: "backend_offline", message: `EPICGRAM backend is not reachable at ${API_BASE_URL}.` },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
  try {
    const rr = await fetch(`${API_BASE_URL}/ai/routes`, { cache: "no-store", headers: { "content-type": "application/json" } });
    if (rr.ok) {
      const routes = (await rr.json().catch(() => null)) as { roles?: Record<string, { model?: string }> } | null;
      const controlModel = routes?.roles?.control?.model;
      if (typeof controlModel === "string" && controlModel) {
        status.reportedModel = status.model ?? null;
        status.model = controlModel;
        status.controlModel = controlModel;
      }
    }
  } catch { /* keep status.model as reported by /ai/status */ }
  return NextResponse.json(status, { status: 200, headers: { "cache-control": "no-store" } });
}

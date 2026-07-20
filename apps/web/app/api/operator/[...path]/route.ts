import { NextRequest, NextResponse } from "next/server";
import { getPrincipal, recordDenial } from "@/lib/telegramGuard";

// Production-safe operator proxy.
//
// This route used to forward arbitrary /api/operator/* paths into the legacy
// backend. That backend still contains simulation/live-pilot/runbook endpoints
// and older singleton routes. In the Telegram client path, unknown operator
// routes must fail closed. Only narrow read-only health/status endpoints are
// proxied here; real Telegram actions use dedicated owner-scoped Next routes.
const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

const READ_ONLY_ALLOWLIST = new Set([
  "status",
  "context/status",
  "brain/status",
  "brain/start-instructions",
  "brain/config",
  "analytics/status",
  "ops/status",
  "ops/incidents",
]);

function unauthorized() {
  return NextResponse.json(
    { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
    { status: 401, headers: { "cache-control": "no-store" } }
  );
}

async function forward(req: NextRequest, path: string[], method: string) {
  const key = (path || []).join("/");
  if (method !== "GET" || !READ_ONLY_ALLOWLIST.has(key)) {
    const principal = await getPrincipal();
    recordDenial({
      reason: "operator_proxy_path_blocked",
      route: `/api/operator/${key}`,
      method,
      principal,
    });
    return NextResponse.json(
      {
        ok: false,
        blocked: true,
        message:
          "Этот operator endpoint отключён в production-пути EPICGRAM. Используйте owner-scoped Telegram/API routes.",
      },
      { status: 410, headers: { "cache-control": "no-store" } }
    );
  }

  const sub = "/operator/" + (path || []).join("/");
  const qs = req.nextUrl.search || "";
  const init: RequestInit = { method, headers: { "content-type": "application/json" }, cache: "no-store" };
  try {
    const r = await fetch(`${API_BASE_URL}${sub}${qs}`, init);
    const body = await r.json().catch(() => ({ ok: false, message: "Backend returned a non-JSON response." }));
    return NextResponse.json(body, { status: r.status });
  } catch {
    return NextResponse.json(
      { ok: false, runtime: "backend_offline", message: `EPICGRAM backend is not reachable at ${API_BASE_URL}. Start it with npm run api:dev.` },
      { status: 503 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  if (!(await getPrincipal())) return unauthorized();
  return forward(req, ctx.params.path, "GET");
}
export async function POST(req: NextRequest, ctx: { params: { path: string[] } }) {
  if (!(await getPrincipal())) return unauthorized();
  return forward(req, ctx.params.path, "POST");
}

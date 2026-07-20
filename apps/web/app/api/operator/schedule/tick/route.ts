import { NextResponse } from "next/server";
import { getPrincipal } from "@/lib/telegramGuard";
import { runSchedulerTick } from "@/lib/telegramScheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const H = { "cache-control": "no-store" } as const;

function workerIdFromHeader(value: string | null, fallback: string) {
  const v = String(value ?? "").trim();
  if (!v) return fallback;
  const safe = v.replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 96);
  return safe || fallback;
}

export async function POST(req: Request) {
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
      { status: 401, headers: H },
    );
  }
  if (principal.role !== "owner") {
    return NextResponse.json({ ok: false, reason: "owner_role_required" }, { status: 403, headers: H });
  }
  const fallback = `manual_${principal.userId}_${Date.now().toString(36)}`;
  const workerId = workerIdFromHeader(req.headers.get("x-epicgram-worker-id"), fallback);
  const result = await runSchedulerTick({ workerId });
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 503, headers: H });
  return NextResponse.json(result, { headers: H });
}

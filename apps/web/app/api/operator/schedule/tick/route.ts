import { NextResponse } from "next/server";
import { getPrincipal } from "@/lib/telegramGuard";
import { runSchedulerTick } from "@/lib/telegramScheduler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const H = { "cache-control": "no-store" } as const;

export async function POST() {
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
  const result = await runSchedulerTick({ workerId: `manual_${principal.userId}_${Date.now().toString(36)}` });
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 503, headers: H });
  return NextResponse.json(result, { headers: H });
}

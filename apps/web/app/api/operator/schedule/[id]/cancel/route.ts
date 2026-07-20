import { NextRequest, NextResponse } from "next/server";
import { getPrincipal } from "@/lib/telegramGuard";
import { cancelJob } from "@/lib/telegramScheduler";

export const dynamic = "force-dynamic";

const H = { "cache-control": "no-store" } as const;

export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const principal = await getPrincipal();
  if (!principal) {
    return NextResponse.json(
      { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
      { status: 401, headers: H }
    );
  }

  const result = await cancelJob(principal, ctx.params.id);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: result.status, headers: H });
  return NextResponse.json({ ok: true, job: result.job }, { headers: H });
}

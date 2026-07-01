import { NextResponse } from "next/server";
import { getEvents, addEvent } from "@/lib/missionStore";
import type { OperatorEvent } from "@/lib/missions";

// P24.1: operator events. GET is read-only. POST appends a SIMULATED event to the
// local store — no Telegram, no external calls, no production side effects.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const missionId = new URL(req.url).searchParams.get("missionId");
  return NextResponse.json({ events: getEvents(missionId) });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<OperatorEvent>;
  const result = addEvent(body ?? {});
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

import { NextResponse } from "next/server";
import { getOperatorEvents, appendOperatorEvent } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import type { OperatorEvent } from "@/lib/missions";

// P24.1 / P25 / P25.1: operator events via the data facade (DB or fs). GET is
// read-only. POST appends a SIMULATED event and broadcasts it over the Event Bus.
// No Telegram, no external calls, no production side effects.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const missionId = new URL(req.url).searchParams.get("missionId");
  const { events, source } = await getOperatorEvents(missionId);
  return NextResponse.json({ events, source });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<OperatorEvent>;
  const result = await appendOperatorEvent(body ?? {});
  if (result.ok && result.event) broadcast("operator.event.created", result.event);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

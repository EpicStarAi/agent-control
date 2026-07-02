import { NextResponse } from "next/server";
import { updateMissionStatus } from "@/lib/missionData";
import { broadcast } from "@/lib/operatorBus";
import type { MissionStatus } from "@/lib/missions";

// P24.1 / P25 / P25.1: SIMULATED status change via the data facade (DB or fs),
// then broadcast over the Event Bus. NO Telegram, NO external calls, NO
// production side effects. Approval Gate stays MANUAL_APPROVAL_ONLY.
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const status = body?.status as MissionStatus;
  const note = typeof body?.note === "string" ? body.note : undefined;
  const result = await updateMissionStatus(params.id, status, note);
  if (result.ok && result.mission) {
    broadcast("mission.status.changed", { missionId: result.mission.id, status: result.mission.status });
    broadcast("mission.updated", result.mission);
    if (result.event) broadcast("operator.event.created", result.event);
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

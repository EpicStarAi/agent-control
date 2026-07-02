import { NextResponse } from "next/server";
import { getMissions } from "@/lib/missionData";

// P24.1 / P25.1: mission list via the data facade (Postgres if configured,
// otherwise local fs fallback). Read-only.
export const dynamic = "force-dynamic";

export async function GET() {
  const { missions, source } = await getMissions();
  return NextResponse.json({ missions, source });
}

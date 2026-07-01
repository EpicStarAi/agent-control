import { NextResponse } from "next/server";
import { getMissions } from "@/lib/missionStore";

// P24.1: read-only mission list (local simulated store; no backend/Telegram).
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ missions: getMissions() });
}

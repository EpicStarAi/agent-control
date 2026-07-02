import { NextResponse } from "next/server";
import { getMission } from "@/lib/missionData";

// P24.1 / P25.1: single mission via the data facade (DB or fs fallback).
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { mission, source } = await getMission(params.id);
  if (!mission) return NextResponse.json({ message: "mission not found" }, { status: 404 });
  return NextResponse.json({ mission, source });
}

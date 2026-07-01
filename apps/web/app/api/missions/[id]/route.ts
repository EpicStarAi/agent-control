import { NextResponse } from "next/server";
import { getMission } from "@/lib/missionStore";

// P24.1: single mission detail (read-only).
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const mission = getMission(params.id);
  if (!mission) return NextResponse.json({ message: "mission not found" }, { status: 404 });
  return NextResponse.json({ mission });
}

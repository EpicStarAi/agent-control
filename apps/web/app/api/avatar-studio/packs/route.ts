import { NextResponse } from "next/server";
import { PACKS } from "@/lib/avatarStudio";

// P27.1 — static render-pack catalog (read-only, non-sensitive).
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ packs: PACKS });
}

import { NextResponse } from "next/server";
import { dashboard } from "@/lib/walletData";

// P28 — wallet dashboard: connected wallet + simulated balance + counts. Read-only.
export const dynamic = "force-dynamic";

export async function GET() {
  const { dashboard: d, source } = await dashboard();
  return NextResponse.json({ ...d, source });
}

import { NextRequest, NextResponse } from "next/server";

import { listAuditEvents } from "../../../../../lib/operator-v4/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(rawLimit) ? rawLimit : 100;

  return NextResponse.json({
    events: listAuditEvents(limit),
  });
}

import { NextResponse } from "next/server";
import { providerSummary } from "@/lib/renderProviders";

// P27.3 — render provider registry (id, name, mode, capabilities, enabled).
// Non-sensitive; no secrets. Used by the Avatar Studio provider selector.
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ providers: await providerSummary() });
}

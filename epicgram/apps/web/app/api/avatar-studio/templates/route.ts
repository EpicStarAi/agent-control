import { NextResponse } from "next/server";
import { TEMPLATE_CARDS, TEMPLATE_CATEGORIES } from "@/lib/avatarStudio";

// P27.8 — static template-card catalog (no workspace data). Public read.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, categories: TEMPLATE_CATEGORIES, templates: TEMPLATE_CARDS });
}

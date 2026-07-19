// GET  /api/onboarding/status — read the caller's onboarding progress.
// POST /api/onboarding/status — update it: advance step, complete, skip, or reset.
//
// Progress is scoped to the authenticated principal's workspace and stored
// server-side (Postgres, fs fallback). There is NO client-trusted state and NO
// localStorage — the browser only reflects what this endpoint reports. No
// mutation of Telegram or any external system happens here.
import { NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { getOnboarding, saveOnboarding } from "@/lib/onboardingData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "cache-control": "private, no-store, must-revalidate", pragma: "no-cache" } as const;

export async function GET() {
  const auth = await requirePrincipal("/api/onboarding/status", "GET");
  if (!auth.ok) return auth.response;
  const { state, source } = await getOnboarding(auth.principal.workspaceId);
  return NextResponse.json({ ok: true, state, source }, { headers: NO_STORE });
}

export async function POST(req: Request) {
  const auth = await requirePrincipal("/api/onboarding/status", "POST");
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // `reset` returns the flow to step 0 as "not passed" — powers the
  // "пройти заново" (start over) action from the menu.
  if (body.reset === true) {
    const { state, source } = await saveOnboarding(auth.principal.workspaceId, {
      step: 0, completed: false, skipped: false,
    });
    return NextResponse.json({ ok: true, state, source }, { headers: NO_STORE });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.step === "number") patch.step = body.step;
  if (typeof body.completed === "boolean") patch.completed = body.completed;
  if (typeof body.skipped === "boolean") patch.skipped = body.skipped;

  // Read-modify-write so a partial patch (e.g. just `step`) never clobbers the
  // completed/skipped flags.
  const current = (await getOnboarding(auth.principal.workspaceId)).state;
  const { state, source } = await saveOnboarding(auth.principal.workspaceId, { ...current, ...patch });
  return NextResponse.json({ ok: true, state, source }, { headers: NO_STORE });
}

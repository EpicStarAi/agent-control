import { NextResponse } from "next/server";
import { getPrincipal } from "@/lib/telegramGuard";
import { createScheduledJob, listJobs } from "@/lib/telegramScheduler";

export const dynamic = "force-dynamic";

const H = { "cache-control": "no-store" } as const;

function unauthenticated() {
  return NextResponse.json(
    { ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." },
    { status: 401, headers: H }
  );
}

export async function GET() {
  const principal = await getPrincipal();
  if (!principal) return unauthenticated();
  const result = await listJobs(principal);
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: result.status, headers: H });
  return NextResponse.json({ ok: true, jobs: result.jobs }, { headers: H });
}

export async function POST(req: Request) {
  const principal = await getPrincipal();
  if (!principal) return unauthenticated();
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const text = typeof body?.text === "string" ? body.text : "";
  const scheduledAt = typeof body?.scheduledAt === "string"
    ? body.scheduledAt
    : typeof body?.dueAt === "string"
      ? body.dueAt
      : "";
  const chatId = typeof body?.chatId === "string" ? body.chatId : "";
  const actionType = typeof body?.actionType === "string" ? body.actionType : "send_text";
  const approvalId = typeof body?.approvalId === "string" ? body.approvalId : "";
  const approvalToken = typeof body?.approvalToken === "string" ? body.approvalToken : typeof body?.token === "string" ? body.token : "";

  if (!chatId) return NextResponse.json({ ok: false, error: "no_selected_chat" }, { status: 200, headers: H });
  if (!scheduledAt) return NextResponse.json({ ok: false, error: "no_scheduledAt" }, { status: 200, headers: H });
  if (!text.trim()) return NextResponse.json({ ok: false, error: "no_text" }, { status: 200, headers: H });
  if (!approvalId || !approvalToken) return NextResponse.json({ ok: false, error: "approval_required" }, { status: 400, headers: H });

  const result = await createScheduledJob(principal, {
    chatId,
    actionType,
    text,
    scheduledAt,
    timezone: typeof body?.timezone === "string" ? body.timezone : "UTC",
    approvalId,
    approvalToken,
    maxAttempts: typeof body?.maxAttempts === "number" ? body.maxAttempts : undefined,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.reason }, { status: result.status, headers: H });
  return NextResponse.json({ ok: true, job: result.job }, { headers: H });
}

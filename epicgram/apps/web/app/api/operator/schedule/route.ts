import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// P3.8b: schedule enqueue proxy. Forwards an operator-approved schedule request
// to the backend queue. It ONLY enqueues — it NEVER sends a Telegram message and
// never calls /api/telegram/send. Actual publish happens later via manual tick.
const API_BASE_URL =
  process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const text = typeof body?.text === "string" ? body.text : "";
  const dueAt = typeof body?.dueAt === "string" ? body.dueAt : "";
  const auditId = typeof body?.auditId === "string" ? body.auditId : undefined;
  const accountId = typeof body?.accountId === "string" ? body.accountId : "";
  // Use the operator-selected chat only — AI-provided arbitrary target is ignored.
  const chatId = typeof body?.chatId === "string" ? body.chatId : "";
  const chatTitle = typeof body?.chatTitle === "string" ? body.chatTitle : "";

  // Safe log only — no full private message bodies.
  console.log(
    `[operator/schedule] chatId=${chatId || "-"} dueAt=${dueAt || "-"} auditId=${auditId || "-"} len=${text.length}`,
  );

  if (!chatId) return NextResponse.json({ ok: false, error: "no_selected_chat" }, { status: 200 });
  if (!dueAt) return NextResponse.json({ ok: false, error: "no_dueAt" }, { status: 200 });
  if (!text.trim()) return NextResponse.json({ ok: false, error: "no_text" }, { status: 200 });

  try {
    const upstream = await fetch(`${API_BASE_URL}/ai/schedule/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operatorApproved: true,
        actionType: "schedule_post",
        accountId,
        chatId,
        chatTitle,
        text,
        dueAt,
        auditId,
      }),
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(
      data ?? { ok: false, error: "backend_non_json" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "schedule_backend_offline" }, { status: 200 });
  }
}

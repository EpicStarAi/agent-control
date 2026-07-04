import { NextResponse } from "next/server";

// AI Operator command → REAL LLM runtime.
// Previously this route returned a hardcoded static string and never called any
// model (mock). It now proxies the operator's message to the backend AI runtime
// (`POST /ai/suggest` → generateDraftReply, an OpenAI-compatible brain call) and
// returns the model's draft. It still NEVER sends to Telegram — sending stays a
// separate operator-approved action. No streaming (backend uses stream:false).
export const dynamic = "force-dynamic";

const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const text =
    typeof body?.text === "string"
      ? body.text
      : typeof body?.command === "string"
        ? body.command
        : "";
  const history = Array.isArray(body?.history) ? body.history : [];
  const conversationId =
    typeof body?.conversationId === "string" && body.conversationId ? body.conversationId : "operator";

  const started = Date.now();
  try {
    const upstream = await fetch(`${API_BASE_URL}/ai/suggest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId,
        chatTitle: "AI Operator · EPIC☠STAR",
        history,
        instruction: text,
      }),
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    const latency = Date.now() - started;

    if (upstream.ok && data?.ok && data?.draft) {
      // [AI REQUEST] provider · model · latency · ok · finish
      console.log(
        `[AI REQUEST] operator/command provider=backend model=${data.model ?? "?"} latency_ms=${latency} ok=true finish=stop`
      );
      return NextResponse.json({
        ok: true,
        text: data.draft,
        model: data.model ?? null,
        latency_ms: latency,
        approval_required: true,
        mode: "MANUAL_APPROVAL_ONLY",
        runtime_mode: "READ_ONLY",
        actions: [],
        can_send: false,
        auto_send: false,
        bulk_actions: false,
      });
    }

    // Real, honest error — not a fake static reply.
    const errMsg = data?.error || `Мозг недоступен (HTTP ${upstream.status}).`;
    console.log(
      `[AI REQUEST] operator/command provider=backend latency_ms=${latency} ok=false status=${upstream.status} error=${errMsg}`
    );
    return NextResponse.json(
      {
        ok: false,
        text: `⚠ ${errMsg}`,
        error: errMsg,
        provider_status: upstream.status,
        latency_ms: latency,
        approval_required: true,
        mode: "MANUAL_APPROVAL_ONLY",
        can_send: false,
        auto_send: false,
      },
      { status: 200 }
    );
  } catch (e) {
    const latency = Date.now() - started;
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`[AI REQUEST] operator/command ok=false latency_ms=${latency} error=backend_unreachable ${msg}`);
    return NextResponse.json(
      {
        ok: false,
        text: "⚠ Нет связи с AI backend (8788). Запусти npm run api:dev.",
        error: "backend_offline",
        latency_ms: latency,
        approval_required: true,
        mode: "MANUAL_APPROVAL_ONLY",
        can_send: false,
        auto_send: false,
      },
      { status: 200 }
    );
  }
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

  return NextResponse.json({
    ok: true,
    text:
      "Я на связи. Работаю в безопасном режиме: могу анализировать чат, готовить черновики и предлагать действия только через подтверждение оператора. Автоотправка выключена.",
    input_received: Boolean(text),
    approval_required: true,
    mode: "MANUAL_APPROVAL_ONLY",
    runtime_mode: "READ_ONLY",
    actions: [],
    can_send: false,
    auto_send: false,
    bulk_actions: false
  });
}

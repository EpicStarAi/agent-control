// GET /api/telegram/binding/messages — get message history for a chat
// accountId is ALWAYS resolved server-side from the binding.
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { getMessages } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/messages", "GET");
  if (!auth.ok) return auth.response;

  const chatId = req.nextUrl.searchParams.get("chat_id") ?? "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "50"), 100);

  if (!chatId) {
    return NextResponse.json({ messages: [], reason: "chat_id обязателен." }, { status: 400 });
  }

  const result = await getMessages(
    { userId: auth.principal.userId, workspaceId: auth.principal.workspaceId },
    chatId,
    limit
  );

  if (!result.ok) {
    return NextResponse.json({ messages: [], reason: result.reason }, { status: 500 });
  }

  return NextResponse.json({ messages: result.messages, chatId: result.chatId }, {
    headers: {
      "cache-control": "private, no-store, must-revalidate",
      pragma: "no-cache",
    },
  });
}

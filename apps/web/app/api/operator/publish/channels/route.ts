import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { getChats } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isChannelLike(chat: Record<string, unknown>): boolean {
  const type = String(chat.type ?? chat.chatType ?? "").toLowerCase();
  return Boolean(chat.isChannel) || type.includes("channel") || type.includes("supergroup");
}

export async function GET(req: NextRequest) {
  const auth = await requirePrincipal("/api/operator/publish/channels", "GET");
  if (!auth.ok) return auth.response;

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 100, 200);
  const result = await getChats(auth.principal, limit);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, channels: [], reason: result.reason },
      { status: 502, headers: { "cache-control": "private, no-store, must-revalidate" } },
    );
  }

  const channels = (result.chats as Array<Record<string, unknown>>)
    .filter(isChannelLike)
    .map((chat) => ({
      id: String(chat.id ?? ""),
      title: String(chat.title ?? "Без названия"),
      type: chat.type ?? chat.chatType ?? "unknown",
      isChannel: Boolean(chat.isChannel) || String(chat.type ?? "").toLowerCase().includes("channel"),
      isGroup: Boolean(chat.isGroup) || String(chat.type ?? "").toLowerCase().includes("supergroup"),
      canPublish: false,
      reason: "Публикация доступна только через отдельное подтверждение и owner-scoped send gate.",
      username: chat.username ?? null,
      memberCount: chat.memberCount ?? chat.membersCount ?? null,
      unreadCount: chat.unreadCount ?? 0,
    }));

  return NextResponse.json(
    { ok: true, channels, source: result.source },
    { headers: { "cache-control": "private, no-store, must-revalidate" } },
  );
}

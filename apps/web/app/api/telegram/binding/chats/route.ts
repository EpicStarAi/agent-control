// GET /api/telegram/binding/chats — get dialog list for the bound account
// accountId is ALWAYS resolved server-side from the binding — never from query params.
import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/lib/telegramGuard";
import { getChats } from "@/lib/telegramBindingService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requirePrincipal("/api/telegram/binding/chats", "GET");
  if (!auth.ok) return auth.response;

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "30"), 100);

  const result = await getChats(
    { userId: auth.principal.userId, workspaceId: auth.principal.workspaceId },
    limit
  );

  if (!result.ok) {
    return NextResponse.json({ chats: [], reason: result.reason }, { status: 500 });
  }

  return NextResponse.json({ chats: result.chats, source: result.source }, {
    headers: {
      "cache-control": "private, no-store, must-revalidate",
      pragma: "no-cache",
    },
  });
}

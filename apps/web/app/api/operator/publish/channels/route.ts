// GET /api/operator/publish/channels
// Uses epic-telegram-runtime-client to get real TDLib chat list.
import { NextResponse } from 'next/server';
import { listChats } from '@/lib/epic-telegram-runtime-client';

export async function GET() {
  try {
    const result = await listChats('NOVIKOVA', 60);
    const channels = result.chats
      .filter((c) => c.isChannel || c.type === 'channel' || c.type === 'supergroup')
      .map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        isChannel: c.isChannel,
        isGroup: c.type === 'group' || c.type === 'supergroup',
        canPublish: false,
        reason: 'manual_approval_required',
        username: c.username,
        memberCount: c.unreadCount, // approximate — not real member count
      }));

    return NextResponse.json({
      ok: true,
      liveSend: false,
      approvalRequired: true,
      channels,
    });
  } catch (e: any) {
    if (e.message?.includes('POLICY_DENIED')) {
      return NextResponse.json({ ok: false, error: 'Account slot not allowed.', policy_blocked: true }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: 'Failed to load channels', message: String(e) },
      { status: 503 }
    );
  }
}

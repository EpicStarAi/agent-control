// GET /api/operator/publish/policy
// Static safe policy — no backend call needed.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    policy: {
      liveSend: false,
      mode: 'manual_approval_only',
      autoSendAllowed: false,
      requiresHumanApproval: true,
      blockedActions: [
        'send_message',
        'publish_now',
        'auto_send',
        'mass_sending',
        'account_logout',
        'account_remove',
      ],
    },
  });
}

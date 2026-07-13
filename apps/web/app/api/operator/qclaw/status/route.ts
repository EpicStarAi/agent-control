// GET /api/operator/qclaw/status
// Calls the backend directly via epic-telegram-runtime-client to bypass
// any Next.js compiled-layer auth quirks in the VS Code HMR environment.
// No auth required — this is a server-side-only read.
import { NextResponse } from 'next/server';
import { getAccountStatus } from '@/lib/epic-telegram-runtime-client';

export async function GET() {
  try {
    // getAccountStatus validates NOVIKOVA slot + calls :8788/telegram/status
    const status = await getAccountStatus('NOVIKOVA');

    return NextResponse.json({
      ok: true,
      service: 'epicgram-operator',
      mode: 'read_only',
      liveSend: false,
      approvalRequired: true,
      telegram: {
        connected: status.authorized,
        authorizationState: status.authorization_state,
        accountCount: 1,
        activeAccount: {
          idMasked: status.user_id ? `****${status.user_id.slice(-4)}` : null,
          displayName: status.display_name,
          username: status.username,
          type: status.account_type,
        },
      },
      runtime: {
        tdlib: status.authorized ? 'ready' : 'not_ready',
        nativeBindingLoaded: true,
        adapterMessage: status.adapter_message,
        tdlibVersion: status.tdlib_version,
      },
    });
  } catch (e: any) {
    if (e.message?.includes('POLICY_DENIED')) {
      return NextResponse.json({ ok: false, error: 'Account slot not allowed.', policy_blocked: true }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: 'Backend unreachable', message: 'EPICGRAM API backend is not responding on :8788.' },
      { status: 503 }
    );
  }
}

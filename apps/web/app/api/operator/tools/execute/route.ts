// POST /api/operator/tools/execute
// Read-only tool bridge — calls backend directly, falls back to
// epic-telegram-runtime-client for telegram.account.status.
// NEVER calls send endpoints. All write tools are blocked.
import { NextRequest, NextResponse } from 'next/server';
import { getAccountStatus, listChats } from '@/lib/epic-telegram-runtime-client';

const BACKEND = process.env.EPICGRAM_API_BASE_URL || 'http://127.0.0.1:8788';

const READ_ONLY_TOOLS = new Set([
  'telegram.account.status',
  'telegram.chats.list',
  'telegram.chat.resolve',
  'telegram.message.history',
  'telegram.chat.permissions',
  'telegram.post.verify',
  'operator.runtime.status',
  'publish.channels.list',
  'publish.policy.get',
]);

const BLOCKED_TOOLS = new Set([
  'telegram.message.send',
  'telegram.post.publish',
  'publish.now',
  'schedule.approve',
  'account.logout',
  'account.remove',
  'account.reset',
]);

function blockedEnvelope(tool: string, taskId: string) {
  return {
    ok: false,
    error: 'blocked_by_policy',
    tool,
    task_id: taskId,
    liveSend: false,
    requiresApproval: true,
    reason: 'Write tools are blocked in read-only operator mode. Live send requires manual confirmation.',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tool = body?.tool ?? '';
    const taskId = body?.task_id ?? `op-${Date.now().toString(36)}`;

    if (BLOCKED_TOOLS.has(tool)) {
      return NextResponse.json(blockedEnvelope(tool, taskId));
    }

    // Try backend first, then fall back to direct epic-telegram-runtime-client
    if (READ_ONLY_TOOLS.has(tool)) {
      let result: Record<string, unknown>;

      // Attempt backend bridge
      try {
        const resp = await fetch(`${BACKEND}/operator/tools/execute`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tool, input: body.input ?? {}, task_id: taskId }),
          signal: AbortSignal.timeout(3000),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.ok !== false) return NextResponse.json(data);
        }
      } catch {
        // Backend unreachable — fall through to direct client
      }

      // Direct fallback: route to epic-telegram-runtime-client
      const accountSlot = (body.input as Record<string, unknown>)?.account_slot as string || 'NOVIKOVA';

      if (tool === 'telegram.account.status') {
        const status = await getAccountStatus(accountSlot);
        return NextResponse.json({
          ok: true, tool, task_id: taskId, mode: 'read_only',
          liveSend: false, requiresApproval: true,
          result: {
            authorized: status.authorized,
            authorization_state: status.authorization_state,
            user_id: status.user_id,
            display_name: status.display_name,
            username: status.username,
            account_type: status.account_type,
            tdlib_version: status.tdlib_version,
          },
        });
      }

      if (tool === 'telegram.chats.list' || tool === 'publish.channels.list') {
        const chats = await listChats(accountSlot, 60);
        const channels = chats.chats.filter((c) => c.isChannel || c.type === 'channel' || c.type === 'supergroup');
        return NextResponse.json({
          ok: true, tool, task_id: taskId, mode: 'read_only',
          liveSend: false, requiresApproval: true,
          result: {
            chats: chats.chats.map((c) => ({ id: c.id, title: c.title, username: c.username, type: c.type, isChannel: c.isChannel })),
            channels: channels.map((c) => ({ id: c.id, title: c.title, type: c.type, canPublish: false })),
            total: chats.total,
          },
        });
      }

      if (tool === 'operator.runtime.status') {
        const status = await getAccountStatus(accountSlot);
        return NextResponse.json({
          ok: true, tool, task_id: taskId, mode: 'read_only',
          liveSend: false, requiresApproval: true,
          result: {
            runtime: status.authorized ? 'ready' : 'not_ready',
            authorizationState: status.authorization_state,
            connected: status.authorized,
          },
        });
      }

      if (tool === 'publish.policy.get') {
        return NextResponse.json({
          ok: true, tool, task_id: taskId, mode: 'read_only',
          liveSend: false, requiresApproval: true,
          result: { liveSend: false, mode: 'manual_approval_only', autoSendAllowed: false, requiresHumanApproval: true },
        });
      }

      return NextResponse.json({
        ok: false, tool, task_id: taskId, error: 'tool_not_implemented_in_fallback',
        liveSend: false, requiresApproval: true,
      });
    }

    return NextResponse.json({
      ok: false, tool, task_id: taskId, error: 'tool_not_found',
      reason: `Tool "${tool}" is not registered. Only read-only tools are permitted.`,
      liveSend: false, requiresApproval: true,
    }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({
      ok: false, error: 'proxy_error', message: String(e),
      liveSend: false, requiresApproval: true,
    }, { status: 500 });
  }
}

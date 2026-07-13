// POST /api/operator/qclaw/tasks — create a new QClaw operator task
import { NextRequest, NextResponse } from 'next/server';
import { createTask, transitionTask, TASK_STATUSES } from '@/lib/epic-task-model';
import { emitAudit, AUDIT_EVENTS } from '@/lib/epic-audit';
import { emitLiveEvent, LIVE_EVENT_TYPES } from '@/lib/epic-live-feed';
import { EPIC_TOOLS } from '@/lib/epic-tool-registry';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { intent, account_slot } = body;

    if (!intent) {
      return NextResponse.json({ ok: false, error: 'intent required' }, { status: 400 });
    }

    if (account_slot && account_slot !== 'NOVIKOVA') {
      return NextResponse.json(
        { ok: false, error: 'Only NOVIKOVA account_slot allowed in production phase 1', code: 'NOVIKOVA_ONLY' },
        { status: 403 }
      );
    }

    const task = createTask({
      intent,
      account_slot: 'NOVIKOVA',
      allowed_tools: Object.keys(EPIC_TOOLS),
    });

    const taskStarted = transitionTask(task, TASK_STATUSES.PLANNING, 'planning');

    emitAudit({
      event: AUDIT_EVENTS.QCLAW_TASK_CREATED,
      task_id: task.task_id,
      actor: 'qclaw',
      account_slot: 'NOVIKOVA',
      status: 'OK',
      timestamp: new Date().toISOString(),
    });

    emitLiveEvent({
      event: LIVE_EVENT_TYPES.ACK,
      task_id: task.task_id,
      message: `Task ${task.task_id} created`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, task: taskStarted }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

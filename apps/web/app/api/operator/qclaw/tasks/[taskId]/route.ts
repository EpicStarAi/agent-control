// GET /api/operator/qclaw/tasks/[taskId] — get task status
// POST /api/operator/qclaw/tasks/[taskId] — cancel task
import { NextRequest, NextResponse } from 'next/server';

import { taskStore } from '@/lib/epic-task-store';

export async function GET(
  _req: NextRequest,
  ctx: { params: { taskId: string } }
) {
  const task = taskStore.get(ctx.params.taskId);
  if (!task) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, task });
}

export async function POST(
  _req: NextRequest,
  ctx: { params: { taskId: string } }
) {
  // Cancel — implement if needed
  return NextResponse.json({ ok: false, error: 'Not implemented' }, { status: 501 });
}

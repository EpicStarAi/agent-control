// POST /api/operator/publish/execute — execute Telegram publish with full policy gate
import { NextRequest, NextResponse } from 'next/server';
import { enforceTdLibPolicy } from '@/lib/epic-tdlib-policy';
import { checkPublishPolicy, createIdempotencyRecord, markIdempotencySent, getPolicy } from '@/lib/epic-publish-policy';
import { emitAudit, AUDIT_EVENTS } from '@/lib/epic-audit';
import { emitLiveEvent, LIVE_EVENT_TYPES } from '@/lib/epic-live-feed';
import { publishPost } from '@/lib/epic-telegram-runtime-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      account_slot,
      channel_id,
      text,
      idempotency_key,
      source_task_id,
      disable_notification,
      operatorApproved,
    } = body;

    if (!account_slot || !channel_id || !text) {
      return NextResponse.json({ ok: false, error: 'account_slot, channel_id, text required' }, { status: 400 });
    }

    if (account_slot !== 'NOVIKOVA') {
      emitAudit({ event: AUDIT_EVENTS.QCLAW_POLICY_BLOCKED, task_id: source_task_id || 'unknown', actor: 'qclaw', tool_name: 'telegram.post.publish', account_slot, channel_id, status: 'BLOCKED', error_code: 'NOVIKOVA_ONLY', timestamp: new Date().toISOString() });
      return NextResponse.json({ ok: false, error: 'Only NOVIKOVA allowed', policy_blocked: true }, { status: 403 });
    }

    // TDLib policy check
    try {
      enforceTdLibPolicy({ account_slot, operation: 'post_publish' });
    } catch (e: any) {
      emitAudit({ event: AUDIT_EVENTS.QCLAW_POLICY_BLOCKED, task_id: source_task_id || 'unknown', actor: 'qclaw', tool_name: 'telegram.post.publish', account_slot, channel_id, status: 'BLOCKED', error_code: e.message, timestamp: new Date().toISOString() });
      emitLiveEvent({ event: LIVE_EVENT_TYPES.POLICY_BLOCKED, task_id: source_task_id || 'unknown', tool_name: 'telegram.post.publish', message: e.message, timestamp: new Date().toISOString() });
      return NextResponse.json({ ok: false, error: e.message, policy_blocked: true, stage: 'tdlib_policy' }, { status: 403 });
    }

    // Publish policy check
    const check = checkPublishPolicy({ account_slot, channel_id, idempotency_key: idempotency_key || '' });
    if (!check.allowed) {
      emitAudit({ event: AUDIT_EVENTS.QCLAW_POLICY_BLOCKED, task_id: source_task_id || 'unknown', actor: 'qclaw', tool_name: 'telegram.post.publish', account_slot, channel_id, status: 'BLOCKED', error_code: check.reason, timestamp: new Date().toISOString() });
      emitLiveEvent({ event: LIVE_EVENT_TYPES.POLICY_BLOCKED, task_id: source_task_id || 'unknown', tool_name: 'telegram.post.publish', message: check.reason, timestamp: new Date().toISOString() });
      return NextResponse.json({ ok: false, error: check.reason, policy_blocked: true }, { status: 403 });
    }

    // Idempotency record
    if (idempotency_key) {
      createIdempotencyRecord({
        idempotency_key,
        task_id: source_task_id || 'unknown',
        account_slot,
        channel_id,
        payload_hash: String(text).slice(0, 100),
      });
    }

    emitAudit({ event: AUDIT_EVENTS.QCLAW_PUBLISH_REQUESTED, task_id: source_task_id || 'unknown', actor: 'qclaw', account_slot, channel_id, status: 'OK', timestamp: new Date().toISOString() });
    emitLiveEvent({ event: LIVE_EVENT_TYPES.PUBLISH_STARTED, task_id: source_task_id || 'unknown', channel_id, timestamp: new Date().toISOString() });

    // ─── REAL PUBLISH via epic-telegram-runtime-client → backend → TDLib ───
    const result = await publishPost(
      account_slot,
      channel_id,
      text,
      { operatorApproved: Boolean(operatorApproved), disable_notification: Boolean(disable_notification), idempotency_key }
    );

    if (!result.ok) {
      if (idempotency_key) markIdempotencySent(idempotency_key, '');
      const errCode = result.error !== null && result.error !== undefined ? result.error : 'SEND_FAILED';
      emitAudit({ event: AUDIT_EVENTS.QCLAW_TASK_FAILED, task_id: source_task_id || 'unknown', actor: 'qclaw', account_slot, channel_id, error_code: errCode, status: 'ERROR', timestamp: new Date().toISOString() });
      emitLiveEvent({ event: LIVE_EVENT_TYPES.TASK_FAILED, task_id: source_task_id || 'unknown', channel_id, message: errCode, timestamp: new Date().toISOString() });
      return NextResponse.json({
        ok: false,
        error: errCode,
        status: result.status,
        policy_blocked: false,
        stage: result.stage,
      }, { status: 409 });
    }

    if (idempotency_key) markIdempotencySent(idempotency_key, result.message_id ?? '');

    emitAudit({ event: AUDIT_EVENTS.QCLAW_PUBLISH_COMPLETED, task_id: source_task_id || 'unknown', actor: 'qclaw', account_slot, channel_id, message_id: result.message_id ?? undefined, status: 'OK', timestamp: new Date().toISOString() });
    emitLiveEvent({ event: LIVE_EVENT_TYPES.PUBLISH_VERIFIED, task_id: source_task_id || 'unknown', channel_id, message_id: result.message_id ?? undefined, timestamp: new Date().toISOString() });

    return NextResponse.json({
      ok: true,
      message_id: result.message_id,
      status: result.status,
      sent_at: result.sent_at,
      stage: result.stage,
    });
  } catch (e: any) {
    if (e.code === 'POLICY_DENIED') {
      return NextResponse.json({ ok: false, error: e.message, policy_blocked: true }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

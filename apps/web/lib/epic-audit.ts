// EPIC💀GRAM Audit System — append-only event log for operator actions

export const AUDIT_EVENTS = {
  QCLAW_TASK_CREATED: 'QCLAW_TASK_CREATED',
  QCLAW_TASK_STARTED: 'QCLAW_TASK_STARTED',
  QCLAW_TOOL_REQUESTED: 'QCLAW_TOOL_REQUESTED',
  QCLAW_TOOL_COMPLETED: 'QCLAW_TOOL_COMPLETED',
  QCLAW_SHELL_EXECUTED: 'QCLAW_SHELL_EXECUTED',
  QCLAW_PUBLISH_REQUESTED: 'QCLAW_PUBLISH_REQUESTED',
  QCLAW_PUBLISH_STARTED: 'QCLAW_PUBLISH_STARTED',
  QCLAW_PUBLISH_COMPLETED: 'QCLAW_PUBLISH_COMPLETED',
  QCLAW_PUBLISH_VERIFIED: 'QCLAW_PUBLISH_VERIFIED',
  QCLAW_POLICY_BLOCKED: 'QCLAW_POLICY_BLOCKED',
  QCLAW_TASK_FAILED: 'QCLAW_TASK_FAILED',
  QCLAW_TASK_CANCELLED: 'QCLAW_TASK_CANCELLED',
  QCLAW_UI_ACTION: 'QCLAW_UI_ACTION',
} as const;
export type AuditEventType = typeof AUDIT_EVENTS[keyof typeof AUDIT_EVENTS];

export interface AuditEvent {
  event: AuditEventType;
  task_id: string;
  actor: string;
  tool_name?: string;
  account_slot?: string;
  chat_id?: string;
  channel_id?: string;
  message_id?: string;
  command_id?: string;
  status: 'OK' | 'BLOCKED' | 'ERROR';
  duration_ms?: number;
  error_code?: string;
  timestamp: string;
  // NEVER include:
  // - QClaw token
  // - Telegram credentials
  // - TDLib keys
  // - Full environment
  // - Shell secrets
}

const AUDIT_FILE = 'C:\\Users\\Admin\\agent-control\\data\\operator-audit\\audit.jsonl';

export function emitAudit(event: AuditEvent): void {
  try {
    const fs = require('fs');
    const dir = require('path').dirname(AUDIT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_FILE, JSON.stringify(event) + '\n');
  } catch {
    // silently fail — audit failure should not break operations
  }
}

export function queryAudit(opts: {
  task_id?: string;
  event_type?: AuditEventType;
  account_slot?: string;
  limit?: number;
}): AuditEvent[] {
  try {
    const fs = require('fs');
    if (!fs.existsSync(AUDIT_FILE)) return [];
    const lines = fs.readFileSync(AUDIT_FILE, 'utf-8').trim().split('\n').filter(Boolean);
    const events = lines
      .map((l: string) => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean) as AuditEvent[];

    let filtered = events;
    if (opts.task_id) filtered = filtered.filter((e: AuditEvent) => e.task_id === opts.task_id);
    if (opts.event_type) filtered = filtered.filter((e: AuditEvent) => e.event === opts.event_type);
    if (opts.account_slot) filtered = filtered.filter((e: AuditEvent) => e.account_slot === opts.account_slot);

    return filtered.slice(-(opts.limit || 100));
  } catch {
    return [];
  }
}

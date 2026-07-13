// EPIC💀GRAM Task Model — state machine for QClaw operator tasks

export const TASK_STATUSES = {
  QUEUED: 'QUEUED',
  PLANNING: 'PLANNING',
  RUNNING: 'RUNNING',
  WAITING_POLICY: 'WAITING_POLICY',
  PUBLISHING: 'PUBLISHING',
  VERIFYING: 'VERIFYING',
  COMPLETED: 'COMPLETED',
  PARTIAL: 'PARTIAL',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  POLICY_BLOCKED: 'POLICY_BLOCKED',
} as const;
export type TaskStatus = typeof TASK_STATUSES[keyof typeof TASK_STATUSES];

export interface EpicTask {
  task_id: string;
  actor: 'qclaw' | 'human' | 'system';
  account_slot: string;
  intent: string;
  status: TaskStatus;
  current_stage: string;
  allowed_tools: string[];
  target_chat_id: string | null;
  idempotency_key: string | null;
  result: unknown;
  error: string | null;
  created_at: string;
  updated_at: string;
  stages: TaskStage[];
}

export interface TaskStage {
  stage: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  result?: unknown;
  error?: string;
}

function generateId(): string {
  return `epic_task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createTask(opts: {
  intent: string;
  account_slot?: string;
  allowed_tools?: string[];
}): EpicTask {
  const now = new Date().toISOString();
  return {
    task_id: generateId(),
    actor: 'qclaw',
    account_slot: opts.account_slot || 'NOVIKOVA',
    intent: opts.intent,
    status: TASK_STATUSES.QUEUED,
    current_stage: 'created',
    allowed_tools: opts.allowed_tools || [],
    target_chat_id: null,
    idempotency_key: null,
    result: null,
    error: null,
    created_at: now,
    updated_at: now,
    stages: [{ stage: 'created', status: 'pending' }],
  };
}

export function transitionTask(
  task: EpicTask,
  newStatus: TaskStatus,
  stage?: string,
  result?: unknown,
  error?: string
): EpicTask {
  const now = new Date().toISOString();
  const updated = { ...task, status: newStatus, updated_at: now } as EpicTask;

  if (stage) {
    updated.current_stage = stage;
    const stageEntry = updated.stages.find(s => s.stage === stage);
    if (stageEntry) {
      stageEntry.status = 'active';
      stageEntry.started_at = now;
    }
  }

  if (result !== undefined) updated.result = result;
  if (error !== undefined) updated.error = error;

  const terminalStatuses: TaskStatus[] = [
    TASK_STATUSES.QUEUED,
    TASK_STATUSES.COMPLETED,
    TASK_STATUSES.FAILED,
    TASK_STATUSES.CANCELLED,
    TASK_STATUSES.POLICY_BLOCKED,
  ];

  if (terminalStatuses.includes(newStatus)) {
    const lastStage = updated.stages[updated.stages.length - 1];
    if (lastStage && lastStage.status === 'active') {
      lastStage.status = newStatus === TASK_STATUSES.COMPLETED ? 'completed' : 'failed';
      lastStage.completed_at = now;
      if (error) lastStage.error = error;
      if (result !== undefined) lastStage.result = result;
    }
    updated.stages.push({
      stage: newStatus,
      status: newStatus === TASK_STATUSES.COMPLETED ? 'completed' : 'failed',
      started_at: now,
      completed_at: now,
      error,
      result,
    });
  }

  return updated;
}

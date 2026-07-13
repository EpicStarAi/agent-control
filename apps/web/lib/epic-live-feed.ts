// EPIC💀GRAM Live Feed — real-time event bus for operator UI updates

export const LIVE_EVENT_TYPES = {
  ACK: 'ACK',
  PLAN_CREATED: 'PLAN_CREATED',
  STAGE_STARTED: 'STAGE_STARTED',
  TOOL_REQUESTED: 'TOOL_REQUESTED',
  TOOL_STARTED: 'TOOL_STARTED',
  TOOL_COMPLETED: 'TOOL_COMPLETED',
  PUBLISH_STARTED: 'PUBLISH_STARTED',
  PUBLISH_VERIFIED: 'PUBLISH_VERIFIED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_FAILED: 'TASK_FAILED',
  POLICY_BLOCKED: 'POLICY_BLOCKED',
  UI_ACTION: 'UI_ACTION',
} as const;
export type LiveEventType = typeof LIVE_EVENT_TYPES[keyof typeof LIVE_EVENT_TYPES];

export interface UIActionPayload {
  type: 'UI_ACTION';
  task_id: string;
  action: 'navigate' | 'focus' | 'read' | 'execute' | 'publish' | 'verify';
  target_id: string;
  state: 'STARTED' | 'ACTIVE' | 'SUCCESS' | 'ERROR';
  timestamp: string;
}

export interface LiveFeedEvent {
  event: LiveEventType;
  task_id: string;
  stage?: string;
  tool_name?: string;
  message?: string | null;
  timestamp: string;
  data?: unknown;
  ui_action?: UIActionPayload;
  // Extended fields used by publish routes
  channel_id?: string;
  message_id?: string | number;
}

// Stable data attributes for OperatorPresenceLayer
export const OPERATOR_TARGETS = {
  ACCOUNTS_NAV: 'accounts-nav',
  ACTIVE_ACCOUNT: 'active-account',
  CHAT_LIST: 'chat-list',
  MESSAGE_COMPOSER: 'message-composer',
  PUBLISH_BUTTON: 'publish-button',
  OPERATOR_PANEL: 'operator-panel',
  TASK_STATUS: 'task-status',
  LAST_PUBLISH: 'last-publish',
  CHANNEL_INFO: 'channel-info',
} as const;

// Operator presence states
export const OPERATOR_STATES = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  NAVIGATING: 'NAVIGATING',
  TARGETING: 'TARGETING',
  ACTING: 'ACTING',
  PUBLISHING: 'PUBLISHING',
  VERIFYING: 'VERIFYING',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
} as const;
export type OperatorState = typeof OPERATOR_STATES[keyof typeof OPERATOR_STATES];

// In-memory live feed — subscribe via EventEmitter pattern
type Listener = (event: LiveFeedEvent) => void;
const listeners = new Set<Listener>();

export function emitLiveEvent(event: LiveFeedEvent): void {
  listeners.forEach(l => {
    try { l(event); } catch { /* ignore dead listeners */ }
  });
}

export function subscribeLiveFeed(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function createUIAction(opts: {
  task_id: string;
  action: UIActionPayload['action'];
  target_id: string;
  state: UIActionPayload['state'];
}): UIActionPayload {
  return {
    type: 'UI_ACTION',
    task_id: opts.task_id,
    action: opts.action,
    target_id: opts.target_id,
    state: opts.state,
    timestamp: new Date().toISOString(),
  };
}

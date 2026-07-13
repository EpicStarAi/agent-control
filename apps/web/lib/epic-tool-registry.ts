// EPIC💀GRAM Tool Registry — typed contract for QClaw → EPICGRAM tool calls
// All tools validated against this schema before execution

export const EPIC_TOOLS = {
  'telegram.account.status': {
    name: 'telegram.account.status',
    description: 'Get authorization status of an account slot',
    inputSchema: {
      account_slot: { type: 'string', enum: ['NOVIKOVA'] },
    },
    outputSchema: {
      authorized: 'boolean',
      connection_state: 'string',
      user_id: 'string',
      display_name: 'string',
      username: 'string',
    },
    policy: 'tdlib',
    allowlist: ['NOVIKOVA'],
  },
  'telegram.chat.list': {
    name: 'telegram.chat.list',
    description: 'Get list of chats for an account',
    inputSchema: {
      account_slot: { type: 'string' },
      limit: { type: 'number' },
    },
    outputSchema: {
      chats: 'array',
    },
    policy: 'tdlib',
    allowlist: ['NOVIKOVA'],
  },
  'telegram.chat.resolve': {
    name: 'telegram.chat.resolve',
    description: 'Resolve a chat by username, chat_id, or title',
    inputSchema: {
      account_slot: { type: 'string' },
      chat_ref: { type: 'string' },
    },
    outputSchema: {
      chat_id: 'string',
      title: 'string',
      type: 'string',
    },
    policy: 'tdlib',
    allowlist: ['NOVIKOVA'],
  },
  'telegram.message.history': {
    name: 'telegram.message.history',
    description: 'Get message history from a chat',
    inputSchema: {
      account_slot: { type: 'string' },
      chat_id: { type: 'string' },
      limit: { type: 'number' },
    },
    outputSchema: {
      messages: 'array',
    },
    policy: 'tdlib',
    allowlist: ['NOVIKOVA'],
  },
  'telegram.chat.permissions': {
    name: 'telegram.chat.permissions',
    description: 'Get real chat member permissions: is_creator, is_administrator, can_post_messages, can_send_messages — via real TDLib',
    inputSchema: {
      account_slot: { type: 'string' },
      chat_id: { type: 'string' },
    },
    outputSchema: {
      chat_id: 'string',
      is_creator: 'boolean',
      is_administrator: 'boolean',
      can_post_messages: 'boolean',
      can_send_messages: 'boolean',
      permissions_source: 'string',
      data_source: 'string',
      error: 'string|null',
    },
    policy: 'tdlib',
    allowlist: ['NOVIKOVA'],
  },
  'telegram.message.send': {
    name: 'telegram.message.send',
    description: 'Send a text message to a chat',
    inputSchema: {
      account_slot: { type: 'string' },
      chat_id: { type: 'string' },
      text: { type: 'string' },
      idempotency_key: { type: 'string' },
    },
    outputSchema: {
      message_id: 'string',
      sent_at: 'string',
    },
    policy: 'publish',
    allowlist: ['NOVIKOVA'],
  },
  'telegram.post.publish': {
    name: 'telegram.post.publish',
    description: 'Publish a post to a channel with full policy check',
    inputSchema: {
      account_slot: { type: 'string' },
      channel_id: { type: 'string' },
      text: { type: 'string' },
      media: { type: 'array' },
      parse_mode: { type: 'string' },
      disable_notification: { type: 'boolean' },
      idempotency_key: { type: 'string' },
      source_task_id: { type: 'string' },
    },
    outputSchema: {
      message_id: 'string',
      status: 'string',
      sent_at: 'string',
    },
    policy: 'publish',
    allowlist: ['NOVIKOVA'],
  },
  'telegram.post.verify': {
    name: 'telegram.post.verify',
    description: 'Verify a published message exists and matches',
    inputSchema: {
      account_slot: { type: 'string' },
      chat_id: { type: 'string' },
      message_id: { type: 'string' },
    },
    outputSchema: {
      verified: 'boolean',
      message_text: 'string',
      match: 'boolean',
    },
    policy: 'tdlib',
    allowlist: ['NOVIKOVA'],
  },
  'shell.run': {
    name: 'shell.run',
    description: 'Execute an allowlisted shell command',
    inputSchema: {
      command_id: { type: 'string' },
      args: { type: 'array' },
      cwd_id: { type: 'string' },
      timeout_ms: { type: 'number' },
    },
    outputSchema: {
      stdout: 'string',
      stderr: 'string',
      exit_code: 'number',
      duration_ms: 'number',
    },
    policy: 'shell',
    allowlist: ['git_status', 'git_diff', 'git_log', 'npm_test', 'npm_build', 'service_health', 'read_logs', 'docker_ps', 'docker_logs', 'curl_local_health'],
  },
} as const;

export type EpicToolName = keyof typeof EPIC_TOOLS;

// InferInput / InferOutput — extract typed input/output from schema
type InferInput<T> = {
  [K in keyof T]: T[K] extends { type: 'string' }
    ? string
    : T[K] extends { type: 'number' }
    ? number
    : T[K] extends { type: 'boolean' }
    ? boolean
    : T[K] extends { type: 'array' }
    ? unknown[]
    : T[K] extends { enum: readonly string[] }
    ? T[K]['enum'][number]
    : unknown;
};

type InferOutput<T> = {
  [K in keyof T]: T[K] extends 'string'
    ? string
    : T[K] extends 'number'
    ? number
    : T[K] extends 'boolean'
    ? boolean
    : T[K] extends 'array'
    ? unknown[]
    : unknown;
};

export type EpicToolInput<T extends EpicToolName> = InferInput<typeof EPIC_TOOLS[T]['inputSchema']>;
export type EpicToolOutput<T extends EpicToolName> = InferOutput<typeof EPIC_TOOLS[T]['outputSchema']>;

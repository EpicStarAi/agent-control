// EPIC💀GRAM Publish Policy Engine — full gate for auto-publish operations

import * as fs from 'fs';
import * as path from 'path';

export const POLICY_FILE = 'C:\\Users\\Admin\\agent-control\\config\\operator-publish-policy.json';
export const IDEMPOTENCY_FILE = 'C:\\Users\\Admin\\agent-control\\data\\operator-idempotency.json';
export const AUDIT_DIR = 'C:\\Users\\Admin\\agent-control\\data\\operator-audit';

export interface PublishPolicy {
  enabled: boolean;
  account_slots: string[];
  allowed_channels: string[];
  max_posts_per_hour: number;
  max_posts_per_day: number;
  min_interval_seconds: number;
  require_idempotency_key: boolean;
  allow_media: boolean;
  allow_delete: boolean;
  allow_edit: boolean;
  rate_limit_window_ms: number;
  audit_storage_path: string;
}

export interface IdempotencyRecord {
  idempotency_key: string;
  task_id: string;
  account_slot: string;
  channel_id: string;
  payload_hash: string;
  status: 'PENDING' | 'SENT' | 'VERIFIED' | 'FAILED';
  message_id?: string;
  sent_at?: string;
  created_at: string;
}

function ensureDir(p: string): void {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadPolicy(): PublishPolicy {
  try {
    const raw = fs.readFileSync(POLICY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {
      enabled: false,
      account_slots: ['NOVIKOVA'],
      allowed_channels: [],
      max_posts_per_hour: 3,
      max_posts_per_day: 12,
      min_interval_seconds: 120,
      require_idempotency_key: true,
      allow_media: false,
      allow_edit: false,
      allow_delete: false,
      rate_limit_window_ms: 3600000,
      audit_storage_path: AUDIT_DIR,
    };
  }
}

function loadIdempotency(): Record<string, IdempotencyRecord> {
  try {
    if (fs.existsSync(IDEMPOTENCY_FILE)) {
      return JSON.parse(fs.readFileSync(IDEMPOTENCY_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {};
}

function saveIdempotency(data: Record<string, IdempotencyRecord>): void {
  ensureDir(IDEMPOTENCY_FILE);
  fs.writeFileSync(IDEMPOTENCY_FILE, JSON.stringify(data, null, 2));
}

export function getPolicy(): PublishPolicy {
  return loadPolicy();
}

export function addAllowedChannel(channelId: string): void {
  const policy = loadPolicy();
  if (!policy.allowed_channels.includes(channelId)) {
    policy.allowed_channels.push(channelId);
    ensureDir(POLICY_FILE);
    fs.writeFileSync(POLICY_FILE, JSON.stringify(policy, null, 2));
  }
}

export function setAutoPublish(enabled: boolean): void {
  const policy = loadPolicy();
  policy.enabled = enabled;
  ensureDir(POLICY_FILE);
  fs.writeFileSync(POLICY_FILE, JSON.stringify(policy, null, 2));
}

export function checkPublishPolicy(opts: {
  account_slot: string;
  channel_id: string;
  idempotency_key: string;
  payload_hash?: string;
}): { allowed: boolean; reason?: string; existing_record?: IdempotencyRecord } {
  const policy = loadPolicy();
  const idem = loadIdempotency();

  if (!policy.enabled) return { allowed: false, reason: 'AUTO_PUBLISH_DISABLED' };
  if (!policy.account_slots.includes(opts.account_slot)) {
    return { allowed: false, reason: `account_slot "${opts.account_slot}" not in policy allowlist` };
  }
  if (policy.allowed_channels.length === 0) return { allowed: false, reason: 'NO_CHANNELS_CONFIGURED' };
  if (!policy.allowed_channels.includes(opts.channel_id)) {
    return { allowed: false, reason: `channel "${opts.channel_id}" not in allowed_channels` };
  }
  if (policy.require_idempotency_key && !opts.idempotency_key) {
    return { allowed: false, reason: 'IDEMPOTENCY_KEY_REQUIRED' };
  }
  if (opts.idempotency_key && idem[opts.idempotency_key]) {
    const rec = idem[opts.idempotency_key];
    if (rec.status === 'SENT' || rec.status === 'VERIFIED') {
      return { allowed: false, reason: 'DUPLICATE_IDEMPOTENCY_KEY', existing_record: rec };
    }
  }

  return { allowed: true };
}

export function createIdempotencyRecord(opts: {
  idempotency_key: string;
  task_id: string;
  account_slot: string;
  channel_id: string;
  payload_hash: string;
}): IdempotencyRecord {
  const idem = loadIdempotency();
  const record: IdempotencyRecord = {
    ...opts,
    status: 'PENDING',
    created_at: new Date().toISOString(),
  };
  idem[opts.idempotency_key] = record;
  saveIdempotency(idem);
  return record;
}

export function markIdempotencySent(key: string, message_id: string): void {
  const idem = loadIdempotency();
  if (idem[key]) {
    idem[key].status = 'SENT';
    idem[key].message_id = message_id;
    idem[key].sent_at = new Date().toISOString();
    saveIdempotency(idem);
  }
}

export function markIdempotencyVerified(key: string): void {
  const idem = loadIdempotency();
  if (idem[key]) {
    idem[key].status = 'VERIFIED';
    saveIdempotency(idem);
  }
}

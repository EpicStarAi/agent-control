// File-system fallback for telegram_send_allowlist / approvals / audit.
// Used only when DATABASE_URL is not set. Runtime-only data lives under
// .runtime and is ignored by git.

import fs from "node:fs";
import path from "node:path";

export type StoreAllowlistRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  tdlib_account_id: string;
  chat_id: string;
  action_type: string;
  label: string | null;
  enabled: boolean;
  created_at: string;
};

export type StoreApprovalRow = {
  id: string;
  token_hash: string;
  workspace_id: string;
  user_id: string;
  tdlib_account_id: string;
  chat_id: string;
  action_type: string;
  payload_hash: string;
  preview: string | null;
  requires_second_confirm: boolean;
  confirm_stage: string;
  status: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

export type StoreAuditRow = {
  id: string;
  at: string;
  approval_id: string | null;
  workspace_id: string | null;
  user_id: string | null;
  tdlib_account_id: string | null;
  telegram_user_id: string | null;
  chat_id: string | null;
  action_type: string | null;
  payload_hash: string | null;
  confirm_stage: string | null;
  stage: string;
  outcome: string;
  error_code: string | null;
  telegram_message_id: string | null;
};

type Store = {
  allowlist: StoreAllowlistRow[];
  approvals: StoreApprovalRow[];
  audit: StoreAuditRow[];
};

const FILE = path.join(process.cwd(), ".runtime", "telegram-send-approvals.json");

function empty(): Store {
  return { allowlist: [], approvals: [], audit: [] };
}

function load(): Store {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    return empty();
  }
}

function save(store: Store): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
}

export async function isAllowed(input: {
  userId: string;
  accountId: string;
  chatId: string;
  actionType: string;
}): Promise<boolean> {
  const s = load();
  return s.allowlist.some((r) =>
    r.user_id === input.userId &&
    r.tdlib_account_id === input.accountId &&
    r.chat_id === String(input.chatId) &&
    r.action_type === input.actionType &&
    r.enabled === true
  );
}

export async function addAllowlist(input: {
  id: string;
  workspaceId: string;
  userId: string;
  accountId: string;
  chatId: string;
  actionType: string;
  label?: string | null;
  at: string;
}): Promise<void> {
  const s = load();
  const idx = s.allowlist.findIndex((r) =>
    r.user_id === input.userId &&
    r.tdlib_account_id === input.accountId &&
    r.chat_id === String(input.chatId) &&
    r.action_type === input.actionType
  );
  const row: StoreAllowlistRow = {
    id: idx >= 0 ? s.allowlist[idx].id : input.id,
    workspace_id: input.workspaceId,
    user_id: input.userId,
    tdlib_account_id: input.accountId,
    chat_id: String(input.chatId),
    action_type: input.actionType,
    label: input.label ?? null,
    enabled: true,
    created_at: idx >= 0 ? s.allowlist[idx].created_at : input.at,
  };
  if (idx >= 0) s.allowlist[idx] = row;
  else s.allowlist.push(row);
  save(s);
}

export async function createApproval(row: StoreApprovalRow): Promise<void> {
  const s = load();
  s.approvals.push(row);
  save(s);
}

export async function getApproval(id: string): Promise<StoreApprovalRow | null> {
  return load().approvals.find((r) => r.id === id) ?? null;
}

export async function setStage(id: string, confirmStage: string, status: string): Promise<void> {
  const s = load();
  const idx = s.approvals.findIndex((r) => r.id === id);
  if (idx >= 0) {
    s.approvals[idx] = { ...s.approvals[idx], confirm_stage: confirmStage, status };
    save(s);
  }
}

export async function consumeApproval(id: string, consumedAt: string): Promise<boolean> {
  const s = load();
  const idx = s.approvals.findIndex((r) => r.id === id && r.status === "confirmed");
  if (idx < 0) return false;
  s.approvals[idx] = { ...s.approvals[idx], status: "consumed", consumed_at: consumedAt };
  save(s);
  return true;
}

export async function markExpired(id: string): Promise<void> {
  const s = load();
  const idx = s.approvals.findIndex((r) => r.id === id && r.status !== "consumed" && r.status !== "expired");
  if (idx >= 0) {
    s.approvals[idx] = { ...s.approvals[idx], status: "expired" };
    save(s);
  }
}

export async function audit(row: StoreAuditRow): Promise<void> {
  const s = load();
  s.audit.push(row);
  if (s.audit.length > 500) s.audit = s.audit.slice(-500);
  save(s);
}

import fs from "node:fs";
import path from "node:path";

const FILE = path.join(process.cwd(), ".runtime", "telegram-send-approvals.json");

function empty() {
  return { allowlist: [], approvals: [], audit: [] };
}

function load() {
  try {
    return { ...empty(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  } catch {
    return empty();
  }
}

function save(store) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true, mode: 0o700 });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
}

export async function isAllowed(input) {
  const s = load();
  return s.allowlist.some((r) =>
    r.user_id === input.userId &&
    r.tdlib_account_id === input.accountId &&
    r.chat_id === String(input.chatId) &&
    r.action_type === input.actionType &&
    r.enabled === true
  );
}

export async function addAllowlist(input) {
  const s = load();
  const idx = s.allowlist.findIndex((r) =>
    r.user_id === input.userId &&
    r.tdlib_account_id === input.accountId &&
    r.chat_id === String(input.chatId) &&
    r.action_type === input.actionType
  );
  const row = {
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

export async function revokeAllowlist(input) {
  const s = load();
  let changed = false;
  s.allowlist = s.allowlist.map((r) => {
    if (
      r.workspace_id === input.workspaceId &&
      r.user_id === input.userId &&
      r.tdlib_account_id === input.accountId &&
      r.chat_id === String(input.chatId) &&
      r.action_type === input.actionType &&
      r.enabled === true
    ) {
      changed = true;
      return { ...r, enabled: false, revoked_at: new Date().toISOString() };
    }
    return r;
  });
  if (changed) save(s);
  return changed;
}

export async function createApproval(row) {
  const s = load();
  s.approvals.push(row);
  save(s);
}

export async function getApproval(id) {
  return load().approvals.find((r) => r.id === id) ?? null;
}

export async function setStage(id, confirmStage, status) {
  const s = load();
  const idx = s.approvals.findIndex((r) => r.id === id);
  if (idx >= 0) {
    s.approvals[idx] = { ...s.approvals[idx], confirm_stage: confirmStage, status };
    save(s);
  }
}

export async function consumeApproval(id, consumedAt) {
  const s = load();
  const idx = s.approvals.findIndex((r) => r.id === id && r.status === "confirmed");
  if (idx < 0) return false;
  s.approvals[idx] = { ...s.approvals[idx], status: "consumed", consumed_at: consumedAt };
  save(s);
  return true;
}

export async function markExpired(id) {
  const s = load();
  const idx = s.approvals.findIndex((r) => r.id === id && r.status !== "consumed" && r.status !== "expired");
  if (idx >= 0) {
    s.approvals[idx] = { ...s.approvals[idx], status: "expired" };
    save(s);
  }
}

export async function audit(row) {
  const s = load();
  s.audit.push(row);
  if (s.audit.length > 500) s.audit = s.audit.slice(-500);
  save(s);
}

// EPIC☠️GRAM — Operator Audit Log v1 (P3.5a). Append-only JSONL, BACKEND-ONLY.
//
// Records AI Operator proposals and approval-sensitive action metadata. It is
// NOT an execution path — it only writes/reads records. Never stores secrets or
// full private Telegram message bodies (preview is capped + hashed).

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Under .epicgram/ which is already git-ignored (runtime dir).
const DIR = path.resolve(process.cwd(), ".epicgram", "operator-audit");
const FILE = path.join(DIR, "audit.jsonl");
const PREVIEW_MAX = 160;

export function newAuditId() {
  return "aud_" + crypto.randomBytes(8).toString("hex");
}

export function sha256(text) {
  if (!text) return null;
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

// Short, single-line, capped preview of AI-generated draft text only.
// Callers MUST NOT pass raw incoming private message bodies here.
export function preview(text) {
  if (!text) return "";
  const s = String(text).replace(/\s+/g, " ").trim();
  return s.length > PREVIEW_MAX ? s.slice(0, PREVIEW_MAX) + "…" : s;
}

const DEFAULT_SAFETY = {
  autoSendBlocked: true,
  approvalRequiredForSend: true,
  executedExternalAction: false,
  sendBlocked: true
};

// Append one audit event. Returns the stored record (with auditId + ts).
// Never throws into the request path — best-effort durable write.
export function appendEvent(ev = {}) {
  const record = {
    auditId: ev.auditId || newAuditId(),
    ts: new Date().toISOString(),
    status: ev.status || "proposed",
    actor: ev.actor || "system",
    source: ev.source || "policy",
    tool: ev.tool || "unknown",
    actionType: ev.actionType || "none",
    chatId: ev.chatId ?? null,
    chatTitle: ev.chatTitle ?? null,
    model: ev.model ?? null,
    messageCount: Number.isFinite(ev.messageCount) ? ev.messageCount : 0,
    reason: ev.reason ?? null,
    scheduleId: ev.scheduleId ?? null,
    preview: preview(ev.preview),
    textSha256: ev.textSha256 ?? null,
    safety: { ...DEFAULT_SAFETY, ...(ev.safety || {}) },
    policy: ev.policy ? { allow: !!ev.policy.allow, reason: ev.policy.reason || "" } : { allow: true, reason: "" }
  };
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.appendFileSync(FILE, JSON.stringify(record) + "\n");
  } catch { /* best-effort; never break the caller */ }
  return record;
}

// Read most recent events (sanitized by construction). Read-only.
export function listEvents({ n = 50 } = {}) {
  const limit = Math.max(1, Math.min(200, Number(n) || 50));
  try {
    const raw = fs.readFileSync(FILE, "utf8").trim();
    if (!raw) return [];
    const lines = raw.split("\n").filter(Boolean);
    return lines.slice(-limit).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse();
  } catch {
    return [];
  }
}

export function auditFilePath() { return FILE; }

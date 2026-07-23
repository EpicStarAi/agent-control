// EPIC☠️GRAM — Schedule Queue v1 (P3.8a). BACKEND-ONLY, APPROVAL-GATED.
//
// Approved scheduled posts are stored in a local file queue and published later
// ONLY by an explicit manual tick (no automatic interval worker in P3.8a). A
// queue item is created ONLY after operatorApproved:true. The worker publishes
// to the operator-locked chatId — the AI never chooses the target. Send reuses
// the existing gated telegram-runtime.sendMessage (operatorApproved carried from
// the recorded approval). Audit records every stage; never logs full bodies.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { sendMessage } from "./telegram-runtime.mjs";
import { appendEvent, sha256, preview } from "./operator-audit.mjs";
import { evaluatePolicy } from "./policy.mjs";

const DIR = path.resolve(process.cwd(), ".epicgram", "schedule");
const FILE = path.join(DIR, "queue.json");
const STALE_PAST_MS = 24 * 60 * 60 * 1000; // dueAt older than 24h ago → refuse enqueue
const SAFETY = { autoSendBlocked: true, approvalRequiredForSend: true };

function newScheduleId() { return "sch_" + crypto.randomBytes(8).toString("hex"); }
function nowIso() { return new Date().toISOString(); }

function readQueue() {
  try {
    const raw = fs.readFileSync(FILE, "utf8").trim();
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeQueue(arr) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(arr, null, 1) + "\n");
    return true;
  } catch { return false; }
}

function auditSchedule(status, item, extra = {}) {
  try {
    appendEvent({
      auditId: item.auditId || undefined,
      scheduleId: item.scheduleId,
      status,
      actor: extra.actor || "operator",
      source: extra.source || "schedule",
      tool: "propose_schedule",
      actionType: "schedule_post",
      chatId: item.chatId ?? null,
      chatTitle: item.chatTitle ?? null,
      messageCount: 0,
      preview: item.preview || "",
      textSha256: item.textSha256 || null,
      reason: extra.reason ?? null,
      safety: { ...SAFETY, executedExternalAction: !!extra.executed, sendBlocked: extra.executed ? false : true },
      policy: extra.policy || evaluatePolicy({ actionType: "schedule_post", autoSend: false })
    });
  } catch { /* best-effort */ }
}

function blocked(http, reason, chatId, chatTitle) {
  try {
    appendEvent({
      status: "blocked", actor: "operator", source: "schedule", tool: "propose_schedule",
      actionType: "schedule_post", chatId: chatId ?? null, chatTitle: chatTitle ?? null,
      messageCount: 0, reason,
      safety: { ...SAFETY, executedExternalAction: false, sendBlocked: true },
      policy: evaluatePolicy({ actionType: "schedule_post", autoSend: false })
    });
  } catch {}
  return { ok: false, http, status: "blocked", error: reason };
}

// ---- enqueue (creates exactly one queue item AFTER operator approval) --------
export function enqueueSchedule(body = {}) {
  const operatorApproved = body?.operatorApproved === true;
  const actionType = String(body?.actionType || "");
  // AI-provided arbitrary target is IGNORED — we only accept the operator chatId.
  const accountId = typeof body?.accountId === "string" ? body.accountId.trim() : "";
  const chatId = typeof body?.chatId === "string" ? body.chatId.trim() : "";
  const chatTitle = typeof body?.chatTitle === "string" ? body.chatTitle : null;
  const text = String(body?.text ?? "").trim();
  const dueRaw = body?.dueAt;
  const sendMode = process.env.EPICGRAM_AI_SEND_MODE || "operator_approval_required";

  if (sendMode !== "operator_approval_required") return blocked(412, "send_mode_not_operator_approval", chatId, chatTitle);
  if (!operatorApproved) return blocked(412, "operator_approval_required", chatId, chatTitle);
  if (actionType !== "schedule_post") return blocked(400, "actionType_must_be_schedule_post", chatId, chatTitle);
  if (!chatId) return blocked(400, "chatId_required", chatId, chatTitle);
  if (!text) return blocked(400, "text_required", chatId, chatTitle);

  const dueMs = dueRaw ? Date.parse(String(dueRaw)) : NaN;
  if (!Number.isFinite(dueMs)) return blocked(400, "dueAt_invalid", chatId, chatTitle);
  if (dueMs < Date.now() - STALE_PAST_MS) return blocked(400, "dueAt_too_old", chatId, chatTitle);

  const policy = evaluatePolicy({ actionType: "schedule_post", autoSend: false });
  if (policy.blocked) return blocked(412, policy.reason || "policy_blocked", chatId, chatTitle);

  const item = {
    scheduleId: newScheduleId(),
    auditId: typeof body?.auditId === "string" ? body.auditId : null,
    sourceAuditId: typeof body?.sourceAuditId === "string" ? body.sourceAuditId : (typeof body?.auditId === "string" ? body.auditId : null),
    createdAt: nowIso(),
    dueAt: new Date(dueMs).toISOString(),
    status: "scheduled",
    accountId,
    chatId,
    chatTitle,
    actionType: "schedule_post",
    text, // full text needed for deferred execution — runtime file only (gitignored)
    textSha256: sha256(text),
    preview: preview(text),
    attempts: 0,
    lastError: null,
    lockedAt: null,
    executedAt: null
  };

  const q = readQueue();
  q.push(item);
  writeQueue(q);

  auditSchedule("approved", item, { reason: "operator_approved", policy });
  auditSchedule("scheduled", item, { policy });

  return { ok: true, scheduleId: item.scheduleId, status: "scheduled", dueAt: item.dueAt, auditId: item.auditId };
}

// ---- manual tick (no automatic worker) --------------------------------------
export async function tickSchedule() {
  const q = readQueue();
  const now = Date.now();
  let processed = 0, executed = 0, failed = 0, skipped = 0;

  for (let i = 0; i < q.length; i++) {
    const item = q[i];
    if (item.status !== "scheduled") { skipped++; continue; }              // executed/executing/failed/cancelled/blocked
    const dueMs = Date.parse(String(item.dueAt));
    if (!Number.isFinite(dueMs) || dueMs > now) { skipped++; continue; }    // not due yet

    processed++;
    auditSchedule("due", item);

    // Lock BEFORE send (persist) so a repeated tick can never double-send.
    item.status = "executing";
    item.lockedAt = nowIso();
    item.attempts = (item.attempts || 0) + 1;
    writeQueue(q);

    try {
      const res = await sendMessage({ accountId: item.accountId, chatId: item.chatId, text: item.text, operatorApproved: true });
      const ok = res?.status >= 200 && res?.status < 300;
      if (ok) {
        item.status = "executed";
        item.executedAt = nowIso();
        item.lastError = null;
        executed++;
        auditSchedule("executed", item, { executed: true });
      } else {
        item.status = "failed";
        item.lastError = String(res?.body?.message || `http_${res?.status}`).slice(0, 200);
        failed++;
        auditSchedule("failed", item, { reason: item.lastError });
      }
    } catch (e) {
      item.status = "failed";
      item.lastError = String(e?.message || e).slice(0, 200);
      failed++;
      auditSchedule("failed", item, { reason: item.lastError });
    }
    writeQueue(q);
  }

  return { ok: true, processed, executed, failed, skipped };
}

// ---- sanitized list (no full text) ------------------------------------------
export function listSchedule() {
  return readQueue().map((it) => ({
    scheduleId: it.scheduleId,
    auditId: it.auditId,
    status: it.status,
    dueAt: it.dueAt,
    createdAt: it.createdAt,
    accountId: it.accountId,
    chatId: it.chatId,
    chatTitle: it.chatTitle,
    actionType: it.actionType,
    preview: it.preview,
    textSha256: it.textSha256,
    attempts: it.attempts,
    lastError: it.lastError,
    lockedAt: it.lockedAt,
    executedAt: it.executedAt
  }));
}

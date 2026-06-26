// EPICSTAR LIVE OPS MONITOR (PHASE T8) — system state, incident detection, safe recovery.
// ADDITIVE. Assembles read-only health from operator-core + production-gate + simulation.
// NEVER sends, approves, confirms, retries, or runs background jobs. Recovery actions are a
// strict allow-list; send/approve/export/etc are blocked.

import { buildOperatorStatus } from "./operator-core.mjs";
import { simulationStatus } from "./operator-core.mjs";
import { productionStatus, lockRuntime, unlockRuntime, runProductionCheck } from "./production-gate.mjs";

const now = () => new Date().toISOString();

const SAFE_RECOVERY = ["refresh_ops_status", "rerun_health_checks", "rerun_simulation_qa", "validate_audit", "clear_noncritical_errors", "disable_live_mode", "lock_operator", "unlock_to_simulation", "rebuild_context_snapshot", "reload_draft_queue", "cancel_failed_draft", "mark_incident_acknowledged", "mark_incident_resolved"];
const BLOCKED_RECOVERY = ["send_message", "approve_draft", "confirm_send", "retry_send", "auto_send", "mass_send", "bypass_approval", "export_session", "export_credentials", "background_monitoring", "scrape_users", "auto_retry"];

function safety() {
  return { manual_approval_required: true, two_step_send_confirmation: true, auto_send_allowed: false, background_messaging: false, mass_messaging: false, credential_export: false, session_export: false, approval_bypass_allowed: false, recovery_send_allowed: false, auto_retry_send_allowed: false };
}

function detectIncidents(op, prod) {
  const inc = [];
  const push = (severity, type, component, title) => inc.push({ id: "inc_" + Math.random().toString(36).slice(2, 10), createdAt: now(), severity, status: "open", type, component, title, sendBlocked: true });
  if (!op || op.modelOnline === false) push("critical", "BRAIN_OFFLINE", "brain", "Local model endpoint unreachable");
  else if (op.status === "degraded") push("warning", "PRIMARY_MODEL_FAILED", "brain", "Primary model failed, fallback active");
  if (op && op.telegramReady === false) push("warning", "TELEGRAM_NOT_READY", "telegram", "No ready Telegram account");
  if (prod && prod.productionGate && prod.productionGate.killSwitch) push("critical", "KILL_SWITCH_ACTIVE", "productionGate", "Runtime locked by kill switch");
  return inc;
}

function calcState(op, prod, incidents) {
  if (prod && prod.productionGate && (prod.productionGate.killSwitch || prod.productionGate.runtimeMode === "LOCKED")) return "LOCKED";
  if (!op || op.modelOnline === false) return "OFFLINE";
  if (incidents.some((i) => i.severity === "critical")) return "RECOVERY_REQUIRED";
  if (op.status === "degraded" || (op.telegramReady === false) || incidents.length > 0) return "DEGRADED";
  return "ONLINE";
}

export async function getLiveOpsStatus() {
  const opWrap = await buildOperatorStatus();
  const op = opWrap.operator;
  const prod = productionStatus();
  const sim = simulationStatus();
  const incidents = detectIncidents(op, prod);
  const systemState = calcState(op, prod, incidents);
  return {
    ok: true,
    ops: {
      systemState,
      runtimeMode: prod.productionGate.runtimeMode,
      snapshot: {
        id: "ops_" + Math.random().toString(36).slice(2, 10),
        createdAt: now(),
        operator: { name: op.name, mode: op.mode, runtimeMode: prod.productionGate.runtimeMode, systemState },
        brain: { activeModel: op.activeModel, primaryModel: op.primaryModel, fallbackModel: op.fallbackModel, endpoint: op.modelEndpoint, status: op.status },
        telegram: { ready: op.telegramReady, selectedAccount: op.selectedAccount, sessionVisible: false },
        productionGate: prod.productionGate,
        simulation: sim.simulation,
        incidents: { open: incidents.length, critical: incidents.filter((i) => i.severity === "critical").length, warning: incidents.filter((i) => i.severity === "warning").length }
      },
      incidents
    },
    safety: safety()
  };
}

export async function recoveryAction(body) {
  body = body || {};
  const action = String(body.action || "").toLowerCase();
  if (BLOCKED_RECOVERY.indexOf(action) >= 0) return { ok: false, blocked: true, reason: "Recovery action is blocked by operator safety policy", action, safety: safety() };
  if (SAFE_RECOVERY.indexOf(action) < 0) return { ok: false, reason: "Unknown recovery action", action };
  let result = { acknowledged: true };
  if (action === "rerun_health_checks" || action === "refresh_ops_status") result = (await getLiveOpsStatus()).ops;
  else if (action === "lock_operator") result = lockRuntime({ reason: "ops recovery lock" });
  else if (action === "unlock_to_simulation") result = unlockRuntime({ confirmPhrase: "UNLOCK OPERATOR" });
  else if (action === "disable_live_mode") result = (await import("./production-gate.mjs")).disableLive();
  return { ok: true, action, result, at: now() };
}

export async function emergencyLock(body) {
  const r = lockRuntime({ reason: (body && body.reason) || "ops emergency lock" });
  return { ok: true, ...r, at: now() };
}

export { runProductionCheck };

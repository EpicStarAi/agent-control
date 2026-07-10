"use client";

import { useState } from "react";
import { ShieldCheck, ClipboardList, X } from "lucide-react";
import {
  ActionEnvelope,
  ActionType,
  SAFE_ACTIONS,
  BLOCKED_ACTIONS,
  AUDIT_EVENTS,
  QUEUE_COLOR,
  createEnvelope,
  approveAndExecute,
  rejectEnvelope,
  isBlocked,
  riskFor,
} from "@/lib/operatorActions";

type AuditFn = (event: string, extra?: Record<string, unknown>) => void;

const RISK_COLOR: Record<string, string> = { low: "#4ade80", medium: "#fbbf24", high: "#f87171" };

// P18 head-start: Claude Desktop-style Action Plan + Approval Modal + Execution Queue.
// SAFE actions только готовят план/черновик. HIGH-RISK показываются как blocked, реально не исполняются.
export function OperatorActionPlan({
  accountId = "",
  project = "",
  logAudit,
}: {
  accountId?: string;
  project?: string;
  logAudit?: AuditFn;
}) {
  const [queue, setQueue] = useState<ActionEnvelope[]>([]);
  const [modal, setModal] = useState<ActionEnvelope | null>(null);
  const [actionType, setActionType] = useState<ActionType>(SAFE_ACTIONS[0]);
  const [title, setTitle] = useState("");

  const audit: AuditFn = (event, extra) => {
    if (logAudit) logAudit(event, extra);
  };

  const addPlan = () => {
    const env = createEnvelope({
      action_type: actionType,
      title: title || String(actionType),
      account_id: accountId,
      project,
      steps: ["Подготовить план действия", "Показать оператору для подтверждения", "Исполнить только после Approve"],
    });
    setQueue((q) => [env, ...q]);
    setTitle("");
    audit(AUDIT_EVENTS.planCreated, { approval_id: env.approval_id, action_type: env.action_type, risk: env.risk_level });
  };

  const askApprove = (env: ActionEnvelope) => {
    setModal(env);
    audit(AUDIT_EVENTS.approvalRequested, { approval_id: env.approval_id });
  };

  const confirmApprove = () => {
    if (!modal) return;
    audit(AUDIT_EVENTS.approvalAccepted, { approval_id: modal.approval_id });
    audit(AUDIT_EVENTS.executionStarted, { approval_id: modal.approval_id });
    const res = approveAndExecute(modal);
    setQueue((q) => q.map((x) => (x.approval_id === res.approval_id ? res : x)));
    audit(res.approval_status === "blocked" ? AUDIT_EVENTS.executionBlocked : AUDIT_EVENTS.executionDone, {
      approval_id: res.approval_id,
      status: res.approval_status,
    });
    setModal(null);
  };

  const reject = (env: ActionEnvelope) => {
    const res = rejectEnvelope(env);
    setQueue((q) => q.map((x) => (x.approval_id === res.approval_id ? res : x)));
    audit(AUDIT_EVENTS.approvalRejected, { approval_id: env.approval_id });
  };

  const edit = (env: ActionEnvelope) => {
    setActionType(env.action_type);
    setTitle(env.title);
    setQueue((q) => q.filter((x) => x.approval_id !== env.approval_id));
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-[11px]">
        <ClipboardList className="h-4 w-4 text-fuchsia-300" />
        <span className="text-[9px] uppercase text-fuchsia-300/70">Action Plan · Approval Flow (P18)</span>
        <span className="ml-auto text-[9px] text-tg-muted">SAFE=подготовка · HIGH-RISK=blocked (без записи)</span>
      </div>

      {/* Creator */}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-tg-text"
        >
          <optgroup label="SAFE (подготовка)">
            {SAFE_ACTIONS.map((a) => (
              <option key={a} value={a} className="bg-black">
                {a}
              </option>
            ))}
          </optgroup>
          <optgroup label="HIGH-RISK (blocked)">
            {BLOCKED_ACTIONS.map((a) => (
              <option key={a} value={a} className="bg-black">
                {a}
              </option>
            ))}
          </optgroup>
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок действия"
          className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-tg-text"
        />
        <button
          onClick={addPlan}
          className="rounded-lg bg-fuchsia-600/30 px-3 py-1 text-[11px] font-semibold hover:bg-fuchsia-600/50"
        >
          ＋ Plan
        </button>
      </div>

      {/* Queue of Action Plan cards */}
      <div className="mt-2 space-y-2">
        {queue.length === 0 && <div className="text-[10px] text-tg-muted">Планов нет. Создай план действия выше.</div>}
        {queue.map((env) => {
          const high = isBlocked(env.action_type);
          return (
            <div key={env.approval_id} className="rounded-xl border border-white/10 bg-black/30 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-[12px] text-fuchsia-100">{env.title}</b>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ background: (RISK_COLOR[env.risk_level] || "#888") + "22", color: RISK_COLOR[env.risk_level] || "#888" }}
                >
                  risk: {env.risk_level}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ background: (QUEUE_COLOR[env.approval_status] || "#888") + "22", color: QUEUE_COLOR[env.approval_status] || "#888" }}
                >
                  {env.approval_status}
                </span>
                <span className="ml-auto text-[9px] text-tg-muted">{env.action_type}</span>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-tg-muted sm:grid-cols-3">
                <div>account: <b className="text-tg-text">{env.account_id || "—"}</b></div>
                <div>project: <b className="text-tg-text">{env.project || "—"}</b></div>
                <div>target: <b className="text-tg-text">{env.target.title || env.target.kind}</b></div>
              </div>
              {env.steps.length > 0 && (
                <ol className="mt-1 list-decimal pl-5 text-[10px] text-tg-muted">
                  {env.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              )}
              {env.result && <div className="mt-1 text-[10px]" style={{ color: high ? "#fca5a5" : "#86efac" }}>{env.result}</div>}
              {(env.approval_status === "pending") && (
                <div className="mt-1 flex flex-wrap gap-1">
                  <button onClick={() => edit(env)} className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20">Edit</button>
                  <button onClick={() => reject(env)} className="rounded bg-rose-600/20 px-2 py-0.5 text-[10px] text-rose-200 hover:bg-rose-600/35">Reject</button>
                  <button
                    onClick={() => askApprove(env)}
                    className="rounded bg-emerald-600/25 px-2 py-0.5 text-[10px] font-semibold hover:bg-emerald-600/40"
                  >
                    Approve and execute
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Approval Modal */}
      {modal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0c0a16] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-fuchsia-300" />
              <b className="text-[13px] text-fuchsia-100">Подтверждение действия</b>
              <button onClick={() => setModal(null)} className="ml-auto rounded p-1 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-2 text-[11px]">
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                style={{ background: (RISK_COLOR[modal.risk_level] || "#888") + "22", color: RISK_COLOR[modal.risk_level] || "#888" }}
              >
                risk: {modal.risk_level}
              </span>
              {isBlocked(modal.action_type) ? (
                <span className="ml-2 text-amber-300">Это HIGH-RISK — реальная запись в Telegram НЕ выполнится (blocked).</span>
              ) : (
                <span className="ml-2 text-emerald-300">SAFE — будет подготовлен план/черновик, без записи в Telegram.</span>
              )}
            </div>
            <div className="mb-2 text-[10px] text-tg-muted">Что произойдёт: {isBlocked(modal.action_type)
              ? "envelope перейдёт в blocked, никаких изменений в Telegram."
              : "envelope перейдёт в done (stub-подготовка), никаких изменений в Telegram."}</div>
            <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] text-tg-muted">{JSON.stringify(modal, null, 2)}</pre>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setModal(null)} className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-[12px] hover:bg-white/20">Отмена</button>
              <button
                onClick={confirmApprove}
                className="flex-1 rounded-lg bg-emerald-600/30 px-3 py-2 text-[12px] font-semibold hover:bg-emerald-600/50"
              >
                Подтверждаю
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorActionPlan;

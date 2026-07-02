// P26.1 Approval Gate — canonical model for AI-operator PROPOSED actions.
// AI may propose / explain / prepare payload. AI may NOT execute anything itself.
// Everything stays MANUAL_APPROVAL_ONLY: an operator must approve before any
// (future, P26.5) execution. Nothing here performs external side effects.

export type ApprovalStatus =
  | "waiting_approval" | "approved" | "rejected" | "cancelled" | "executed" | "failed";

export const APPROVAL_STATUSES: ApprovalStatus[] = [
  "waiting_approval", "approved", "rejected", "cancelled", "executed", "failed"
];

export type RiskLevel = "none" | "low" | "medium" | "high" | "critical";

export interface ApprovalAction {
  id: string;
  type: string;              // e.g. "publish.post" | "account.update" | "channel.invite"
  title: string;
  description: string;
  riskLevel: RiskLevel;
  sourceAgent: string;       // which AI operator proposed it
  targetModule: string;      // which platform module it targets
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  approvedBy: string | null;
  executionResult: Record<string, unknown> | null; // stays null until P26.5 sim
}

// allowed manual transitions in P26.1 (approve/reject/cancel). execute is P26.5.
export const TRANSITIONS: Record<string, ApprovalStatus[]> = {
  approve: ["approved"],
  reject: ["rejected"],
  cancel: ["cancelled"],
};

export function canApprove(s: ApprovalStatus){ return s === "waiting_approval"; }
export function canReject(s: ApprovalStatus){ return s === "waiting_approval"; }
export function canCancel(s: ApprovalStatus){ return s === "waiting_approval" || s === "approved"; }

// seed proposals so the queue is non-empty on first boot (fs + db seed-if-empty)
export const APPROVAL_SEED: ApprovalAction[] = [
  {
    id: "ap-publish-teaser",
    type: "publish.post",
    title: "Публикация тизера в канал @deepinside",
    description: "AI Publisher подготовил пост-тизер нового скетча. Требует ручного подтверждения оператора.",
    riskLevel: "low",
    sourceAgent: "AI-Publisher",
    targetModule: "AI Publisher",
    payload: { channel: "@deepinside", kind: "teaser", hasMedia: true, scheduled: null },
    status: "waiting_approval",
    createdAt: "2026-06-30T09:00:00.000Z",
    updatedAt: "2026-06-30T09:00:00.000Z",
    approvedBy: null,
    executionResult: null,
  },
  {
    id: "ap-growth-adcampaign",
    type: "growth.ads_campaign",
    title: "Запуск Telegram Ads кампании (бюджет-предложение)",
    description: "AI Growth предлагает кампанию продвижения канала. Высокий риск: расход средств — только через approve.",
    riskLevel: "high",
    sourceAgent: "AI-Growth",
    targetModule: "AI Growth",
    payload: { objective: "channel_growth", budgetHint: "предложение, без списания", audience: "ru/tech" },
    status: "waiting_approval",
    createdAt: "2026-06-30T10:15:00.000Z",
    updatedAt: "2026-06-30T10:15:00.000Z",
    approvedBy: null,
    executionResult: null,
  },
  {
    id: "ap-account-rename",
    type: "account.update",
    title: "Смена профиля рабочего аккаунта",
    description: "Account Manager предлагает обновить имя/био профиля. Требует подтверждения.",
    riskLevel: "medium",
    sourceAgent: "Account-Manager",
    targetModule: "Account Manager",
    payload: { field: "profile", changes: { name: "EPIC OPERATOR", bio: "AI-managed" } },
    status: "waiting_approval",
    createdAt: "2026-06-30T11:30:00.000Z",
    updatedAt: "2026-06-30T11:30:00.000Z",
    approvedBy: null,
    executionResult: null,
  },
];

export function newApprovalId(){
  return `ap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
}

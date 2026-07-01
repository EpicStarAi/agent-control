// P24 / P24.1 — Mission Center canonical model + seed.
// Client-safe (pure data, no node deps). The server store (lib/missionStore.ts)
// seeds from these constants. Everything here is simulated/read-only in spirit:
// no Telegram, no external calls, Approval Gate is MANUAL_APPROVAL_ONLY.

export type MissionStatus =
  | "draft" | "queued" | "in_progress" | "waiting_approval"
  | "approved" | "executed" | "failed" | "archived";

export type LifecycleTone = "idle" | "go" | "warn" | "ok" | "bad";
export type Priority = "low" | "medium" | "high";
export type RiskLevel = "none" | "low" | "medium" | "high";
export type ApprovalState = "not_required" | "pending" | "approved" | "rejected";

export const LIFECYCLE: { id: MissionStatus; label: string; tone: LifecycleTone }[] = [
  { id: "draft", label: "Draft", tone: "idle" },
  { id: "queued", label: "Queued", tone: "idle" },
  { id: "in_progress", label: "In progress", tone: "go" },
  { id: "waiting_approval", label: "Waiting approval", tone: "warn" },
  { id: "approved", label: "Approved", tone: "go" },
  { id: "executed", label: "Executed", tone: "ok" },
  { id: "failed", label: "Failed", tone: "bad" },
  { id: "archived", label: "Archived", tone: "idle" }
];
export const MISSION_STATUSES: MissionStatus[] = LIFECYCLE.map((l) => l.id);

export function statusMeta(s: MissionStatus) {
  return LIFECYCLE.find((l) => l.id === s) ?? LIFECYCLE[0];
}

export type Mission = {
  id: string;
  title: string;
  description: string;
  ownerOperator: string;
  priority: Priority;
  status: MissionStatus;
  linkedAdapters: string[];
  approvalRequired: boolean;
  createdAt: string;
  updatedAt: string;
  auditNotes: string[];
};

export type OperatorEvent = {
  id: string;
  missionId: string | null;
  sourceOperator: string;
  eventType: "suggested" | "approval_required" | "waiting" | "risk_checked" | "logged" | "status_changed";
  message: string;
  riskLevel: RiskLevel;
  approvalState: ApprovalState;
  timestamp: string;
};

const T0 = "2026-06-20T09:00:00.000Z";

export const MISSIONS: Mission[] = [
  {
    id: "m-client-launch",
    title: "EPIC GRAM AI CLIENT — launch",
    description: "Собрать клиент-операционку: платформенное ядро, экраны, навигация.",
    ownerOperator: "System",
    priority: "high",
    status: "in_progress",
    linkedAdapters: ["Web", "Desktop"],
    approvalRequired: false,
    createdAt: T0,
    updatedAt: T0,
    auditNotes: ["P16→P22A выполнены", "каждый шаг: build → commit", "деплой — отдельный approve-шаг"]
  },
  {
    id: "m-tg-stabilization",
    title: "Telegram Workspace — стабилизация",
    description: "Мультиаккаунт, мгновенное переключение, живые диалоги/устройства из TDLib.",
    ownerOperator: "NOVIKOVA 💋",
    priority: "high",
    status: "executed",
    linkedAdapters: ["Telegram"],
    approvalRequired: false,
    createdAt: T0,
    updatedAt: T0,
    auditNotes: ["60 диалогов · 22 канала · 13 групп", "P16 auth-guard", "P17 instant switch"]
  },
  {
    id: "m-operator-council",
    title: "Operator Council — реализация",
    description: "Внутренний штаб операторов: роли, Event Bus, Approval Gate, Audit.",
    ownerOperator: "System",
    priority: "medium",
    status: "executed",
    linkedAdapters: ["Client"],
    approvalRequired: false,
    createdAt: T0,
    updatedAt: T0,
    auditNotes: ["коммит 91f9866 · /council 200", "ядро — в клиенте", "read-only shell"]
  },
  {
    id: "m-vpn-hmn",
    title: "VPN / HideMyName — workstream",
    description: "Поддержка подключения VPN, оплата Stars, устранение блокировок.",
    ownerOperator: "Support",
    priority: "medium",
    status: "in_progress",
    linkedAdapters: ["VPN", "Telegram"],
    approvalRequired: true,
    createdAt: T0,
    updatedAt: T0,
    auditNotes: ["черновик ответа готов", "ответы клиентам — через approval", "паролей/ключей не просить"]
  },
  {
    id: "m-publisher",
    title: "Publisher / content pipeline",
    description: "Черновик → preview → approve-gate → ручное подтверждение публикации.",
    ownerOperator: "Publisher",
    priority: "high",
    status: "waiting_approval",
    linkedAdapters: ["Telegram канал"],
    approvalRequired: true,
    createdAt: T0,
    updatedAt: T0,
    auditNotes: ["1 черновик ждёт подтверждения", "auto-post OFF", "bulk OFF"]
  },
  {
    id: "m-digital-human",
    title: "Digital Human / Live (Wan) — north star",
    description: "Real-time аватар: мозг + голос + лицо. Mini App (WebRTC) / /live.",
    ownerOperator: "BUCH ☠",
    priority: "low",
    status: "draft",
    linkedAdapters: ["Mini App", "RTMP/live"],
    approvalRequired: true,
    createdAt: T0,
    updatedAt: T0,
    auditNotes: ["WATCH: Wan / HeyGen", "живой видео-звонок через TDLib невозможен", "цель ~P26"]
  }
];

export const OPERATOR_EVENTS: OperatorEvent[] = [
  { id: "e1", missionId: "m-vpn-hmn", sourceOperator: "NOVIKOVA 💋", eventType: "suggested", message: "Предложила черновик ответа на VPN-запрос", riskLevel: "none", approvalState: "pending", timestamp: T0 },
  { id: "e2", missionId: "m-publisher", sourceOperator: "BUCH ☠", eventType: "approval_required", message: "Пост для канала ждёт подтверждения оператора", riskLevel: "none", approvalState: "pending", timestamp: T0 },
  { id: "e3", missionId: "m-publisher", sourceOperator: "Publisher", eventType: "waiting", message: "Очередь публикации: 1 черновик на approve", riskLevel: "none", approvalState: "pending", timestamp: T0 },
  { id: "e4", missionId: null, sourceOperator: "Auditor", eventType: "risk_checked", message: "Проверил контакт: risk LOW (10)", riskLevel: "low", approvalState: "not_required", timestamp: T0 },
  { id: "e5", missionId: null, sourceOperator: "Analyst", eventType: "suggested", message: "Свёл метрики каналов за неделю", riskLevel: "none", approvalState: "not_required", timestamp: T0 },
  { id: "e6", missionId: null, sourceOperator: "System", eventType: "logged", message: "runtime.health · SSE connected", riskLevel: "none", approvalState: "not_required", timestamp: T0 }
];

export function eventTone(e: Pick<OperatorEvent, "eventType">): LifecycleTone {
  if (e.eventType === "approval_required" || e.eventType === "waiting") return "warn";
  if (e.eventType === "risk_checked") return "ok";
  if (e.eventType === "suggested") return "go";
  return "idle";
}

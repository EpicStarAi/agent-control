// P24 Mission Center — static, read-only seed data. No backend, no sends.
// The client is the control room; missions are the shared task/lifecycle view
// for the AI operators. Everything here is display-only and simulated.

export type MissionStatus =
  | "draft" | "queued" | "in_progress" | "waiting_approval"
  | "approved" | "executed" | "failed" | "archived";

export type LifecycleTone = "idle" | "go" | "warn" | "ok" | "bad";

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

export function statusMeta(s: MissionStatus) {
  return LIFECYCLE.find((l) => l.id === s) ?? LIFECYCLE[0];
}

export type Priority = "low" | "medium" | "high";

export type Mission = {
  id: string;
  title: string;
  summary: string;
  owner: string;          // operator name
  priority: Priority;
  status: MissionStatus;
  adapters: string[];     // linked channels/adapters
  lastActivity: string;   // human-readable
  approvalRequired: boolean;
  audit: string[];        // audit notes (safe metadata only)
};

// Seed maps to the real EPIC GRAM workstreams (safe, no secrets).
export const MISSIONS: Mission[] = [
  {
    id: "m-client-launch",
    title: "EPIC GRAM AI CLIENT — launch",
    summary: "Собрать клиент-операционку: платформенное ядро, экраны, навигация.",
    owner: "System",
    priority: "high",
    status: "in_progress",
    adapters: ["Web", "Desktop"],
    lastActivity: "P22A · Telegram Data API · зелёный build",
    approvalRequired: false,
    audit: ["P16→P22A выполнены", "каждый шаг: build → commit", "деплой — отдельный approve-шаг"]
  },
  {
    id: "m-tg-stabilization",
    title: "Telegram Workspace — стабилизация",
    summary: "Мультиаккаунт, мгновенное переключение, живые диалоги/устройства из TDLib.",
    owner: "NOVIKOVA 💋",
    priority: "high",
    status: "executed",
    adapters: ["Telegram"],
    lastActivity: "60 диалогов · 22 канала · 13 групп подтянуты",
    approvalRequired: false,
    audit: ["P16 auth-guard", "P17 instant switch", "P21/P22A data view"]
  },
  {
    id: "m-operator-council",
    title: "Operator Council — реализация",
    summary: "Внутренний штаб операторов: роли, Event Bus, Approval Gate, Audit.",
    owner: "System",
    priority: "medium",
    status: "executed",
    adapters: ["Client"],
    lastActivity: "коммит 91f9866 · /council 200",
    approvalRequired: false,
    audit: ["ядро — в клиенте", "Telegram — внешний адаптер", "read-only shell"]
  },
  {
    id: "m-vpn-hmn",
    title: "VPN / HideMyName — workstream",
    summary: "Поддержка подключения VPN, оплата Stars, устранение блокировок.",
    owner: "Support",
    priority: "medium",
    status: "in_progress",
    adapters: ["VPN", "Telegram"],
    lastActivity: "черновик ответа на запрос подключения готов",
    approvalRequired: true,
    audit: ["ответы клиентам — через approval", "паролей/ключей не просить"]
  },
  {
    id: "m-publisher",
    title: "Publisher / content pipeline",
    summary: "Черновик → preview → approve-gate → ручное подтверждение публикации.",
    owner: "Publisher",
    priority: "high",
    status: "waiting_approval",
    adapters: ["Telegram канал"],
    lastActivity: "1 черновик поста ждёт подтверждения оператора",
    approvalRequired: true,
    audit: ["auto-post OFF", "bulk OFF", "публикация только после confirm"]
  },
  {
    id: "m-digital-human",
    title: "Digital Human / Live (Wan) — north star",
    summary: "Real-time аватар: мозг + голос + лицо. Mini App (WebRTC) / /live.",
    owner: "BUCH ☠",
    priority: "low",
    status: "draft",
    adapters: ["Mini App", "RTMP/live"],
    lastActivity: "WATCH: следим за Wan / HeyGen; строим после ядра",
    approvalRequired: true,
    audit: ["живой видео-звонок через TDLib невозможен", "цель ~P26"]
  }
];

export type Activity = {
  id: string;
  at: string;               // human time
  operator: string;
  kind: "suggested" | "approval_required" | "waiting" | "risk_checked" | "logged";
  text: string;
};

export const ACTIVITY: Activity[] = [
  { id: "a1", at: "сейчас", operator: "NOVIKOVA 💋", kind: "suggested", text: "Предложила черновик ответа на VPN-запрос" },
  { id: "a2", at: "1 мин", operator: "BUCH ☠", kind: "approval_required", text: "Пост для канала ждёт подтверждения оператора" },
  { id: "a3", at: "3 мин", operator: "Publisher", kind: "waiting", text: "Очередь публикации: 1 черновик на approve" },
  { id: "a4", at: "6 мин", operator: "Auditor", kind: "risk_checked", text: "Проверил контакт: risk LOW (10)" },
  { id: "a5", at: "8 мин", operator: "Analyst", kind: "suggested", text: "Свёл метрики каналов за неделю" },
  { id: "a6", at: "10 мин", operator: "System", kind: "logged", text: "runtime.health · SSE connected" }
];

export function activityTone(k: Activity["kind"]): LifecycleTone {
  if (k === "approval_required" || k === "waiting") return "warn";
  if (k === "risk_checked") return "ok";
  if (k === "suggested") return "go";
  return "idle";
}

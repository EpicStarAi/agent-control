"use client";

import { useEffect, useMemo, useState } from "react";
import { AgentWorkspace } from "./AgentWorkspace";
import { EffectiveHtmlCanvas } from "./EffectiveHtmlCanvas";
import { EcosystemMap } from "./EcosystemMap";
import { TelegramWorkspace } from "./TelegramWorkspace";
import { AiGuide } from "./AiGuide";
import { AiCoo } from "./AiCoo";
import { OperationsCenter } from "./OperationsCenter";
import { MediaFactory } from "./MediaFactory";
import { MediaOps } from "./MediaOps";
import { EpicArchitect } from "./EpicArchitect";
import { DeviceCenter } from "./DeviceCenter";
import { ControlShell } from "./ControlShell";
import { applyPrefs } from "./prefs";
import { setCtx } from "./context";
import { ProvisioningAgent } from "./ProvisioningAgent";
import { RuntimeCenter } from "./RuntimeCenter";
import { MediaNetwork } from "./MediaNetwork";
import { AdvertisingFactory } from "./AdvertisingFactory";
import { SocialEmpire } from "./SocialEmpire";
import { AgentOS } from "./AgentOS";
import { EcosystemBus } from "./EcosystemBus";
import { MediaFactoryCanvas } from "./MediaFactoryCanvas";
import { MediaFactoryOrchestration } from "./MediaFactoryOrchestration";
import { EconomyEngine } from "./EconomyEngine";
import { WorldEngine } from "./WorldEngine";
import { ActivationEngine } from "./ActivationEngine";
import { StrategyCenter } from "./StrategyCenter";
import { KnowledgeEngine } from "./KnowledgeEngine";
import { AutomationFabric } from "./AutomationFabric";
import { LaunchOpsCenter } from "./LaunchOpsCenter";
import { IdentityInfra } from "./IdentityInfra";
import { DigitalHumanFactory } from "./DigitalHumanFactory";
import { AndroidCloudLab } from "./AndroidCloudLab";
import { OperationsAssignmentMatrix } from "./OperationsAssignmentMatrix";
import { RuntimeGateRequestBuilder } from "./RuntimeGateRequestBuilder";
import { RuntimeDryRunSimulator } from "./RuntimeDryRunSimulator";
import { PlatformOS } from "./PlatformOS";
import { WorldEngineCenter } from "./WorldEngineCenter";
import { EcosystemFinalization } from "./EcosystemFinalization";
import { OmegaFinal } from "./OmegaFinal";
import { EVALaunchPilot } from "./EVALaunchPilot";
import { EpicGramPublisher } from "./EpicGramPublisher";
import { EpicGramAgentBrain } from "./EpicGramAgentBrain";
import { EpicGramAgentOS } from "./EpicGramAgentOS";
import { GlobalAIOperatorSidebar } from "./GlobalAIOperatorSidebar";
import { SelfHostedAIStack } from "./SelfHostedAIStack";
import { WebAppCatalogPanel } from "./WebAppCatalogPanel";
import { LanguageSwitcher } from "./LanguageSwitcher";

type Slot = {
  slotId?: string;
  displayName?: string;
  username?: string | null;
  phoneMasked?: string | null;
  status?: string;
  authorizationState?: string | null;
  active?: boolean;
};
type Counts = { d: number; c: number; g: number; u: number };
type Agent = {
  id: string;
  name: string;
  role: string;
  status: string;
  readiness: number;
  deviceId?: string | null;
  voice?: string;
  model?: string;
  memory?: boolean;
  integrations?: string[];
  tags?: string[];
  state?: string;
  currentGoal?: string;
  currentTask?: string;
  lastAction?: string;
  owner?: string;

  shortMem?: string[];
  longMem?: string[];
  knowledge?: string[];
  activity?: { t: string; action: string; result?: string }[];
  nextGoal?: string;
  goalPriority?: string;
  goalDeadline?: string;
  goalStatus?: string;
  tasks?: BrainTask[];
};
type BrainTask = { id: string; title: string; description?: string; priority?: string; status: string; createdAt?: string; updatedAt?: string };

const AGENT_STATES = ["ACTIVE", "IDLE", "THINKING", "WORKING", "WAITING", "OFFLINE", "ERROR"];
const TASK_STATES = ["PENDING", "RUNNING", "WAITING", "COMPLETED", "FAILED"];
type Device = { id: string; name: string; type: string; status: string; notes?: string };

const ROLES = ["HOST", "OPERATOR", "CONTENT CREATOR", "MODERATOR", "SUPPORT", "SALES", "CUSTOM"];
const LS = "epic_agent_registry_v2";

const SEED_AGENTS: Agent[] = [
  {
    id: "epicstar", name: "EPIC☠STAR", role: "OPERATOR", owner: "buchmanchik", status: "ACTIVE", readiness: 88, deviceId: "winvps",
    voice: "ElevenLabs", model: "Claude Sonnet 4", memory: true, integrations: ["OpenRouter", "ComfyUI", "FaceFusion"], tags: ["core", "brain"],
    state: "ACTIVE", currentGoal: "Оркестрация экосистемы DEEPINSIDE", currentTask: "Мониторинг сессий и реестра", lastAction: "Обновил Agent Registry",
    nextGoal: "Подключить Agent Brain ко всем сущностям", goalPriority: "high", goalDeadline: "2026-06-25", goalStatus: "ACTIVE",
    shortMem: ["Проверить Telegram Registry", "Проверить Device Registry"],
    longMem: ["AI MUSIC PUBLIC привязан", "Windows VPS активен", "TDLib loadChats работает"],
    knowledge: ["Управляет Telegram Runtime", "Управляет Device Registry", "Работает через TDLib", "Контролирует AI MUSIC PUBLIC", "Работает на Windows VPS"],
    activity: [{ t: "18:12", action: "Переключил аккаунт" }, { t: "18:15", action: "Проверил Device Registry" }, { t: "18:21", action: "Обновил Agent Health" }],
    tasks: [
      { id: "t1", title: "Проверить сессии TDLib", status: "RUNNING", priority: "high", createdAt: "2026-06-19" },
      { id: "t2", title: "Синхронизировать реестр", status: "COMPLETED", priority: "med", createdAt: "2026-06-19" },
      { id: "t3", title: "Авторизация 2-го аккаунта", status: "PENDING", priority: "med", createdAt: "2026-06-19" }
    ]
  },
  {
    id: "buch", name: "BUCH ☠️", role: "HOST", owner: "buchmanchik", status: "ACTIVE", readiness: 80, deviceId: "geelark-01",
    voice: "RVC / XTTS", model: "GPT-4o-mini", memory: true, integrations: ["Grok Imagine"], tags: ["host", "male"],
    state: "WORKING", currentGoal: "Вести эфир ТРИ ПЯТНАДЦАТЬ", currentTask: "Подготовка скетча", lastAction: "Faceswap клипа",
    nextGoal: "Записать выпуск", goalPriority: "high", goalStatus: "ACTIVE",
    shortMem: ["Доснять скетч SHEF"], longMem: ["Geelark-01 закреплён", "Голос RVC настроен"],
    knowledge: ["Ведущий мужского эфира", "Лицо через FaceFusion"],
    activity: [{ t: "17:40", action: "Faceswap клипа" }],
    tasks: [{ id: "b1", title: "Скетч SHEF", status: "RUNNING", priority: "high" }]
  },
  {
    id: "buchiha", name: "BUCHIHA 😇", role: "HOST", owner: "buchmanchik", status: "TRAINING", readiness: 60, deviceId: "geelark-02",
    voice: "ElevenLabs", model: "GPT-4o-mini", memory: true, integrations: ["LivePortrait"], tags: ["host", "female"],
    state: "THINKING", currentGoal: "Закрепить консистентность лица", currentTask: "Тренировка LoRA", lastAction: "InstantID прогон",
    nextGoal: "Финал аватара", goalPriority: "med", goalStatus: "PLANNED",
    shortMem: ["Проверить качество лица"], longMem: ["Geelark-02 в резерве"],
    knowledge: ["Ведущая женского эфира", "LivePortrait для мимики"],
    activity: [{ t: "16:30", action: "InstantID прогон" }],
    tasks: [{ id: "bh1", title: "Train LoRA BUCHIHA", status: "RUNNING", priority: "med" }]
  },
  {
    id: "eva", name: "EVA NOVIKOVA", role: "CONTENT CREATOR", owner: "buchmanchik", status: "PLANNED", readiness: 25, deviceId: null,
    voice: "ElevenLabs", model: "Claude / GPT", memory: false, integrations: [], tags: ["streamer"],
    state: "OFFLINE", currentGoal: "—", currentTask: "—", lastAction: "—",
    nextGoal: "Создать профиль", goalPriority: "low", goalStatus: "PLANNED",
    shortMem: [], longMem: [], knowledge: ["Контент-стример (план)"], activity: [], tasks: []
  },
  {
    id: "censored", name: "CENSORED", role: "MODERATOR", owner: "buchmanchik", status: "IDLE", readiness: 40, deviceId: "emu",
    voice: "—", model: "GPT-4o-mini", memory: true, integrations: ["faster-whisper"], tags: ["moderation"],
    state: "IDLE", currentGoal: "Авто-цензура мата", currentTask: "Ожидание клипов", lastAction: "Запикал 8 клипов",
    nextGoal: "Подключить к пайплайну /live", goalPriority: "med", goalStatus: "PLANNED",
    shortMem: ["Проверить очередь клипов"], longMem: ["Чёрный список матов загружен"],
    knowledge: ["Цензурирует аудио (whisper+ffmpeg)", "Работает по очереди"],
    activity: [{ t: "15:05", action: "Запикал клип", result: "ok" }],
    tasks: [{ id: "c1", title: "Очередь цензуры", status: "WAITING", priority: "low" }]
  },
  {
    id: "django", name: "DJANGO", role: "AUTOMATION", owner: "buchmanchik", status: "IDLE", readiness: 35, deviceId: "ubuntu",
    voice: "—", model: "ollama qwen2.5", memory: true, integrations: ["n8n"], tags: ["automation"],
    state: "WAITING", currentGoal: "Оркестрация автопостинга (план)", currentTask: "Ожидание апрува", lastAction: "—",
    nextGoal: "Собрать пайплайн контента", goalPriority: "med", goalStatus: "BLOCKED",
    shortMem: ["Ждёт схему пайплайна"], longMem: ["Ubuntu VPS зарезервирован"],
    knowledge: ["Автоматизация задач", "n8n-оркестрация (план)"],
    activity: [], tasks: [{ id: "d1", title: "Схема автопостинга", status: "PENDING", priority: "med" }]
  },
  {
    id: "aimusic", name: "AI MUSIC PUBLIC", role: "CONTENT CREATOR", owner: "buchmanchik", status: "ACTIVE", readiness: 70, deviceId: "localpc",
    voice: "—", model: "—", memory: true, integrations: [], tags: ["telegram", "public"],
    state: "ACTIVE", currentGoal: "Публичный канал/аккаунт", currentTask: "Активная сессия TDLib", lastAction: "Авторизован",
    nextGoal: "Наполнить контентом", goalPriority: "med", goalStatus: "ACTIVE",
    shortMem: ["Загрузить диалоги"], longMem: ["Реальная TDLib-сессия", "Привязан к EPIC STAR"],
    knowledge: ["Авторизованный Telegram-аккаунт", "Источник реальных диалогов"],
    activity: [{ t: "16:03", action: "Авторизация", result: "ready" }],
    tasks: []
  }
];
const SEED_DEVICES: Device[] = [
  { id: "geelark-01", name: "Geelark-01", type: "Geelark Cloud Phone", status: "ONLINE", notes: "cloud phone #1" },
  { id: "geelark-02", name: "Geelark-02", type: "Geelark Cloud Phone", status: "RESERVED", notes: "cloud phone #2" },
  { id: "winvps", name: "Windows VPS", type: "Windows VPS", status: "ONLINE", notes: "Contabo" },
  { id: "localpc", name: "Local PC", type: "Local PC", status: "ONLINE", notes: "RTX 5060" },
  { id: "ubuntu", name: "Ubuntu VPS", type: "Ubuntu VPS", status: "UNKNOWN", notes: "" },
  { id: "android", name: "Android Local", type: "Android", status: "OFFLINE", notes: "" },
  { id: "emu", name: "Emulator", type: "Emulator", status: "OFFLINE", notes: "" }
];

function ready(slot: Slot) {
  return slot.status === "ready" || slot.authorizationState === "authorizationStateReady";
}
function sid(slot: Slot) {
  return slot.slotId || "";
}
function initial(n: string) {
  const t = (n || "?").replace(/[^A-Za-zА-Яа-я0-9]/g, "").trim();
  return (t[0] || "?").toUpperCase();
}
function color(seed: string) {
  const p = ["bg-rose-600", "bg-orange-600", "bg-amber-600", "bg-emerald-600", "bg-teal-600", "bg-sky-600", "bg-indigo-600", "bg-fuchsia-600"];
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return p[h % p.length];
}
const STATUS_CLR: Record<string, string> = {
  ACTIVE: "bg-emerald-500/16 text-emerald-400",
  IDLE: "bg-amber-500/16 text-amber-400",
  TRAINING: "bg-fuchsia-500/18 text-fuchsia-300",
  OFFLINE: "bg-rose-500/16 text-rose-400",
  PLANNED: "bg-white/10 text-tg-muted",
  ONLINE: "bg-emerald-500/16 text-emerald-400",
  RESERVED: "bg-amber-500/16 text-amber-400",
  UNKNOWN: "bg-white/10 text-tg-muted",
  WORKING: "bg-sky-500/16 text-sky-400",
  THINKING: "bg-fuchsia-500/18 text-fuchsia-300",
  WAITING: "bg-amber-500/16 text-amber-400",
  ERROR: "bg-rose-500/20 text-rose-400",
  DRAFT: "bg-white/10 text-tg-muted",
  PLANNING: "bg-sky-500/16 text-sky-400",
  WAITING_APPROVAL: "bg-amber-500/18 text-amber-300",
  APPROVED: "bg-emerald-500/16 text-emerald-400",
  RUNNING: "bg-sky-500/16 text-sky-400",
  COMPLETED: "bg-emerald-500/16 text-emerald-400",
  FAILED: "bg-rose-500/20 text-rose-400",
  CANCELLED: "bg-white/10 text-tg-muted",
  PENDING: "bg-white/10 text-tg-muted",
  READY: "bg-teal-500/18 text-teal-300"
};

type ExecTask = { id: string; title: string; description?: string; goalId?: string; missionId?: string; agentId: string; priority: string; status: string; createdAt: string; approvedAt?: string; startedAt?: string; completedAt?: string; expectedResult?: string; actualResult?: string; readiness: number };
const EXEC_STATES = ["DRAFT", "WAITING_APPROVAL", "APPROVED", "READY", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];
const LS_E = "epic_execution_v1";
const SEED_EXEC: ExecTask[] = [
  { id: "e1", title: "Аудит Telegram Runtime", description: "Прогнать проверки TDLib и свести counts", goalId: "d2", missionId: "m1", agentId: "epicstar", priority: "HIGH", status: "READY", createdAt: "2026-06-19", approvedAt: "2026-06-19", expectedResult: "Counts dialogs/channels/groups сведены, статус ready", readiness: 80 },
  { id: "e2", title: "Проверить Device Registry", description: "Сверить устройства и online-статусы", goalId: "q1", missionId: "m2", agentId: "epicstar", priority: "MEDIUM", status: "WAITING_APPROVAL", createdAt: "2026-06-19", expectedResult: "Список устройств подтверждён", readiness: 40 },
  { id: "e3", title: "Сгенерировать контент-план EVA", description: "Темы + расписание на неделю", goalId: "w1", missionId: "m3", agentId: "eva", priority: "MEDIUM", status: "DRAFT", createdAt: "2026-06-19", expectedResult: "Контент-план на 7 дней", readiness: 20 },
  { id: "e4", title: "Проверка инфраструктуры", description: "Пинг VPS, статус сервисов", goalId: "q1", missionId: "m4", agentId: "django", priority: "LOW", status: "APPROVED", createdAt: "2026-06-19", approvedAt: "2026-06-19", expectedResult: "Отчёт по инфраструктуре", readiness: 35 },
  { id: "e5", title: "Запикать новые клипы", description: "Авто-цензура очереди /live", agentId: "censored", priority: "MEDIUM", status: "RUNNING", createdAt: "2026-06-19", approvedAt: "2026-06-19", startedAt: "2026-06-19", expectedResult: "Клипы без мата", readiness: 60 }
];

type MissionStep = { title: string; description?: string; status: string };
type Mission = { id: string; title: string; description?: string; agentId: string; priority: string; status: string; createdAt: string; updatedAt: string; steps: MissionStep[]; result?: string };
const MISSION_STATES = ["DRAFT", "PLANNING", "WAITING_APPROVAL", "APPROVED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];
const SEED_MISSIONS: Mission[] = [
  { id: "m1", title: "Аудит Telegram Runtime", description: "Проверить TDLib, сессии, загрузку диалогов", agentId: "epicstar", priority: "high", status: "WAITING_APPROVAL", createdAt: "2026-06-19", updatedAt: "2026-06-19", steps: [{ title: "Проверить /telegram/status", status: "PENDING" }, { title: "Проверить loadChats", status: "PENDING" }, { title: "Свести counts", status: "PENDING" }] },
  { id: "m2", title: "Проверка Device Registry", description: "Сверить устройства и привязки", agentId: "epicstar", priority: "med", status: "DRAFT", createdAt: "2026-06-19", updatedAt: "2026-06-19", steps: [{ title: "Список устройств", status: "PENDING" }, { title: "Проверить online/offline", status: "PENDING" }] },
  { id: "m3", title: "Подготовить контент-план", description: "План публикаций EVA на неделю", agentId: "eva", priority: "med", status: "PLANNING", createdAt: "2026-06-19", updatedAt: "2026-06-19", steps: [{ title: "Темы", status: "PENDING" }, { title: "Расписание", status: "PENDING" }] },
  { id: "m4", title: "Проверка инфраструктуры", description: "VPS, сеть, сервисы", agentId: "django", priority: "low", status: "DRAFT", createdAt: "2026-06-19", updatedAt: "2026-06-19", steps: [{ title: "Пинг VPS", status: "PENDING" }, { title: "Статус сервисов", status: "PENDING" }] }
];
const LS_M = "epic_missions_v1";
const today = () => new Date().toISOString().slice(0, 10);

type StratGoal = { id: string; title: string; description?: string; horizon: "quarter" | "month" | "week" | "day"; priority: string; owner: string; deadline?: string; status: string; readiness: number; vision?: string; strategy?: string; risks?: string; recommendations?: string; updatedAt?: string };
const PRIORITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "BLOCKED"];
const PRIO_CLR: Record<string, string> = {
  CRITICAL: "bg-rose-500/20 text-rose-400",
  HIGH: "bg-orange-500/18 text-orange-300",
  MEDIUM: "bg-amber-500/16 text-amber-300",
  LOW: "bg-white/10 text-tg-muted",
  BLOCKED: "bg-fuchsia-500/18 text-fuchsia-300"
};
const LS_S = "epic_strategy_v1";
const SEED_STRATEGY: StratGoal[] = [
  { id: "q1", title: "Запустить автопилотную AI-экосистему DEEPINSIDE", horizon: "quarter", priority: "CRITICAL", owner: "EPIC☠STAR", deadline: "2026-09-30", status: "ACTIVE", readiness: 55, vision: "Каждая AI-сущность работает автономно: контент, эфир, модерация.", strategy: "Достроить runtime → brain → mission → approval, затем дать исполнение через подтверждение.", risks: "Зависимость от ручного approval; неполная авторизация аккаунтов.", recommendations: "Авторизовать 2-й аккаунт; закрыть Phase 8 миссии." },
  { id: "mo1", title: "Полноценный веб-клиент EPIC GRAM", horizon: "month", priority: "HIGH", owner: "EPIC☠STAR", deadline: "2026-07-15", status: "ACTIVE", readiness: 70, vision: "Боевой Telegram-клиент + реестр сущностей.", strategy: "QR/Phone/2FA готовы; добить counts и реестр.", risks: "Скрин-инструмент, нестабильный MCP.", recommendations: "Снять скрины, провести QA." },
  { id: "w1", title: "Аватары BUCH/BUCHIHA консистентны", horizon: "week", priority: "HIGH", owner: "BUCHIHA 😇", deadline: "2026-06-26", status: "ACTIVE", readiness: 45, vision: "Лицо персонажей не плывёт между кадрами.", strategy: "RealVisXL + FaceDetailer + InstantID + LoRA.", risks: "VRAM, качество лица.", recommendations: "Дотренировать LoRA BUCHIHA." },
  { id: "d1", title: "Свести оплаты и квитанции", horizon: "day", priority: "MEDIUM", owner: "EPIC☠STAR", deadline: today(), status: "COMPLETED", readiness: 100, vision: "Прозрачные расходы экосистемы.", strategy: "Console ОПЛАТЫ + квитанции в $.", risks: "—", recommendations: "Готово." },
  { id: "d2", title: "Завершить аудит Telegram Runtime", horizon: "day", priority: "HIGH", owner: "EPIC☠STAR", deadline: today(), status: "ACTIVE", readiness: 60, vision: "Уверенность в TDLib-слое.", strategy: "Mission «Аудит Telegram Runtime».", risks: "Только 1 чат у активного аккаунта.", recommendations: "Авторизовать аккаунт с реальными диалогами." }
];

export function AgentRegistry() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [activeId, setActiveId] = useState("");
  const [tdReady, setTdReady] = useState(false);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [agents, setAgents] = useState<Agent[]>(SEED_AGENTS);
  const [devices, setDevices] = useState<Device[]>(SEED_DEVICES);
  const [bind, setBind] = useState<Record<string, string>>({});
  const [sel, setSel] = useState("epicstar");
  const [tab, setTab] = useState<"director" | "command" | "operator" | "missions" | "execution" | "agents" | "devices" | "sessions">("director");
  const [strategy, setStrategy] = useState<StratGoal[]>(SEED_STRATEGY);
  const [selGoal, setSelGoal] = useState("q1");
  const [exec, setExec] = useState<ExecTask[]>(SEED_EXEC);
  const [selExec, setSelExec] = useState("e1");
  const [workspaceAgent, setWorkspaceAgent] = useState<string | null>(null);
  const [htmlCanvas, setHtmlCanvas] = useState(false);
  const [worldOpen, setWorldOpen] = useState(false);
  const [tgWs, setTgWs] = useState<{ slotId?: string; focusKind?: string; focusId?: string; command?: import("./TelegramWorkspace").OperatorCommand } | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [cooOpen, setCooOpen] = useState(false);
  const [opsOpen, setOpsOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaOpsOpen, setMediaOpsOpen] = useState(false);
  const [architectOpen, setArchitectOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [shellOpen, setShellOpen] = useState(false);
  const [provOpen, setProvOpen] = useState(false);
  const [runtimeOpen, setRuntimeOpen] = useState(false);
  const [mediaNetOpen, setMediaNetOpen] = useState(false);
  const [adFactoryOpen, setAdFactoryOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [agentOsOpen, setAgentOsOpen] = useState(false);
  const [ecoOpen, setEcoOpen] = useState(false);
  const [mfCanvasOpen, setMfCanvasOpen] = useState(false);
  const [mfOrchOpen, setMfOrchOpen] = useState(false);
  const [economyOpen, setEconomyOpen] = useState(false);
  const [worldEngineOpen, setWorldEngineOpen] = useState(false);
  const [activationOpen, setActivationOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [automationOpen, setAutomationOpen] = useState(false);
  const [launchOpsOpen, setLaunchOpsOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [humanFactoryOpen, setHumanFactoryOpen] = useState(false);
  const [androidLabOpen, setAndroidLabOpen] = useState(false);
  const [opsMatrixOpen, setOpsMatrixOpen] = useState(false);
  const [gateBuilderOpen, setGateBuilderOpen] = useState(false);
  const [dryRunOpen, setDryRunOpen] = useState(false);
  const [platformOsOpen, setPlatformOsOpen] = useState(false);
  const [worldCenterOpen, setWorldCenterOpen] = useState(false);
  const [ecosystemFinalOpen, setEcosystemFinalOpen] = useState(false);
  const [omegaOpen, setOmegaOpen] = useState(false);
  const [pilotOpen, setPilotOpen] = useState(false);
  const [publisherOpen, setPublisherOpen] = useState(false);
  const [brainOpen, setBrainOpen] = useState(false);
  const [epicOsOpen, setEpicOsOpen] = useState(false);
  const [osSection, setOsSection] = useState<string | undefined>(undefined);
  const [stackOpen, setStackOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  useEffect(() => { try { applyPrefs(); } catch {} }, []);

  useEffect(() => {
    try {
      const OS_KEYS = ["command", "operator", "livepilot", "livewizard", "runbook", "dryrun", "postlive", "liveprep", "targets", "ownedaccounts", "opanalytics"];
      const h = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
      if (OS_KEYS.indexOf(h) >= 0) { setOsSection(h); setEpicOsOpen(true); }
      const onNav = (e: any) => { const k = e && e.detail; if (OS_KEYS.indexOf(k) >= 0) { setOsSection(k); setEpicOsOpen(true); } };
      window.addEventListener("deepinside:navigate", onNav);
      // AI Operator natural-language command forwarding: opens/keeps the Telegram workspace and
      // lets it execute the intent (open chat list / private filter / open by name). UI-only.
      const onOpCmd = (e: any) => {
        const command = e && e.detail;
        if (!command || !command.reqId) return;
        setTgWs((prev) => (prev ? { ...prev, command } : { command }));
      };
      window.addEventListener("deepinside:operator-command", onOpCmd);
      return () => { window.removeEventListener("deepinside:navigate", onNav); window.removeEventListener("deepinside:operator-command", onOpCmd); };
    } catch {}
  }, []);
  const [opFilter, setOpFilter] = useState<"all" | "ACTIVE" | "IDLE" | "OFFLINE">("all");
  const [missions, setMissions] = useState<Mission[]>(SEED_MISSIONS);
  const [selMission, setSelMission] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const r = localStorage.getItem(LS);
      if (r) {
        const d = JSON.parse(r);
        if (d.agents?.length) {
          const persisted = d.agents as Agent[];
          const merged: Agent[] = SEED_AGENTS.map((seed) => {
            const p = persisted.find((a) => a.id === seed.id);
            if (!p) return seed;
            return {
              ...seed,
              ...p,

              state: p.state ?? seed.state,
              currentGoal: p.currentGoal ?? seed.currentGoal,
              currentTask: p.currentTask ?? seed.currentTask,
              lastAction: p.lastAction ?? seed.lastAction,
              nextGoal: p.nextGoal ?? seed.nextGoal,
              goalPriority: p.goalPriority ?? seed.goalPriority,
              goalDeadline: p.goalDeadline ?? seed.goalDeadline,
              goalStatus: p.goalStatus ?? seed.goalStatus,
              shortMem: p.shortMem ?? seed.shortMem,
              longMem: p.longMem ?? seed.longMem,
              knowledge: p.knowledge ?? seed.knowledge,
              activity: p.activity ?? seed.activity,
              tasks: p.tasks ?? seed.tasks,
              owner: p.owner ?? seed.owner
            };
          });

          for (const p of persisted) if (!SEED_AGENTS.find((s) => s.id === p.id)) merged.push(p);
          setAgents(merged);
        }
        if (d.devices?.length) setDevices(d.devices);
        if (d.bind) setBind(d.bind);
      }
      const rm = localStorage.getItem(LS_M);
      if (rm) {
        const m = JSON.parse(rm);
        if (Array.isArray(m) && m.length) setMissions(m);
      }
      const rs = localStorage.getItem(LS_S);
      if (rs) {
        const sg = JSON.parse(rs);
        if (Array.isArray(sg) && sg.length) setStrategy(sg);
      }
      const re = localStorage.getItem(LS_E);
      if (re) {
        const ex = JSON.parse(re);
        if (Array.isArray(ex) && ex.length) setExec(ex);
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS, JSON.stringify({ agents, devices, bind }));
    } catch {}
  }, [agents, devices, bind, loaded]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_M, JSON.stringify(missions));
    } catch {}
  }, [missions, loaded]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_S, JSON.stringify(strategy));
    } catch {}
  }, [strategy, loaded]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(LS_E, JSON.stringify(exec));
    } catch {}
  }, [exec, loaded]);

  async function refresh() {
    try {
      const s = await fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json());
      const accs: Slot[] = s.accounts || [];
      setSlots(accs);
      const act = s.activeAccountId || "";
      setActiveId(act);
      setTdReady(accs.some(ready));
      if (act) {
        const cj = await fetch("/api/telegram/chats?accountId=" + encodeURIComponent(act), { cache: "no-store" }).then((r) => r.json());
        const list: any[] = cj.chats || (cj.body && cj.body.chats) || [];
        const c: Counts = {
          d: list.length,
          c: list.filter((x) => x.category === "channel" || x.isChannel).length,
          g: list.filter((x) => x.category === "group").length,
          u: list.reduce((a, x) => a + (x.unreadCount || 0), 0)
        };
        setCounts((p) => ({ ...p, [act]: c }));
      }
    } catch {}
  }
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, []);

  const agentSession = useMemo(() => {
    const m: Record<string, Slot> = {};
    for (const [sessionId, agentId] of Object.entries(bind)) {
      const slot = slots.find((s) => sid(s) === sessionId);
      if (slot) m[agentId] = slot;
    }
    return m;
  }, [bind, slots]);

  const deviceById = (id?: string | null) => devices.find((d) => d.id === id);
  const agentCounts = (a: Agent): Counts | null => {
    const slot = agentSession[a.id];
    if (slot && counts[sid(slot)]) return counts[sid(slot)];
    return null;
  };

  const health = useMemo(() => {
    const active = agents.filter((a) => a.status === "ACTIVE").length;
    const idle = agents.filter((a) => a.status === "IDLE" || a.status === "TRAINING").length;
    const offline = agents.filter((a) => a.status === "OFFLINE" || a.status === "PLANNED").length;
    const boundSessions = Object.keys(bind).length;
    const boundDevices = new Set(agents.filter((a) => a.deviceId).map((a) => a.deviceId)).size;
    const rd = Math.round(agents.reduce((s, a) => s + (a.readiness || 0), 0) / (agents.length || 1));
    const allTasks = agents.flatMap((a) => a.tasks || []);
    const tasksRunning = allTasks.filter((t) => t.status === "RUNNING").length;
    const tasksWaiting = allTasks.filter((t) => t.status === "WAITING" || t.status === "PENDING").length;
    const tasksCompleted = allTasks.filter((t) => t.status === "COMPLETED").length;
    const goalsActive = agents.filter((a) => a.goalStatus === "ACTIVE").length;
    const memoryUsage = agents.reduce((s, a) => s + (a.shortMem?.length || 0) + (a.longMem?.length || 0) + (a.knowledge?.length || 0), 0);
    return { active, idle, offline, boundSessions, boundDevices, rd, tasksRunning, tasksWaiting, tasksCompleted, goalsActive, memoryUsage };
  }, [agents, bind]);

  function setBindSession(sessionId: string, agentId: string) {
    setBind((b) => {
      const n = { ...b };
      if (!agentId) delete n[sessionId];
      else n[sessionId] = agentId;
      return n;
    });
  }
  function setAgentDevice(agentId: string, deviceId: string) {
    setAgents((as) => as.map((a) => (a.id === agentId ? { ...a, deviceId: deviceId || null } : a)));
  }
  function setAgentField(agentId: string, field: keyof Agent, value: string) {
    setAgents((as) => as.map((a) => (a.id === agentId ? { ...a, [field]: value } : a)));
  }
  function editAgentText(agentId: string, field: "currentGoal" | "currentTask" | "lastAction", label: string, current?: string) {
    if (typeof window === "undefined") return;
    const v = window.prompt(label, current || "");
    if (v !== null) setAgentField(agentId, field, v);
  }

  function patchMission(id: string, patch: Partial<Mission>) {
    setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch, updatedAt: today() } : m)));
  }
  function runMission(id: string) {
    setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, status: "RUNNING", updatedAt: today(), steps: m.steps.map((s, i) => ({ ...s, status: i === 0 ? "RUNNING" : s.status })) } : m)));
  }
  function completeMission(id: string) {
    const m = missions.find((x) => x.id === id);
    setMissions((ms) => ms.map((x) => (x.id === id ? { ...x, status: "COMPLETED", updatedAt: today(), steps: x.steps.map((s) => ({ ...s, status: "COMPLETED" })), result: x.result || ("Готово: " + x.title) } : x)));
    if (m) {
      const now = new Date().toTimeString().slice(0, 5);
      setAgents((as) => as.map((a) => (a.id === m.agentId ? {
        ...a,
        longMem: [...(a.longMem || []), "Миссия выполнена: " + m.title],
        knowledge: [...(a.knowledge || []), "Выполнил миссию: " + m.title],
        activity: [...(a.activity || []), { t: now, action: "Завершил миссию: " + m.title, result: "COMPLETED" }]
      } : a)));
    }
  }
  function createMission() {
    if (typeof window === "undefined") return;
    const title = window.prompt("Название миссии:");
    if (!title) return;
    const aid = window.prompt("ID агента (epicstar / buch / buchiha / eva / censored / django / aimusic):", "epicstar") || "epicstar";
    const id = "m_" + Date.now().toString(36);
    setMissions((ms) => [...ms, { id, title, description: "", agentId: aid, priority: "med", status: "DRAFT", createdAt: today(), updatedAt: today(), steps: [{ title: "Шаг 1", status: "PENDING" }] }]);
    setSelMission(id);
  }

  const mhealth = useMemo(() => {
    const by = (s: string) => missions.filter((m) => m.status === s).length;
    return { draft: by("DRAFT"), pending: by("WAITING_APPROVAL"), running: by("RUNNING"), completed: by("COMPLETED"), failed: by("FAILED") };
  }, [missions]);
  const agentName = (id: string) => agents.find((a) => a.id === id)?.name || id;
  const agentMissions = (id: string) => missions.filter((m) => m.agentId === id);
  const timeline = useMemo(() => {
    const ev: { t: string; text: string }[] = [];
    for (const a of agents) for (const ac of a.activity || []) ev.push({ t: ac.t || "", text: `${a.name}: ${ac.action}${ac.result ? " · " + ac.result : ""}` });
    for (const m of missions) ev.push({ t: m.updatedAt || "", text: `Mission «${m.title}» → ${m.status}` });
    return ev.sort((a, b) => (a.t < b.t ? 1 : -1)).slice(0, 12);
  }, [agents, missions]);
  const knowledgeItems = useMemo(() => agents.reduce((s, a) => s + (a.knowledge?.length || 0), 0), [agents]);
  const devicesOnline = devices.filter((d) => d.status === "ONLINE").length;
  const scores = useMemo(() => {
    const cl = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
    const total = missions.length || 1;
    const agentScore = cl(agents.reduce((s, a) => s + (a.readiness || 0), 0) / (agents.length || 1));
    const missionScore = cl((missions.filter((m) => m.status === "COMPLETED").length + missions.filter((m) => ["RUNNING", "APPROVED"].includes(m.status)).length * 0.5) / total * 100);
    const deviceScore = cl((devicesOnline / (devices.length || 1)) * 100);
    const readySess = slots.filter(ready).length;
    const telegramScore = cl(slots.length ? (readySess / slots.length) * 100 : (tdReady ? 100 : 0));
    const approvalScore = cl(100 - missions.filter((m) => m.status === "WAITING_APPROVAL").length * 15);
    const infraScore = cl((deviceScore + telegramScore) / 2);
    const contentAgents = agents.filter((a) => /CONTENT|HOST/.test(a.role));
    const contentScore = cl(contentAgents.reduce((s, a) => s + (a.readiness || 0), 0) / (contentAgents.length || 1));
    const ecosystem = cl((agentScore + missionScore + deviceScore + telegramScore + approvalScore + infraScore + contentScore) / 7);
    return { agentScore, missionScore, deviceScore, telegramScore, approvalScore, infraScore, contentScore, ecosystem };
  }, [agents, missions, devices, slots, devicesOnline, tdReady]);
  const riskLevel = scores.ecosystem >= 70 ? "LOW" : scores.ecosystem >= 50 ? "MEDIUM" : "HIGH";
  const recommendations = useMemo(() => {
    const r: string[] = [];
    missions.filter((m) => m.status === "WAITING_APPROVAL").forEach((m) => r.push("Требуется approval: «" + m.title + "»"));
    missions.filter((m) => m.status === "RUNNING").forEach((m) => r.push("Завершить миссию: «" + m.title + "»"));
    agents.filter((a) => a.state === "OFFLINE").forEach((a) => r.push("Агент " + a.name + " офлайн"));
    missions.filter((m) => m.status === "FAILED").forEach((m) => r.push("Миссия провалена: «" + m.title + "» — разобрать"));
    devices.filter((d) => d.status === "OFFLINE").forEach((d) => r.push("Устройство " + d.name + " офлайн"));
    if (scores.ecosystem < 50) r.push("Readiness экосистемы ниже 50% — поднять приоритетные цели");
    if (slots.filter(ready).length <= 1) r.push("Авторизовать ещё аккаунт для реальных диалогов");
    return r.length ? r.slice(0, 8) : ["Критичных проблем нет — продолжать по плану"];
  }, [agents, missions, devices, slots, scores]);
  const selStrat = strategy.find((g) => g.id === selGoal) || strategy[0];

  function patchExec(id: string, patch: Partial<ExecTask>) { setExec((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e))); }
  function completeExec(id: string) {
    const e = exec.find((x) => x.id === id);
    patchExec(id, { status: "COMPLETED", completedAt: today(), actualResult: (e && e.actualResult) || (e && e.expectedResult) || "Готово" });
    if (e) {
      const now = new Date().toTimeString().slice(0, 5);
      setAgents((as) => as.map((a) => (a.id === e.agentId ? { ...a, activity: [...(a.activity || []), { t: now, action: "Выполнил задачу: " + e.title, result: "COMPLETED" }], longMem: [...(a.longMem || []), "Задача выполнена: " + e.title] } : a)));
    }
  }
  function createExec() {
    if (typeof window === "undefined") return;
    const title = window.prompt("Название задачи исполнения:");
    if (!title) return;
    const aid = window.prompt("agentId (epicstar/buch/buchiha/eva/censored/django/aimusic):", "epicstar") || "epicstar";
    const id = "ex_" + Date.now().toString(36);
    setExec((es) => [...es, { id, title, agentId: aid, priority: "MEDIUM", status: "DRAFT", createdAt: today(), readiness: 10, expectedResult: "" }]);
    setSelExec(id);
  }
  const ehealth = useMemo(() => {
    const by = (s: string) => exec.filter((e) => e.status === s).length;
    const completed = by("COMPLETED"), failed = by("FAILED");
    const sr = completed + failed ? Math.round((completed / (completed + failed)) * 100) : 0;
    const agUtil = Math.round((new Set(exec.filter((e) => ["READY", "RUNNING", "APPROVED"].includes(e.status)).map((e) => e.agentId)).size / (agents.length || 1)) * 100);
    const sessUtil = Math.round((new Set(exec.filter((e) => agentSession[e.agentId]).map((e) => e.agentId)).size / (slots.length || 1)) * 100);
    const devUtil = Math.round((new Set(exec.map((e) => agents.find((a) => a.id === e.agentId)?.deviceId).filter(Boolean)).size / (devices.length || 1)) * 100);
    const rd = Math.round(exec.reduce((s, e) => s + (e.readiness || 0), 0) / (exec.length || 1));
    return { total: exec.length, waiting: by("WAITING_APPROVAL"), approved: by("APPROVED") + by("READY"), running: by("RUNNING"), completed, failed, sr, agUtil, sessUtil, devUtil, rd };
  }, [exec, agents, slots, devices]);
  const execTimeline = useMemo(() => {
    const ev: { t: string; text: string }[] = [];
    for (const e of exec) {
      if (e.createdAt) ev.push({ t: e.createdAt, text: "Task создан: " + e.title });
      if (e.approvedAt) ev.push({ t: e.approvedAt, text: "Approval: " + e.title });
      if (e.startedAt) ev.push({ t: e.startedAt, text: "Старт: " + e.title });
      if (e.completedAt) ev.push({ t: e.completedAt, text: (e.status === "FAILED" ? "Провал: " : "Завершено: ") + e.title });
    }
    return ev.slice(-12).reverse();
  }, [exec]);
  const analytics = useMemo(() => {
    const cnt: Record<string, number> = {};
    exec.forEach((e) => { cnt[e.agentId] = (cnt[e.agentId] || 0) + 1; });
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
    return { mostActiveAgent: top ? agentName(top[0]) : "—", load: Math.round((exec.filter((e) => ["RUNNING", "READY"].includes(e.status)).length / (exec.length || 1)) * 100) };
  }, [exec, agents]);
  const execRecs = useMemo(() => {
    const r: string[] = [];
    exec.filter((e) => e.status === "WAITING_APPROVAL").forEach((e) => r.push("Готово к approval: «" + e.title + "»"));
    exec.filter((e) => e.status === "RUNNING").forEach((e) => r.push("Завершить: «" + e.title + "»"));
    exec.filter((e) => !agentSession[e.agentId]).forEach((e) => r.push("Нет сессии у агента задачи «" + e.title + "»"));
    agents.filter((a) => a.state === "OFFLINE" && exec.some((e) => e.agentId === a.id)).forEach((a) => r.push("Агент " + a.name + " офлайн — задачи ждут"));
    devices.filter((d) => d.status === "OFFLINE").forEach((d) => r.push("Устройство " + d.name + " офлайн"));
    return r.length ? r.slice(0, 8) : ["Готово к работе — критичных проблем нет"];
  }, [exec, agents, devices]);
  const selE = exec.find((e) => e.id === selExec) || exec[0];

  const selAgent = agents.find((a) => a.id === sel) || agents[0];
  const HEALTH = [
    ["Agents Active", health.active, "text-emerald-400"],
    ["Agents Idle", health.idle, "text-amber-400"],
    ["Agents Offline", health.offline, "text-rose-400"],
    ["Bound Sessions", health.boundSessions, "text-fuchsia-300"],
    ["Bound Devices", health.boundDevices, "text-sky-300"],
    ["Tasks Running", health.tasksRunning, "text-sky-400"],
    ["Tasks Waiting", health.tasksWaiting, "text-amber-400"],
    ["Tasks Done", health.tasksCompleted, "text-emerald-400"],
    ["Goals Active", health.goalsActive, "text-fuchsia-300"],
    ["Memory Items", health.memoryUsage, "text-sky-300"],
    ["Readiness", health.rd + "%", "text-emerald-400"]
  ] as const;

  return (
    <div className="mx-auto max-w-6xl p-4 text-tg-text">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="text-xl font-black tracking-wide">AI<span className="text-sky-300">☠</span>AGENTS REGISTRY</div>
        <div className="ml-auto flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-tg-line bg-tg-panel px-3 py-1">Web <b className={tdReady ? "text-emerald-400" : "text-tg-muted"}>{tdReady ? "ONLINE" : "OFFLINE"}</b></span>
          <span className="rounded-full border border-tg-line bg-tg-panel px-3 py-1">API <b className="text-emerald-400">CONNECTED</b></span>
          <span className="rounded-full border border-tg-line bg-tg-panel px-3 py-1">TDLib <b className={tdReady ? "text-emerald-400" : "text-amber-400"}>{tdReady ? "READY" : "NOT READY"}</b></span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {HEALTH.map(([l, v, c]) => (
          <div key={l} className="rounded-xl border border-tg-line bg-tg-panel p-3">
            <div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div>
            <div className={`mt-1 text-2xl font-extrabold ${c}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["director", "command", "operator", "missions", "execution", "agents", "devices", "sessions"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm ${tab === t ? "bg-tg-active text-white" : "bg-tg-panel text-tg-muted hover:text-white"}`}>
            {t === "director" ? "🎯 EXECUTIVE DIRECTOR" : t === "command" ? "🛰 COMMAND CENTER" : t === "operator" ? "🧠 AI OPERATOR" : t === "missions" ? "🚀 MISSION CONTROL" : t === "execution" ? "⚙ EXECUTION" : t === "agents" ? "AGENTS" : t === "devices" ? "DEVICES" : "TELEGRAM SESSIONS"}
          </button>
        ))}
        <button onClick={() => setShellOpen(true)} className="ml-auto rounded-full border border-cyan-400/50 bg-gradient-to-r from-cyan-600/30 to-fuchsia-600/30 px-4 py-2 text-sm font-bold text-white hover:from-cyan-600/40">🖥 EPIC OS</button>
        <button onClick={() => setArchitectOpen(true)} className="rounded-full border border-violet-500/50 bg-gradient-to-r from-violet-600/30 to-cyan-600/30 px-4 py-2 text-sm font-bold text-white hover:from-violet-600/40">🏛 EPIC ARCHITECT</button>
        <button onClick={() => setMediaOpsOpen(true)} className="rounded-full border border-fuchsia-500/40 bg-fuchsia-600/20 px-4 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-600/30">🎬 Media Ops</button>
        <button onClick={() => setDeviceOpen(true)} className="rounded-full border border-cyan-500/40 bg-cyan-600/20 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-600/30">📱 Devices</button>
        <button onClick={() => setProvOpen(true)} className="rounded-full border border-teal-500/40 bg-teal-600/20 px-4 py-2 text-sm font-semibold text-teal-200 hover:bg-teal-600/30">🧰 Provisioning</button>
        <button onClick={() => setRuntimeOpen(true)} className="rounded-full border border-emerald-500/40 bg-emerald-600/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-600/30">🚀 Runtime</button>
        <button onClick={() => setMediaNetOpen(true)} className="rounded-full border border-rose-500/40 bg-rose-600/20 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-600/30">🎙 Media Net</button>
        <button onClick={() => setAdFactoryOpen(true)} className="rounded-full border border-amber-500/40 bg-amber-600/20 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-600/30">📢 Ad Factory</button>
        <button onClick={() => setSocialOpen(true)} className="rounded-full border border-emerald-500/40 bg-emerald-600/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-600/30">🌍 Social Empire</button>
        <button onClick={() => setAgentOsOpen(true)} className="rounded-full border border-cyan-500/40 bg-cyan-600/20 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-600/30">🤖 Agent OS</button>
        <button onClick={() => setEcoOpen(true)} className="rounded-full border border-violet-500/40 bg-violet-600/20 px-4 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-600/30">🧬 Ecosystem Bus</button>
        <button onClick={() => setMfCanvasOpen(true)} className="rounded-full border border-pink-500/40 bg-pink-600/20 px-4 py-2 text-sm font-semibold text-pink-200 hover:bg-pink-600/30">🏭 Медиазавод</button>
        <button onClick={() => setMfOrchOpen(true)} className="rounded-full border border-rose-500/40 bg-rose-600/20 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-600/30">🎬 Оркестрация</button>
        <button onClick={() => setEconomyOpen(true)} className="rounded-full border border-amber-500/40 bg-amber-600/20 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-600/30">💰 Economy Engine</button>
        <button onClick={() => setWorldEngineOpen(true)} className="rounded-full border border-fuchsia-500/40 bg-fuchsia-600/20 px-4 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-600/30">🌍 World Engine</button>
        <a href="/world" className="rounded-full border border-cyan-400/50 bg-gradient-to-r from-cyan-600/25 to-indigo-600/25 px-4 py-2 text-sm font-black text-cyan-100 hover:from-cyan-600/40">🌐 WORLD OS</a>
        <button onClick={() => setActivationOpen(true)} className="rounded-full border border-red-500/40 bg-red-600/20 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-600/30">🚀 Activation Engine</button>
        <button onClick={() => setStrategyOpen(true)} className="rounded-full border border-indigo-500/40 bg-indigo-600/20 px-4 py-2 text-sm font-semibold text-indigo-200 hover:bg-indigo-600/30">🎯 Mission Control</button>
        <button onClick={() => setKnowledgeOpen(true)} className="rounded-full border border-cyan-500/40 bg-cyan-600/20 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-600/30">📚 Knowledge Engine</button>
        <button onClick={() => setAutomationOpen(true)} className="rounded-full border border-yellow-500/40 bg-yellow-600/20 px-4 py-2 text-sm font-semibold text-yellow-200 hover:bg-yellow-600/30">⚡ Automation Fabric</button>
        <button onClick={() => setLaunchOpsOpen(true)} className="rounded-full border border-orange-500/40 bg-orange-600/20 px-4 py-2 text-sm font-semibold text-orange-200 hover:bg-orange-600/30">🖥 Operations Center</button>
        <button onClick={() => setIdentityOpen(true)} className="rounded-full border border-teal-500/40 bg-teal-600/20 px-4 py-2 text-sm font-semibold text-teal-200 hover:bg-teal-600/30">🪪 Identity Infra</button>
        <button onClick={() => setHumanFactoryOpen(true)} className="rounded-full border border-fuchsia-500/40 bg-fuchsia-600/20 px-4 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-600/30">🧬 Digital Human Factory</button>
        <button onClick={() => setAndroidLabOpen(true)} className="rounded-full border border-lime-500/40 bg-lime-600/20 px-4 py-2 text-sm font-semibold text-lime-200 hover:bg-lime-600/30">🤖 Android Lab</button>
        <button onClick={() => setOpsMatrixOpen(true)} className="rounded-full border border-sky-500/40 bg-sky-600/20 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-600/30">🧭 Assignments</button>
        <button onClick={() => setGateBuilderOpen(true)} className="rounded-full border border-orange-500/40 bg-orange-600/20 px-4 py-2 text-sm font-semibold text-orange-200 hover:bg-orange-600/30">🛂 Runtime Gate</button>
        <button onClick={() => setDryRunOpen(true)} className="rounded-full border border-teal-500/40 bg-teal-600/20 px-4 py-2 text-sm font-semibold text-teal-200 hover:bg-teal-600/30">🧪 Dry Run</button>
        <button onClick={() => setPlatformOsOpen(true)} className="rounded-full border border-violet-500/50 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 px-4 py-2 text-sm font-black text-violet-100 hover:from-violet-600/40 hover:to-fuchsia-600/40">🪐 Platform OS</button>
        <button onClick={() => setWorldCenterOpen(true)} className="rounded-full border border-fuchsia-500/50 bg-gradient-to-r from-fuchsia-600/30 to-cyan-600/30 px-4 py-2 text-sm font-black text-fuchsia-100 hover:from-fuchsia-600/40 hover:to-cyan-600/40">🌌 World Universe</button>
        <button onClick={() => setEcosystemFinalOpen(true)} className="rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/25 via-fuchsia-600/25 to-cyan-600/25 px-4 py-2 text-sm font-black text-amber-100 hover:from-amber-500/40">🌠 Ecosystem v1.0</button>
        <button onClick={() => setOmegaOpen(true)} className="rounded-full border border-fuchsia-400/50 bg-gradient-to-r from-fuchsia-600/30 via-violet-600/25 to-cyan-600/25 px-4 py-2 text-sm font-black text-fuchsia-100 hover:from-fuchsia-600/45">♾ Ω Final</button>
        <button onClick={() => setPilotOpen(true)} className="rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/25 to-fuchsia-600/25 px-4 py-2 text-sm font-black text-amber-100 hover:from-amber-500/40">🚀 EVA Pilot</button>
        <button onClick={() => setPublisherOpen(true)} className="rounded-full border border-fuchsia-400/50 bg-gradient-to-r from-fuchsia-600/30 to-emerald-600/25 px-4 py-2 text-sm font-black text-fuchsia-100 hover:from-fuchsia-600/45">📣 Publisher</button>
        <button onClick={() => setBrainOpen(true)} className="rounded-full border border-indigo-400/50 bg-gradient-to-r from-indigo-600/30 to-fuchsia-600/25 px-4 py-2 text-sm font-black text-indigo-100 hover:from-indigo-600/45">🧠 Agent Brain</button>
        <button onClick={() => { setOsSection(undefined); setEpicOsOpen(true); }} className="rounded-full border border-cyan-400/50 bg-gradient-to-r from-cyan-600/30 to-fuchsia-600/25 px-4 py-2 text-sm font-black text-cyan-100 hover:from-cyan-600/45">🛰 DEEPINSIDE OS</button>
        <button onClick={() => { setOsSection("liveprep"); setEpicOsOpen(true); }} className="rounded-full border border-emerald-400/50 bg-gradient-to-r from-emerald-600/30 to-amber-600/25 px-4 py-2 text-sm font-black text-emerald-100 hover:from-emerald-600/45">🚦 Live Prep</button>
        <button onClick={() => setStackOpen(true)} className="rounded-full border border-cyan-400/50 bg-gradient-to-r from-cyan-600/30 to-emerald-600/25 px-4 py-2 text-sm font-black text-cyan-100 hover:from-cyan-600/45">🧬 AI Stack</button>
        <button onClick={() => setCatalogOpen(true)} className="rounded-full border border-sky-400/50 bg-gradient-to-r from-sky-600/30 to-indigo-600/25 px-4 py-2 text-sm font-black text-sky-100 hover:from-sky-600/45">🧠 AI COMMAND CENTER</button>
        <LanguageSwitcher />
        <button onClick={() => setMediaOpen(true)} className="rounded-full border border-rose-500/40 bg-rose-600/20 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-600/30">🏭 Media Factory</button>
        <button onClick={() => setOpsOpen(true)} className="rounded-full border border-teal-500/40 bg-teal-600/20 px-4 py-2 text-sm font-semibold text-teal-200 hover:bg-teal-600/30">🛰 Ops Center</button>
        <button onClick={() => setCooOpen(true)} className="rounded-full border border-emerald-500/40 bg-emerald-600/20 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-600/30">🤖 AI COO</button>
        <button onClick={() => setGuideOpen(true)} className="rounded-full border border-violet-500/40 bg-violet-600/20 px-4 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-600/30">🧭 Guide</button>
        <button onClick={() => setTgWs({})} className="rounded-full border border-sky-500/40 bg-sky-600/20 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-600/30">📨 Telegram</button>
        <button onClick={() => setWorldOpen(true)} className="rounded-full border border-cyan-500/40 bg-cyan-600/20 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-600/30">🌐 WORLD</button>
        <button onClick={() => setHtmlCanvas(true)} className="rounded-full border border-fuchsia-500/40 bg-fuchsia-600/20 px-4 py-2 text-sm font-semibold text-fuchsia-200 hover:bg-fuchsia-600/30">🧠 HTML Canvas</button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          {tab === "execution" && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Execution Health</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {([["Total", ehealth.total, "text-tg-text"], ["Waiting", ehealth.waiting, "text-amber-300"], ["Approved", ehealth.approved, "text-teal-300"], ["Running", ehealth.running, "text-sky-400"], ["Completed", ehealth.completed, "text-emerald-400"], ["Failed", ehealth.failed, "text-rose-400"], ["Success Rate", ehealth.sr + "%", "text-emerald-400"], ["Agent Util", ehealth.agUtil + "%", "text-fuchsia-300"], ["Session Util", ehealth.sessUtil + "%", "text-sky-300"], ["Device Util", ehealth.devUtil + "%", "text-sky-300"], ["Readiness", ehealth.rd + "%", "text-emerald-400"]] as const).map(([l, v, c]) => (
                    <div key={l} className="rounded-xl border border-tg-line bg-tg-panel p-2.5"><div className="text-[9px] uppercase tracking-wide text-tg-muted">{l}</div><div className={`mt-1 text-lg font-extrabold ${c}`}>{v}</div></div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Execution Queue</div>
                <button onClick={createExec} className="ml-auto rounded-full bg-tg-active px-3 py-1.5 text-xs text-white">+ Задача</button>
              </div>
              <div className="space-y-2">
                {exec.map((e) => {
                  const slot = agentSession[e.agentId];
                  const dev = deviceById(agents.find((a) => a.id === e.agentId)?.deviceId);
                  return (
                    <div key={e.id} onClick={() => setSelExec(e.id)} className={`cursor-pointer rounded-xl border bg-tg-panel p-3 ${selExec === e.id ? "border-tg-accent" : "border-tg-line hover:border-tg-accent/60"}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${PRIO_CLR[e.priority] || ""}`}>{e.priority}</span>
                        <span className="font-semibold">{e.title}</span>
                        <span className="text-[11px] text-tg-muted">· {agentName(e.agentId)}{slot ? " · " + (slot.displayName || sid(slot)) : ""}{dev ? " · " + dev.name : ""}</span>
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLR[e.status] || ""}`}>{e.status}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2" onClick={(ev) => ev.stopPropagation()}>
                        {e.status === "DRAFT" && <button onClick={() => patchExec(e.id, { status: "WAITING_APPROVAL" })} className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] text-white">→ На апрув</button>}
                        {e.status === "WAITING_APPROVAL" && <button onClick={() => patchExec(e.id, { status: "APPROVED", approvedAt: today() })} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] text-white">✓ Approve</button>}
                        {e.status === "WAITING_APPROVAL" && <button onClick={() => patchExec(e.id, { status: "CANCELLED" })} className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] text-white">✖ Reject</button>}
                        {e.status === "APPROVED" && <button onClick={() => patchExec(e.id, { status: "READY" })} className="rounded-lg bg-teal-600 px-2.5 py-1 text-[11px] text-white">→ Ready</button>}
                        {e.status === "READY" && <button onClick={() => patchExec(e.id, { status: "RUNNING", startedAt: today() })} className="rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] text-white">▶ Run</button>}
                        {e.status === "RUNNING" && <button onClick={() => completeExec(e.id)} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] text-white">✓ Завершить</button>}
                        {e.status === "RUNNING" && <button onClick={() => patchExec(e.id, { status: "FAILED", completedAt: today() })} className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] text-white">✖ Провалить</button>}
                        {["COMPLETED", "FAILED", "CANCELLED"].includes(e.status) && <span className="text-[11px] text-tg-muted">завершена</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Execution Map · Goal ↓ Mission ↓ Task ↓ Agent ↓ Session ↓ Device</div>
                <div className="space-y-1.5">
                  {exec.map((e) => {
                    const g = strategy.find((x) => x.id === e.goalId);
                    const m = missions.find((x) => x.id === e.missionId);
                    const slot = agentSession[e.agentId];
                    const dev = deviceById(agents.find((a) => a.id === e.agentId)?.deviceId);
                    const chip = "rounded-lg bg-tg-bg px-2 py-1";
                    return (
                      <div key={e.id} className="flex flex-wrap items-center gap-1.5 rounded-xl border border-tg-line bg-tg-panel p-2 text-[11px]">
                        <span className={chip}>{g ? g.title.slice(0, 18) : "— goal"}</span><span className="text-tg-muted">↓</span>
                        <span className={chip}>{m ? m.title.slice(0, 18) : "— mission"}</span><span className="text-tg-muted">↓</span>
                        <button onClick={() => setSelExec(e.id)} className={`${chip} font-semibold hover:text-white`}>{e.title.slice(0, 18)}</button><span className="text-tg-muted">↓</span>
                        <button onClick={() => { setSel(e.agentId); setTab("agents"); }} className={`${chip} hover:text-white`}>{agentName(e.agentId)}</button><span className="text-tg-muted">↓</span>
                        <span className={chip}>{slot ? (slot.displayName || sid(slot)).slice(0, 14) : "— session"}</span><span className="text-tg-muted">↓</span>
                        <span className={chip}>{dev ? dev.name : "— device"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-tg-line bg-tg-panel p-3">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Global Execution Timeline</div>
                  <div className="space-y-1">{execTimeline.length ? execTimeline.map((e, i) => (<div key={i} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs"><b className="text-tg-text">{e.t}</b> <span className="text-tg-muted">— {e.text}</span></div>)) : <div className="text-xs text-tg-muted">Событий нет.</div>}</div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-tg-line bg-tg-panel p-3">
                    <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Execution Analytics</div>
                    <div className="space-y-1 text-xs text-tg-muted">
                      <div>Most Active Agent: <b className="text-tg-text">{analytics.mostActiveAgent}</b></div>
                      <div>Success Rate: <b className="text-emerald-400">{ehealth.sr}%</b> · Failure: <b className="text-rose-400">{ehealth.total ? Math.round((ehealth.failed / ehealth.total) * 100) : 0}%</b></div>
                      <div>System Load: <b className="text-sky-400">{analytics.load}%</b></div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-tg-line bg-tg-panel p-3">
                    <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Recommendations · read-only</div>
                    <div className="space-y-1">{execRecs.map((r, i) => (<div key={i} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs">💡 {r}</div>))}</div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-tg-muted">⚙ Execution Orchestrator — управляемое исполнение через approval-flow. Каждый переход — только по кнопке оператора; без авто-исполнения, реальных Telegram-действий, рассылок, воркеров и cron. Завершение пишет результат в Brain агента.</div>
            </div>
          )}

          {tab === "director" && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Ecosystem Health · Scores</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {([
                    ["Ecosystem", scores.ecosystem], ["Agent", scores.agentScore], ["Mission", scores.missionScore], ["Infrastructure", scores.infraScore],
                    ["Telegram", scores.telegramScore], ["Content", scores.contentScore], ["Device", scores.deviceScore], ["Approval", scores.approvalScore]
                  ] as const).map(([l, v]) => (
                    <div key={l} className="rounded-xl border border-tg-line bg-tg-panel p-2.5">
                      <div className="text-[9px] uppercase tracking-wide text-tg-muted">{l}</div>
                      <div className={`mt-1 text-xl font-extrabold ${v >= 70 ? "text-emerald-400" : v >= 50 ? "text-amber-300" : "text-rose-400"}`}>{v}%</div>
                      <div className="mt-1 h-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-rose-500 to-fuchsia-500" style={{ width: v + "%" }} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-tg-line bg-tg-panel p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-tg-muted">Current Ecosystem Goal</div>
                    <div className="text-lg font-bold">{strategy.find((g) => g.horizon === "quarter")?.title || "—"}</div>
                  </div>
                  <span className={`ml-auto rounded-full px-3 py-1 text-xs font-bold ${riskLevel === "LOW" ? "bg-emerald-500/16 text-emerald-400" : riskLevel === "MEDIUM" ? "bg-amber-500/16 text-amber-300" : "bg-rose-500/20 text-rose-400"}`}>RISK: {riskLevel}</span>
                  <div className="text-right"><div className="text-[10px] uppercase tracking-wide text-tg-muted">Overall Readiness</div><div className={`text-2xl font-extrabold ${scores.ecosystem >= 70 ? "text-emerald-400" : scores.ecosystem >= 50 ? "text-amber-300" : "text-rose-400"}`}>{scores.ecosystem}%</div></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                  {([["Active Missions", mhealth.running], ["Pending Approvals", mhealth.pending], ["Active Agents", health.active], ["Online Devices", devicesOnline], ["TG Sessions", slots.length]] as const).map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-tg-bg px-3 py-2"><span className="text-tg-muted">{l}: </span><b className="text-tg-text">{v}</b></div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-tg-muted">Current Focus: <b className="text-tg-text">{strategy.find((g) => g.priority === "CRITICAL" && g.status === "ACTIVE")?.title || strategy.find((g) => g.status === "ACTIVE")?.title || "—"}</b></div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-tg-line bg-tg-panel p-3">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Recommended Actions · read-only</div>
                  <div className="space-y-1">{recommendations.map((r, i) => (<div key={i} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs">💡 {r}</div>))}</div>
                </div>
                <div className="rounded-2xl border border-tg-line bg-tg-panel p-3">
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Strategic Timeline</div>
                  <div className="space-y-1 text-xs">
                    <div className="rounded-lg bg-tg-bg px-2.5 py-1.5">✅ Completed: <b className="text-emerald-400">{missions.filter((m) => m.status === "COMPLETED").length}</b> · 🔵 In Progress: <b className="text-sky-400">{missions.filter((m) => ["RUNNING", "APPROVED"].includes(m.status)).length}</b></div>
                    <div className="rounded-lg bg-tg-bg px-2.5 py-1.5">🟡 Planned: <b className="text-amber-300">{missions.filter((m) => ["DRAFT", "PLANNING", "WAITING_APPROVAL"].includes(m.status)).length}</b> · 🟣 Blocked: <b className="text-fuchsia-300">{strategy.filter((g) => g.priority === "BLOCKED" || g.status === "BLOCKED").length}</b></div>
                    {timeline.slice(0, 4).map((e, i) => (<div key={i} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-tg-muted"><b className="text-tg-text">{e.t || "—"}</b> — {e.text}</div>))}
                    <div className="rounded-lg bg-tg-bg px-2.5 py-1.5">▶ Recommended Next: <b className="text-tg-text">{recommendations[0]}</b></div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Strategic Goals</div>
                {(["quarter", "month", "week", "day"] as const).map((h) => {
                  const list = strategy.filter((g) => g.horizon === h);
                  if (!list.length) return null;
                  const label = h === "quarter" ? "Quarter" : h === "month" ? "Monthly" : h === "week" ? "Weekly" : "Daily";
                  return (
                    <div key={h} className="mb-2">
                      <div className="mb-1 text-[11px] font-semibold text-tg-muted">{label} Goals</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {list.map((g) => (
                          <div key={g.id} onClick={() => setSelGoal(g.id)} className={`cursor-pointer rounded-xl border bg-tg-panel p-2.5 ${selGoal === g.id ? "border-tg-accent" : "border-tg-line hover:border-tg-accent/60"}`}>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${PRIO_CLR[g.priority] || ""}`}>{g.priority}</span>
                              <span className="truncate text-sm font-semibold">{g.title}</span>
                              <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_CLR[g.status] || "bg-white/10 text-tg-muted"}`}>{g.status}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-tg-muted">
                              <span>{g.owner}</span>{g.deadline && <span>· {g.deadline}</span>}
                              <span className="ml-auto">{g.readiness}%</span>
                            </div>
                            <div className="mt-1 h-1 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-rose-500 to-fuchsia-500" style={{ width: g.readiness + "%" }} /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[11px] text-tg-muted">🎯 Executive AI Director — стратегический intelligence-слой поверх экосистемы. Только аналитика, скоринг и read-only рекомендации; без авто-исполнения, действий, воркеров и cron. Тап по цели → Director Inspector справа.</div>
            </div>
          )}

          {tab === "command" && (
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Ecosystem Health</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {([
                    ["Agents Active", health.active, "text-emerald-400"], ["Agents Idle", health.idle, "text-amber-400"], ["Agents Offline", health.offline, "text-rose-400"],
                    ["Missions Running", mhealth.running, "text-sky-400"], ["Missions Waiting", mhealth.pending, "text-amber-300"], ["Missions Done", mhealth.completed, "text-emerald-400"],
                    ["Pending Approvals", mhealth.pending, "text-amber-300"], ["TG Sessions", slots.length, "text-fuchsia-300"], ["Devices Online", devicesOnline, "text-emerald-400"],
                    ["Memory Items", health.memoryUsage, "text-sky-300"], ["Readiness", health.rd + "%", "text-emerald-400"]
                  ] as const).map(([l, v, c]) => (
                    <div key={l} className="rounded-xl border border-tg-line bg-tg-panel p-2.5">
                      <div className="text-[9px] uppercase tracking-wide text-tg-muted">{l}</div>
                      <div className={`mt-1 text-xl font-extrabold ${c}`}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Live Summary</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
                  {([
                    ["Total Agents", agents.length], ["Total Devices", devices.length], ["Total Sessions", slots.length], ["Total Missions", missions.length],
                    ["Running Tasks", health.tasksRunning], ["Completed Tasks", health.tasksCompleted], ["Knowledge Items", knowledgeItems], ["Memory Usage", health.memoryUsage]
                  ] as const).map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-tg-bg px-3 py-2"><span className="text-tg-muted">{l}: </span><b className="text-tg-text">{v}</b></div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Ecosystem Map · Device ↓ Session ↓ Agent ↓ Mission</div>
                <div className="space-y-2">
                  {agents.filter((a) => a.deviceId || agentSession[a.id] || agentMissions(a.id).length).map((a) => {
                    const dev = deviceById(a.deviceId);
                    const slot = agentSession[a.id];
                    const mis = agentMissions(a.id);
                    return (
                      <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-tg-line bg-tg-panel p-2.5 text-xs">
                        <span className="rounded-lg bg-tg-bg px-2 py-1">{dev ? dev.name : "— device"}</span>
                        <span className="text-tg-muted">↓</span>
                        <span className="rounded-lg bg-tg-bg px-2 py-1">{slot ? (slot.displayName || sid(slot)) : "— session"}</span>
                        <span className="text-tg-muted">↓</span>
                        <button onClick={() => setSel(a.id)} className={`rounded-lg px-2 py-1 font-semibold ${sel === a.id ? "bg-tg-active text-white" : "bg-tg-bg hover:text-white"}`}>{a.name}</button>
                        <span className="text-tg-muted">↓</span>
                        {mis.length ? mis.slice(0, 2).map((m) => (
                          <button key={m.id} onClick={() => { setSelMission(m.id); setTab("missions"); }} className="rounded-lg bg-tg-bg px-2 py-1 hover:text-white">
                            {m.title} <span className={`ml-1 rounded-full px-1.5 text-[9px] font-bold ${STATUS_CLR[m.status] || ""}`}>{m.status}</span>
                          </button>
                        )) : <span className="rounded-lg bg-tg-bg px-2 py-1 text-tg-muted">— mission</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Timeline</div>
                  <div className="space-y-1">
                    {timeline.length ? timeline.map((e, i) => (
                      <div key={i} className="rounded-lg bg-tg-bg px-2.5 py-1.5 text-xs"><b className="text-tg-text">{e.t || "—"}</b> <span className="text-tg-muted">— {e.text}</span></div>
                    )) : <div className="text-xs text-tg-muted">Событий пока нет.</div>}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Approval Center</div>
                  <div className="space-y-1 text-xs">
                    <div className="rounded-lg bg-tg-bg px-2.5 py-1.5">Pending: <b className="text-amber-300">{missions.filter((m) => m.status === "WAITING_APPROVAL").length}</b> · Approved: <b className="text-emerald-400">{missions.filter((m) => m.status === "APPROVED").length}</b> · Rejected: <b className="text-rose-400">{missions.filter((m) => m.status === "CANCELLED").length}</b></div>
                    <div className="rounded-lg bg-tg-bg px-2.5 py-1.5">Running: <b className="text-sky-400">{mhealth.running}</b> · Completed: <b className="text-emerald-400">{mhealth.completed}</b> · Failed: <b className="text-rose-400">{mhealth.failed}</b></div>
                    <button onClick={() => setTab("missions")} className="mt-1 rounded-lg bg-tg-active px-3 py-1.5 text-xs text-white">Открыть Mission Control →</button>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-tg-muted">🛰 Unified Command Center — единый обзор экосистемы поверх Agent/Mission/Device/Telegram/Brain. Только чтение + навигация; без авто-исполнения, рассылок и воркеров. Тап по агенту → Global Inspector справа; по миссии → Mission Control.</div>
            </div>
          )}

          {tab === "missions" && (
            <div>
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[["Draft", mhealth.draft, "text-tg-muted"], ["Pending", mhealth.pending, "text-amber-300"], ["Running", mhealth.running, "text-sky-400"], ["Completed", mhealth.completed, "text-emerald-400"], ["Failed", mhealth.failed, "text-rose-400"]].map(([l, v, c]) => (
                  <div key={String(l)} className="rounded-xl border border-tg-line bg-tg-panel p-2.5 text-center">
                    <div className={`text-xl font-extrabold ${c}`}>{v as number}</div>
                    <div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div>
                  </div>
                ))}
              </div>

              <div className="mb-3 flex items-center gap-2">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-tg-accent">Approval Center</div>
                <button onClick={createMission} className="ml-auto rounded-full bg-tg-active px-3 py-1.5 text-xs text-white">+ Новая миссия</button>
              </div>
              <div className="space-y-2">
                {missions.filter((m) => m.status === "WAITING_APPROVAL").length === 0 && (<div className="rounded-xl bg-tg-bg p-3 text-xs text-tg-muted">Нет миссий на подтверждении.</div>)}
                {missions.filter((m) => m.status === "WAITING_APPROVAL").map((m) => (
                  <div key={m.id} className="rounded-xl border border-amber-500/30 bg-tg-panel p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{m.title}</span>
                      <span className="text-[11px] text-tg-muted">· {agentName(m.agentId)} · {m.priority}</span>
                      <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/18 text-amber-300">WAITING_APPROVAL</span>
                    </div>
                    <div className="mt-1 text-xs text-tg-muted">{m.description}</div>
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => patchMission(m.id, { status: "APPROVED" })} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">✓ Approve</button>
                      <button onClick={() => patchMission(m.id, { status: "CANCELLED" })} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">✖ Reject</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-2 mt-4 text-xs font-black uppercase tracking-[0.18em] text-tg-accent">All Missions</div>
              <div className="space-y-2">
                {missions.map((m) => (
                  <div key={m.id} onClick={() => setSelMission(m.id)} className={`cursor-pointer rounded-xl border bg-tg-panel p-3 ${selMission === m.id ? "border-tg-accent" : "border-tg-line hover:border-tg-accent/60"}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{m.title}</span>
                      <span className="text-[11px] text-tg-muted">· {agentName(m.agentId)} · {m.priority}</span>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLR[m.status] || ""}`}>{m.status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      {m.status === "DRAFT" && <button onClick={() => patchMission(m.id, { status: "PLANNING" })} className="rounded-lg bg-tg-bg px-2.5 py-1 text-[11px] text-white ring-1 ring-tg-line">→ Plan</button>}
                      {m.status === "PLANNING" && <button onClick={() => patchMission(m.id, { status: "WAITING_APPROVAL" })} className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] text-white">→ На апрув</button>}
                      {m.status === "APPROVED" && <button onClick={() => runMission(m.id)} className="rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] text-white">▶ Запустить</button>}
                      {m.status === "RUNNING" && <button onClick={() => completeMission(m.id)} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] text-white">✓ Завершить</button>}
                      {m.status === "RUNNING" && <button onClick={() => patchMission(m.id, { status: "FAILED" })} className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] text-white">✖ Провалить</button>}
                      {(m.status === "COMPLETED" || m.status === "FAILED" || m.status === "CANCELLED") && <span className="text-[11px] text-tg-muted">завершена</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-tg-muted">⚠ Approval-only: миссии не выполняют действий в Telegram, без авто-исполнения, рассылок и воркеров. Завершение пишет результат в Brain агента (Long-Term Memory · Activity · Knowledge).</div>
            </div>
          )}

          {tab === "operator" && (
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                {(["all", "ACTIVE", "IDLE", "OFFLINE"] as const).map((f) => (
                  <button key={f} onClick={() => setOpFilter(f)} className={`rounded-full px-3 py-1.5 text-xs ${opFilter === f ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>
                    {f === "all" ? "Все" : f}
                  </button>
                ))}
                <span className="ml-auto self-center text-[11px] text-tg-muted">⚠ Runtime-слой: без авто-действий, отправки и автопостинга.</span>
              </div>
              <div className="overflow-auto rounded-2xl border border-tg-line bg-tg-panel">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left uppercase tracking-wide text-tg-accent">
                      <th className="p-2.5">Agent</th><th className="p-2.5">Role</th><th className="p-2.5">Telegram</th><th className="p-2.5">Device</th><th className="p-2.5">Voice</th><th className="p-2.5">Model</th><th className="p-2.5">Mem</th><th className="p-2.5">Current Goal</th><th className="p-2.5">Current Task</th><th className="p-2.5">Last Action</th><th className="p-2.5">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents
                      .filter((a) => {
                        const s = a.state || "OFFLINE";
                        if (opFilter === "all") return true;
                        if (opFilter === "ACTIVE") return ["ACTIVE", "WORKING", "THINKING"].includes(s);
                        if (opFilter === "IDLE") return ["IDLE", "WAITING"].includes(s);
                        return ["OFFLINE", "ERROR"].includes(s);
                      })
                      .map((a) => {
                        const slot = agentSession[a.id];
                        const dev = deviceById(a.deviceId);
                        return (
                          <tr key={a.id} onClick={() => setSel(a.id)} onDoubleClick={() => setWorkspaceAgent(a.id)} className="cursor-pointer border-t border-tg-line hover:bg-tg-bg/40">
                            <td className="p-2.5 font-semibold">{a.name}</td>
                            <td className="p-2.5 text-tg-muted">{a.role}</td>
                            <td className="p-2.5">{slot ? (slot.displayName || sid(slot)) : "—"}</td>
                            <td className="p-2.5">{dev ? dev.name : "—"}</td>
                            <td className="p-2.5 text-tg-muted">{a.voice || "—"}</td>
                            <td className="p-2.5 text-tg-muted">{a.model || "—"}</td>
                            <td className="p-2.5">{a.memory ? "✅" : "—"}</td>
                            <td className="p-2.5 max-w-[160px] truncate" title={a.currentGoal} onClick={(e) => { e.stopPropagation(); editAgentText(a.id, "currentGoal", "Цель агента:", a.currentGoal); }}>{a.currentGoal || "—"}</td>
                            <td className="p-2.5 max-w-[160px] truncate" title={a.currentTask} onClick={(e) => { e.stopPropagation(); editAgentText(a.id, "currentTask", "Текущая задача:", a.currentTask); }}>{a.currentTask || "—"}</td>
                            <td className="p-2.5 max-w-[140px] truncate text-tg-muted" title={a.lastAction}>{a.lastAction || "—"}</td>
                            <td className="p-2.5">
                              <select value={a.state || "OFFLINE"} onClick={(e) => e.stopPropagation()} onChange={(e) => setAgentField(a.id, "state", e.target.value)} className={`rounded-full px-2 py-1 text-[10px] font-bold outline-none ${STATUS_CLR[a.state || "OFFLINE"] || ""}`}>
                                {AGENT_STATES.map((s) => (<option key={s} value={s} className="bg-tg-panel text-white">{s}</option>))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "agents" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {agents.map((a) => {
                const slot = agentSession[a.id];
                const cc = agentCounts(a);
                const dev = deviceById(a.deviceId);
                return (
                  <div key={a.id} onClick={() => setSel(a.id)} onDoubleClick={() => setWorkspaceAgent(a.id)} title="Двойной клик — открыть Workspace" className={`cursor-pointer rounded-2xl border bg-tg-panel p-4 transition ${sel === a.id ? "border-tg-accent" : "border-tg-line hover:border-tg-accent/60"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`grid h-11 w-11 place-items-center rounded-full font-bold text-white ${color(a.id)}`}>{initial(a.name)}</div>
                      <div className="min-w-0">
                        <div className="truncate font-bold">{a.name}</div>
                        <div className="text-[11px] uppercase tracking-wide text-tg-accent">{a.role}</div>
                      </div>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLR[a.status] || ""}`}>{a.status}</span>
                    </div>
                    <div className="mt-3 text-xs leading-6 text-tg-muted">
                      <div>Telegram: <b className="text-tg-text">{slot ? (slot.displayName || sid(slot)) : "— не привязан"}</b></div>
                      <div>Device: <b className="text-tg-text">{dev ? dev.name : "—"}</b></div>
                      <div>Dialogs <b className="text-tg-text">{cc ? cc.d : "—"}</b> · Channels <b className="text-tg-text">{cc ? cc.c : "—"}</b> · Groups <b className="text-tg-text">{cc ? cc.g : "—"}</b></div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-rose-500 to-fuchsia-500" style={{ width: a.readiness + "%" }} /></div>
                    <div className="mt-1 text-[11px] text-tg-muted">Readiness {a.readiness}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "devices" && (
            <div className="overflow-auto rounded-2xl border border-tg-line bg-tg-panel">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-tg-accent">
                    <th className="p-3">Device</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Linked Agent</th><th className="p-3">Session</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => {
                    const ag = agents.find((a) => a.deviceId === d.id);
                    const slot = ag ? agentSession[ag.id] : undefined;
                    return (
                      <tr key={d.id} className="border-t border-tg-line">
                        <td className="p-3 font-semibold">{d.name}</td>
                        <td className="p-3 text-tg-muted">{d.type}</td>
                        <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLR[d.status] || ""}`}>{d.status}</span></td>
                        <td className="p-3">{ag ? ag.name : "—"}</td>
                        <td className="p-3 text-tg-muted">{slot ? (slot.displayName || sid(slot)) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "sessions" && (
            <div className="overflow-auto rounded-2xl border border-tg-line bg-tg-panel">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-tg-accent">
                    <th className="p-3">Account</th><th className="p-3">User</th><th className="p-3">Phone</th><th className="p-3">Status</th><th className="p-3">Dlg</th><th className="p-3">Ch</th><th className="p-3">Grp</th><th className="p-3">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.length === 0 && (<tr><td colSpan={8} className="p-4 text-center text-tg-muted">Нет сессий — авторизуй аккаунт в клиенте.</td></tr>)}
                  {slots.map((s) => {
                    const id = sid(s);
                    const cc = counts[id];
                    const isActive = id === activeId || s.active;
                    return (
                      <tr key={id || s.displayName} className="border-t border-tg-line">
                        <td className="p-3 font-semibold">{s.displayName || id}{isActive && <span className="ml-2 rounded-full bg-emerald-500/16 px-1.5 text-[9px] text-emerald-400">ACTIVE</span>}</td>
                        <td className="p-3 text-tg-muted">{s.username || "—"}</td>
                        <td className="p-3 text-tg-muted">{s.phoneMasked || "—"}</td>
                        <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ready(s) ? STATUS_CLR.ACTIVE : STATUS_CLR.OFFLINE}`}>{ready(s) ? "ACTIVE" : "LOGIN"}</span></td>
                        <td className="p-3">{cc ? cc.d : "—"}</td>
                        <td className="p-3">{cc ? cc.c : "—"}</td>
                        <td className="p-3">{cc ? cc.g : "—"}</td>
                        <td className="p-3">
                          <select value={bind[id] || ""} onChange={(e) => setBindSession(id, e.target.value)} className="rounded-lg bg-tg-bg px-2 py-1 text-xs text-white outline-none ring-1 ring-tg-line">
                            <option value="">— не привязан —</option>
                            {agents.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Inspector: Director goal / Mission / Brain */}
        <aside className="max-h-[80vh] overflow-auto rounded-2xl border border-tg-line bg-tg-panel p-4">
          {tab === "execution" ? (
            (() => {
              const e = selE;
              if (!e) return <div className="text-tg-muted">Выбери задачу.</div>;
              const m = missions.find((x) => x.id === e.missionId);
              const g = strategy.find((x) => x.id === e.goalId);
              const slot = agentSession[e.agentId];
              const dev = deviceById(agents.find((a) => a.id === e.agentId)?.deviceId);
              const sec = "mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent";
              const canRun = ["READY", "APPROVED"].includes(e.status);
              return (
                <div>
                  <div className="text-lg font-bold leading-tight">{e.title}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIO_CLR[e.priority] || ""}`}>{e.priority}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLR[e.status] || ""}`}>{e.status}</span>
                    <span className="ml-auto text-xs text-tg-muted">{e.readiness}%</span>
                  </div>
                  <div className={sec}>Execution Preview</div>
                  <div className="mt-1 rounded-lg bg-tg-bg p-2 text-[11px] leading-6 text-tg-muted">
                    <div>Что: <b className="text-tg-text">{e.description || e.title}</b></div>
                    <div>Agent: <b className="text-tg-text">{agentName(e.agentId)}</b></div>
                    <div>Session: <b className="text-tg-text">{slot ? (slot.displayName || sid(slot)) : "—"}</b></div>
                    <div>Device: <b className="text-tg-text">{dev ? dev.name : "—"}</b></div>
                    <div>Mission: <b className="text-tg-text">{m ? m.title : "—"}</b> · Goal: <b className="text-tg-text">{g ? g.title : "—"}</b></div>
                    <div>Expected: <b className="text-tg-text">{e.expectedResult || "—"}</b></div>
                    <div className="mt-1 text-tg-accent">{canRun ? "Готово к запуску (по кнопке оператора)." : "Запуск недоступен в этом статусе."}</div>
                  </div>
                  <div className={sec}>Timeline</div>
                  <div className="mt-1 space-y-1 text-xs text-tg-muted">
                    <div>Created: <b className="text-tg-text">{e.createdAt || "—"}</b></div>
                    <div>Approved: <b className="text-tg-text">{e.approvedAt || "—"}</b></div>
                    <div>Started: <b className="text-tg-text">{e.startedAt || "—"}</b></div>
                    <div>Completed: <b className="text-tg-text">{e.completedAt || "—"}</b></div>
                  </div>
                  <div className={sec}>Dependencies</div>
                  <div className="mt-1 text-[11px] text-tg-muted">Mission «{m ? m.title : "—"}» · Agent · Session · Device · Approval</div>
                  <div className={sec}>Result</div>
                  <div className="mt-1 text-xs text-tg-text">Expected: {e.expectedResult || "—"}<br />Actual: {e.actualResult || "—"}</div>
                </div>
              );
            })()
          ) : tab === "director" ? (
            (() => {
              const g = selStrat;
              if (!g) return <div className="text-tg-muted">Выбери стратегическую цель.</div>;
              const sec = "mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent";
              return (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-tg-muted">{g.horizon} goal</div>
                  <div className="text-lg font-bold leading-tight">{g.title}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIO_CLR[g.priority] || ""}`}>{g.priority}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLR[g.status] || "bg-white/10 text-tg-muted"}`}>{g.status}</span>
                    <span className="ml-auto text-xs text-tg-muted">{g.readiness}%</span>
                  </div>
                  <div className={sec}>Vision</div>
                  <div className="mt-1 text-xs text-tg-text">{g.vision || "—"}</div>
                  <div className={sec}>Strategy</div>
                  <div className="mt-1 text-xs text-tg-text">{g.strategy || "—"}</div>
                  <div className={sec}>Risks</div>
                  <div className="mt-1 text-xs text-tg-text">{g.risks || "—"}</div>
                  <div className={sec}>Recommendations</div>
                  <div className="mt-1 text-xs text-tg-text">{g.recommendations || "—"}</div>
                  <div className={sec}>Dependencies</div>
                  <div className="mt-1 text-[11px] text-tg-muted">Runtime · Agents · Missions · Approvals · Devices</div>
                  <div className={sec}>Owner / Status</div>
                  <div className="mt-1 space-y-1 text-xs text-tg-muted"><div>Owner: <b className="text-tg-text">{g.owner}</b></div><div>Deadline: <b className="text-tg-text">{g.deadline || "—"}</b></div><div>Readiness: <b className="text-tg-text">{g.readiness}%</b></div><div>Last update: <b className="text-tg-text">{g.updatedAt || g.deadline || "—"}</b></div></div>
                </div>
              );
            })()
          ) : tab === "missions" ? (
            (() => {
              const m = missions.find((x) => x.id === selMission);
              if (!m) return <div className="text-tg-muted">Выбери миссию.</div>;
              const sec = "mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent";
              return (
                <div>
                  <div className="text-lg font-bold leading-tight">{m.title}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLR[m.status] || ""}`}>{m.status}</span>
                  <div className={sec}>Mission</div>
                  <div className="mt-1 space-y-1 text-xs text-tg-muted">
                    <div>Agent: <b className="text-tg-text">{agentName(m.agentId)}</b></div>
                    <div>Priority: <b className="text-tg-text">{m.priority}</b></div>
                    <div>{m.description || "—"}</div>
                  </div>
                  <div className={sec}>Steps</div>
                  <div className="mt-1 space-y-1">
                    {m.steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-tg-bg px-2 py-1 text-xs">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_CLR[s.status] || ""}`}>{s.status}</span>
                        <span className="truncate">{s.title}</span>
                      </div>
                    ))}
                  </div>
                  <div className={sec}>Approval Status</div>
                  <div className="mt-1 text-xs"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.status === "WAITING_APPROVAL" ? "bg-amber-500/18 text-amber-300" : (["APPROVED", "RUNNING", "COMPLETED"].includes(m.status) ? "bg-emerald-500/16 text-emerald-400" : "bg-white/10 text-tg-muted")}`}>{m.status === "WAITING_APPROVAL" ? "PENDING" : (["APPROVED", "RUNNING", "COMPLETED"].includes(m.status) ? "APPROVED" : "—")}</span></div>
                  <div className={sec}>Result</div>
                  <div className="mt-1 text-xs text-tg-text">{m.result || "—"}</div>
                  <div className={sec}>History</div>
                  <div className="mt-1 text-[11px] text-tg-muted">created {m.createdAt} · updated {m.updatedAt}</div>
                </div>
              );
            })()
          ) : selAgent ? (
            (() => {
              const slot = agentSession[selAgent.id];
              const cc = agentCounts(selAgent);
              const dev = deviceById(selAgent.deviceId);
              const sec = "mt-4 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent";
              const li = "rounded-lg bg-tg-bg px-2 py-1 text-xs text-tg-text";
              return (
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white ${color(selAgent.id)}`}>{initial(selAgent.name)}</div>
                    <div>
                      <div className="font-bold leading-tight">{selAgent.name}</div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLR[selAgent.state || "OFFLINE"] || ""}`}>{selAgent.state || "—"}</span>
                    </div>
                  </div>

                  <div className={sec}>Identity</div>
                  <div className="mt-1 space-y-1 text-xs text-tg-muted">
                    <div>Role: <b className="text-tg-text">{selAgent.role}</b></div>
                    <div>Owner: <b className="text-tg-text">{selAgent.owner || "—"}</b></div>
                    <div>Readiness: <b className="text-tg-text">{selAgent.readiness}%</b></div>
                  </div>

                  <div className={sec}>Runtime</div>
                  <div className="mt-1 space-y-1 text-xs text-tg-muted">
                    <div>Telegram: <b className="text-tg-text">{slot ? (slot.displayName || sid(slot)) : "— не привязан"}</b>{cc ? <span> · {cc.d}d/{cc.c}c/{cc.g}g</span> : null}</div>
                    <div>Device: <b className="text-tg-text">{dev ? dev.name : "—"}</b></div>
                    <div>Model: <b className="text-tg-text">{selAgent.model || "—"}</b> · Voice: <b className="text-tg-text">{selAgent.voice || "—"}</b></div>
                    <div>Memory: <b className="text-tg-text">{selAgent.memory ? "ENABLED" : "OFF"}</b></div>
                    <select value={selAgent.deviceId || ""} onChange={(e) => setAgentDevice(selAgent.id, e.target.value)} className="mt-1 w-full rounded-lg bg-tg-bg px-2 py-1.5 text-xs text-white outline-none ring-1 ring-tg-line">
                      <option value="">— привязать устройство —</option>
                      {devices.map((d) => (<option key={d.id} value={d.id}>{d.name} ({d.type})</option>))}
                    </select>
                  </div>

                  <div className={sec}>Memory</div>
                  <div className="mt-1 text-[11px] text-tg-muted">Short-Term:</div>
                  <div className="mt-1 space-y-1">{(selAgent.shortMem || []).length ? (selAgent.shortMem || []).map((m, i) => <div key={i} className={li}>• {m}</div>) : <div className="text-xs text-tg-muted">—</div>}</div>
                  <div className="mt-2 text-[11px] text-tg-muted">Long-Term:</div>
                  <div className="mt-1 space-y-1">{(selAgent.longMem || []).length ? (selAgent.longMem || []).map((m, i) => <div key={i} className={li}>• {m}</div>) : <div className="text-xs text-tg-muted">—</div>}</div>

                  <div className={sec}>Goals</div>
                  <div className="mt-1 space-y-1 text-xs text-tg-muted">
                    <div>Current: <b className="text-tg-text">{selAgent.currentGoal || "—"}</b></div>
                    <div>Next: <b className="text-tg-text">{selAgent.nextGoal || "—"}</b></div>
                    <div>Priority: <b className="text-tg-text">{selAgent.goalPriority || "—"}</b> · Status: <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLR[selAgent.goalStatus || ""] || "bg-white/10 text-tg-muted"}`}>{selAgent.goalStatus || "—"}</span></div>
                    {selAgent.goalDeadline && <div>Deadline: <b className="text-tg-text">{selAgent.goalDeadline}</b></div>}
                  </div>

                  <div className={sec}>Tasks</div>
                  <div className="mt-1 space-y-1">
                    {(selAgent.tasks || []).length ? (selAgent.tasks || []).map((t) => (
                      <div key={t.id} className="flex items-center gap-2 rounded-lg bg-tg-bg px-2 py-1 text-xs">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_CLR[t.status] || "bg-white/10 text-tg-muted"}`}>{t.status}</span>
                        <span className="truncate">{t.title}</span>
                      </div>
                    )) : <div className="text-xs text-tg-muted">—</div>}
                  </div>

                  <div className={sec}>Knowledge · What I Know</div>
                  <div className="mt-1 space-y-1">{(selAgent.knowledge || []).length ? (selAgent.knowledge || []).map((k, i) => <div key={i} className={li}>✓ {k}</div>) : <div className="text-xs text-tg-muted">—</div>}</div>

                  <div className={sec}>Activity</div>
                  <div className="mt-1 space-y-1">{(selAgent.activity || []).length ? (selAgent.activity || []).slice().reverse().map((a, i) => <div key={i} className="text-xs text-tg-muted"><b className="text-tg-text">{a.t}</b> — {a.action}{a.result ? ` · ${a.result}` : ""}</div>) : <div className="text-xs text-tg-muted">—</div>}</div>

                  <div className={sec}>Links</div>
                  <div className="mt-1 text-[11px] text-tg-muted">Session ↔ Agent ↔ Device</div>
                  <div className="mt-1">{(selAgent.integrations && selAgent.integrations.length) ? selAgent.integrations.map((i) => <span key={i} className="mr-1 inline-block rounded-full bg-tg-bg px-2 py-0.5 text-[11px]">{i}</span>) : <span className="text-xs text-tg-muted">—</span>}</div>
                </div>
              );
            })()
          ) : (
            <div className="text-tg-muted">Выбери агента.</div>
          )}
        </aside>
      </div>

      <div className="mt-4 text-[11px] text-tg-muted">
        Живые данные: активный аккаунт, статус TDLib, Dialogs/Channels/Groups активной сессии. Сущности/привязки/устройства хранятся локально (без секретов) и переживают перезапуск. Двойной клик по агенту → Agent Workspace.
      </div>
      {workspaceAgent && (
        <AgentWorkspace
          agentId={workspaceAgent}
          ctx={{ agents, missions, exec, devices, slots, bind, counts, activeId }}
          onClose={() => setWorkspaceAgent(null)}
          onOpenTelegram={(slotId) => { setWorkspaceAgent(null); setTgWs({ slotId }); }}
        />
      )}
      {htmlCanvas && (
        <EffectiveHtmlCanvas
          ctx={{ agents, missions, exec, devices, slots, bind, counts, activeId }}
          onClose={() => setHtmlCanvas(false)}
        />
      )}
      {shellOpen && <ControlShell ctx={{ agents, missions, exec, devices, slots, bind, counts, activeId }} onClose={() => setShellOpen(false)} onAction={(t) => {
        try { setCtx({ screen: t.toUpperCase() }, "Open " + t); } catch {}
        if (t === "world") { setShellOpen(false); setWorldOpen(true); }
        else if (t === "telegram" || t === "tgcommand" || t === "tgdiscovery") { setShellOpen(false); setTgWs({}); }
        else if (t === "registry" || t === "agents") { setShellOpen(false); setTab("agents"); }
        else if (t === "missions") { setShellOpen(false); setTab("missions"); }
        else if (t === "mediaops") { setShellOpen(false); setMediaOpsOpen(true); }
        else if (t === "media") { setShellOpen(false); setMediaOpen(true); }
        else if (t === "architect") { setShellOpen(false); setArchitectOpen(true); }
        else if (t === "devices") { setShellOpen(false); setDeviceOpen(true); }
        else if (t === "ops" || t === "infra") { setShellOpen(false); setOpsOpen(true); }
        else if (t === "guide") { setShellOpen(false); setGuideOpen(true); }
        else if (t === "coo") { setShellOpen(false); setCooOpen(true); }
        else if (t === "runtime") { setShellOpen(false); setRuntimeOpen(true); }
        else if (t === "provisioning") { setShellOpen(false); setProvOpen(true); }
        else if (t === "medianet") { setShellOpen(false); setMediaNetOpen(true); }
        else if (t === "adfactory") { setShellOpen(false); setAdFactoryOpen(true); }
        else if (t === "social") { setShellOpen(false); setSocialOpen(true); }
        else if (t === "agentos" || t === "twins" || t === "missioncontrol") { setShellOpen(false); setAgentOsOpen(true); }
        else if (t === "ecosystem" || t === "inspector" || t === "relationships" || t === "executive" || t === "readinessofficer") { setShellOpen(false); setEcoOpen(true); }
        else if (t === "mediacanvas" || t === "медиазавод" || t === "mediafactory") { setShellOpen(false); setMfCanvasOpen(true); }
        else if (t === "orchestration" || t === "оркестрация" || t === "mediaorch") { setShellOpen(false); setMfOrchOpen(true); }
        else if (t === "economy" || t === "экономика" || t === "активы" || t === "монетизация" || t === "доход") { setShellOpen(false); setEconomyOpen(true); }
        else if (t === "worldengine" || t === "мир" || t === "карта" || t === "twinuniverse" || t === "commandcenter") { setShellOpen(false); setWorldEngineOpen(true); }
        else if (t === "activation" || t === "активация" || t === "готовность" || t === "readiness") { setShellOpen(false); setActivationOpen(true); }
        else if (t === "strategy" || t === "стратегия" || t === "roadmap" || t === "okr" || t === "missionstrategy") { setShellOpen(false); setStrategyOpen(true); }
        else if (t === "knowledge" || t === "знания" || t === "база знаний" || t === "вики" || t === "память" || t === "исследования") { setShellOpen(false); setKnowledgeOpen(true); }
        else if (t === "automation" || t === "автоматизация" || t === "workflow" || t === "процессы" || t === "очередь" || t === "fabric") { setShellOpen(false); setAutomationOpen(true); }
        else if (t === "launchops" || t === "запуск" || t === "warroom" || t === "launch" || t === "тесты" || t === "инциденты") { setShellOpen(false); setLaunchOpsOpen(true); }
        else if (t === "identity" || t === "личности" || t === "инфраструктура" || t === "reality" || t === "аккаунты" || t === "телефоны" || t === "почты") { setShellOpen(false); setIdentityOpen(true); }
        else if (t === "humanfactory" || t === "digitalhuman" || t === "цифровойчеловек" || t === "фабрикалюдей" || t === "personabuilder" || t === "avatarstudio") { setShellOpen(false); setHumanFactoryOpen(true); }
        else if (t === "androidlab" || t === "cloudandroid" || t === "androidcloud" || t === "андроид" || t === "appstack" || t === "networkprofile") { setShellOpen(false); setAndroidLabOpen(true); }
        else if (t === "assignments" || t === "opsmatrix" || t === "матрицаназначений" || t === "операционнаяматрица" || t === "deviceassignment") { setShellOpen(false); setOpsMatrixOpen(true); }
        else if (t === "runtimegate" || t === "gaterequest" || t === "runtimeapproval" || t === "пакетактивации" || t === "запросназапуск") { setShellOpen(false); setGateBuilderOpen(true); }
        else if (t === "dryrun" || t === "симуляция" || t === "runtimesimulation" || t === "тестовыйпрогон" || t === "planвыполнения" || t === "failurescenarios" || t === "rollback") { setShellOpen(false); setDryRunOpen(true); }
        else if (t === "platformos" || t === "platform os" || t === "deepinsideos" || t === "commandgraph" || t === "osmap" || t === "platformintelligence") { setShellOpen(false); setPlatformOsOpen(true); }
        else if (t === "worldcenter" || t === "worlduniverse" || t === "worldenginev1" || t === "виртуальныймир" || t === "worldmap2" || t === "digitalhumancity") { setShellOpen(false); setWorldCenterOpen(true); }
        else if (t === "ecosystem v1" || t === "ecosystemcomplete" || t === "экосистема" || t === "storyverse" || t === "mediaverse" || t === "knowledgeverse" || t === "ceoview" || t === "ecosystemmap") { setShellOpen(false); setEcosystemFinalOpen(true); }
        else if (t === "ai" || t === "htmlcanvas") { setShellOpen(false); setHtmlCanvas(true); }
      }} />}
      {architectOpen && <EpicArchitect ctx={{ agents, missions, exec, devices, slots, bind, counts, activeId }} onClose={() => setArchitectOpen(false)} onOpenAgent={(id) => { setArchitectOpen(false); setWorkspaceAgent(id); }} />}
      {deviceOpen && <DeviceCenter ctx={{ agents, missions, slots, bind }} onClose={() => setDeviceOpen(false)} onOpenAgent={(id) => { setDeviceOpen(false); setWorkspaceAgent(id); }} />}
      {provOpen && <ProvisioningAgent ctx={{ agents, missions, slots, bind }} onClose={() => setProvOpen(false)} onOpenAgent={(id) => { setProvOpen(false); setWorkspaceAgent(id); }} />}
      {runtimeOpen && <RuntimeCenter ctx={{ agents, missions, slots, bind, counts, activeId }} onClose={() => setRuntimeOpen(false)} onAction={(target) => { if (target === "devices") { setRuntimeOpen(false); setDeviceOpen(true); } else if (target === "ops") { setRuntimeOpen(false); setOpsOpen(true); } else if (target === "ai") { setRuntimeOpen(false); setHtmlCanvas(true); } }} />}
      {mediaNetOpen && <MediaNetwork ctx={{ agents }} onClose={() => setMediaNetOpen(false)} />}
      {adFactoryOpen && <AdvertisingFactory onClose={() => setAdFactoryOpen(false)} />}
      {socialOpen && <SocialEmpire onClose={() => setSocialOpen(false)} onOpenAgent={(id) => { setSocialOpen(false); setWorkspaceAgent(id); }} />}
      {agentOsOpen && <AgentOS ctx={{ agents, missions, exec, devices, slots, bind, counts, activeId }} onClose={() => setAgentOsOpen(false)} onOpenAgent={(id) => { setAgentOsOpen(false); setWorkspaceAgent(id); }} />}
      {ecoOpen && <EcosystemBus ctx={{ agents, missions, exec, devices, slots, bind, counts, activeId }} onClose={() => setEcoOpen(false)} onOpenAgent={(id) => { setEcoOpen(false); setWorkspaceAgent(id); }} />}
      {mfCanvasOpen && <MediaFactoryCanvas onClose={() => setMfCanvasOpen(false)} />}
      {mfOrchOpen && <MediaFactoryOrchestration onClose={() => setMfOrchOpen(false)} />}
      {economyOpen && <EconomyEngine ctx={{ agents, missions, counts }} onClose={() => setEconomyOpen(false)} onOpenAgent={(id) => { setEconomyOpen(false); setWorkspaceAgent(id); }} />}
      {worldEngineOpen && <WorldEngine ctx={{ agents, missions, devices, slots, counts }} onClose={() => setWorldEngineOpen(false)} onOpenAgent={(id) => { setWorldEngineOpen(false); setWorkspaceAgent(id); }} />}
      {activationOpen && <ActivationEngine ctx={{ agents, missions, devices, counts }} onClose={() => setActivationOpen(false)} onOpenAgent={(id) => { setActivationOpen(false); setWorkspaceAgent(id); }} />}
      {strategyOpen && <StrategyCenter ctx={{ agents, missions, counts }} onClose={() => setStrategyOpen(false)} />}
      {knowledgeOpen && <KnowledgeEngine onClose={() => setKnowledgeOpen(false)} />}
      {automationOpen && <AutomationFabric onClose={() => setAutomationOpen(false)} />}
      {launchOpsOpen && <LaunchOpsCenter onClose={() => setLaunchOpsOpen(false)} />}
      {identityOpen && <IdentityInfra onClose={() => setIdentityOpen(false)} onOpenAgent={(id) => { setIdentityOpen(false); setWorkspaceAgent(id); }} />}
      {humanFactoryOpen && <DigitalHumanFactory onClose={() => setHumanFactoryOpen(false)} onOpenAgent={(id) => { setHumanFactoryOpen(false); setWorkspaceAgent(id); }} />}
      {androidLabOpen && <AndroidCloudLab onClose={() => setAndroidLabOpen(false)} />}
      {opsMatrixOpen && <OperationsAssignmentMatrix onClose={() => setOpsMatrixOpen(false)} />}
      {gateBuilderOpen && <RuntimeGateRequestBuilder onClose={() => setGateBuilderOpen(false)} />}
      {dryRunOpen && <RuntimeDryRunSimulator onClose={() => setDryRunOpen(false)} />}
      {platformOsOpen && <PlatformOS ctx={{ agents, missions, counts }} onClose={() => setPlatformOsOpen(false)} onOpenAgent={(id) => { setPlatformOsOpen(false); setWorkspaceAgent(id); }} />}
      {worldCenterOpen && <WorldEngineCenter onClose={() => setWorldCenterOpen(false)} onOpenAgent={(id) => { setWorldCenterOpen(false); setWorkspaceAgent(id); }} />}
      {ecosystemFinalOpen && <EcosystemFinalization onClose={() => setEcosystemFinalOpen(false)} onOpenAgent={(id) => { setEcosystemFinalOpen(false); setWorkspaceAgent(id); }} />}
      {omegaOpen && <OmegaFinal onClose={() => setOmegaOpen(false)} onOpenAgent={(id) => { setOmegaOpen(false); setWorkspaceAgent(id); }} />}
      {pilotOpen && <EVALaunchPilot onClose={() => setPilotOpen(false)} />}
      {publisherOpen && <EpicGramPublisher onClose={() => setPublisherOpen(false)} />}
      {brainOpen && <EpicGramAgentBrain onClose={() => setBrainOpen(false)} />}
      {epicOsOpen && <EpicGramAgentOS onClose={() => setEpicOsOpen(false)} initialSection={osSection} />}
      {mediaOpen && <MediaFactory onClose={() => setMediaOpen(false)} />}
      {mediaOpsOpen && <MediaOps ctx={{ agents, missions }} onClose={() => setMediaOpsOpen(false)} onAction={(target) => { if (target.startsWith("agent:")) { setMediaOpsOpen(false); setWorkspaceAgent(target.slice(6)); } }} />}
      {opsOpen && (
        <OperationsCenter
          ctx={{ agents, missions, exec, devices, slots, bind, counts, activeId }}
          onClose={() => setOpsOpen(false)}
          onAction={(target) => {
            if (target.startsWith("agent:")) { setOpsOpen(false); setWorkspaceAgent(target.slice(6)); }
            else if (target === "world") { setOpsOpen(false); setWorldOpen(true); }
            else if (target === "telegram") { setOpsOpen(false); setTgWs({}); }
            else if (target === "htmlcanvas") { setOpsOpen(false); setHtmlCanvas(true); }
            else if (target === "missions") { setOpsOpen(false); setTab("missions"); }
          }}
        />
      )}
      {cooOpen && (
        <AiCoo
          ctx={{ agents, missions, exec, devices, slots, bind, counts, activeId }}
          onClose={() => setCooOpen(false)}
          onAction={(target) => {
            if (target === "world") { setCooOpen(false); setWorldOpen(true); }
            else if (target === "telegram") { setCooOpen(false); setTgWs({}); }
            else if (target === "htmlcanvas") { setCooOpen(false); setHtmlCanvas(true); }
            else if (target === "agents") { setCooOpen(false); setTab("agents"); }
            else if (target === "missions") { setCooOpen(false); setTab("missions"); }
          }}
        />
      )}
      {guideOpen && (
        <AiGuide
          onClose={() => setGuideOpen(false)}
          onAction={(target) => {
            if (target === "world") { setGuideOpen(false); setWorldOpen(true); }
            else if (target === "telegram") { setGuideOpen(false); setTgWs({}); }
            else if (target === "htmlcanvas") { setGuideOpen(false); setHtmlCanvas(true); }
            else if (target === "registry") { setGuideOpen(false); setTab("agents"); }
            else if (target === "missions") { setGuideOpen(false); setTab("missions"); }
            else if (target === "agentws") { setGuideOpen(false); if (agents[0]) setWorkspaceAgent(agents[0].id); }
          }}
        />
      )}
      {tgWs && (
        <TelegramWorkspace
          ctx={{ agents, missions, exec, devices, slots, bind, counts, activeId }}
          slotId={tgWs.slotId}
          focusKind={tgWs.focusKind}
          focusId={tgWs.focusId}
          command={tgWs.command}
          onClose={() => setTgWs(null)}
          onOpenAgent={(id) => { setTgWs(null); setWorkspaceAgent(id); }}
        />
      )}
      {worldOpen && (
        <EcosystemMap
          ctx={{ agents, missions, exec, devices, slots, bind, counts, activeId }}
          onClose={() => setWorldOpen(false)}
          onOpenAgent={(id) => { setWorldOpen(false); setWorkspaceAgent(id); }}
          onOpenHtml={() => { setWorldOpen(false); setHtmlCanvas(true); }}
          onOpenNode={(n) => {
            if (n.type === "session") { setWorldOpen(false); setTgWs({ slotId: n.ref }); return; }
            if (n.type === "channel") { setWorldOpen(false); setTgWs({ focusKind: "channel", focusId: n.ref }); return; }
            if (n.type === "group") { setWorldOpen(false); setTgWs({ focusKind: "group", focusId: n.ref }); return; }
            if (n.type === "dialog" || n.type === "bot" || n.type === "contact") { setWorldOpen(false); setTgWs({ focusKind: n.type === "bot" ? "bot" : undefined }); return; }
            if (n.type === "mission" && n.ref) { const ms = missions.find((m) => m.id === n.ref); if (ms?.agentId) { setWorldOpen(false); setWorkspaceAgent(ms.agentId); return; } }
            setWorldOpen(false); setHtmlCanvas(true);
          }}
        />
      )}
      {stackOpen && <SelfHostedAIStack onClose={() => setStackOpen(false)} />}
      {catalogOpen && <WebAppCatalogPanel onClose={() => setCatalogOpen(false)} />}
      <GlobalAIOperatorSidebar />
    </div>
  );
}

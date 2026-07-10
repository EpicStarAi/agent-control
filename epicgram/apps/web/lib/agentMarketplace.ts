// P21 — AI Specialist Marketplace. Config-only. Все агенты по умолчанию MANUAL_APPROVAL_ONLY.
// Никаких реальных моделей/сети: routeAgentTemplate — детерминированный stub.

export type AutomationLevel = "advice_only" | "drafts" | "approval_required" | "automation_low_risk";

export type Category = {
  id: string;
  title: string;
};

export const CATEGORIES: Category[] = [
  { id: "marketing", title: "Маркетинг" },
  { id: "smm", title: "SMM" },
  { id: "telegram", title: "Telegram" },
  { id: "sales", title: "Продажи" },
  { id: "support", title: "Поддержка" },
  { id: "content", title: "Контент" },
  { id: "media", title: "Медиа" },
  { id: "ai_characters", title: "AI-персонажи" },
  { id: "digital_twins", title: "Digital Twins" },
  { id: "automation", title: "Бизнес-автоматизация" },
  { id: "analytics", title: "Аналитика" },
  { id: "vpn_saas", title: "VPN / SaaS" },
];

export type AgentTemplate = {
  agent_id: string;
  title: string;
  category: string;
  description: string;
  skills: string[];
  project_types: string[];
  safe_actions: string[];
  blocked_actions: string[];
  monetization: string[];
  automation_level: AutomationLevel;
};

// Общий безопасный набор (совпадает с taxonomy operatorActions / P18).
const SAFE = ["prepare_post", "suggest_reply", "create_content_plan", "analyze_chat"];
const BLOCKED = ["auto_publish", "bulk_message", "invite_users", "delete_messages"];

export const AGENTS: AgentTemplate[] = [
  { agent_id: "smm_operator", title: "SMM AI Operator", category: "smm",
    description: "Посты, сторис, контент-план, ведение Telegram/Instagram/TikTok, анализ реакций.",
    skills: ["Copywriting", "Content Plan", "Telegram Publishing", "Audience Growth", "Monetization"],
    project_types: ["vpn", "media", "digital_twin", "telegram_channel", "personal_brand"],
    safe_actions: SAFE, blocked_actions: BLOCKED,
    monetization: ["ads", "subscription", "affiliate", "paid_content"], automation_level: "approval_required" },
  { agent_id: "telegram_support", title: "Telegram Support Agent", category: "support",
    description: "Ответы на обращения, черновики решений, эскалации — только после подтверждения.",
    skills: ["Support", "FAQ", "Tone Matching", "Triage"], project_types: ["vpn", "saas", "telegram_channel"],
    safe_actions: ["suggest_reply", "analyze_chat"], blocked_actions: BLOCKED,
    monetization: ["subscription", "setup_fee"], automation_level: "approval_required" },
  { agent_id: "telegram_publisher", title: "Telegram Publisher", category: "telegram",
    description: "Готовит и ставит в очередь посты/анонсы; публикация — только через Approval.",
    skills: ["Publishing", "Scheduling", "Copywriting"], project_types: ["media", "telegram_channel", "vpn"],
    safe_actions: ["prepare_post", "create_content_plan"], blocked_actions: BLOCKED,
    monetization: ["subscription", "ads"], automation_level: "approval_required" },
  { agent_id: "vpn_support", title: "VPN Support Agent", category: "vpn_saas",
    description: "Поддержка VPN: подключение, оплата, устранение блокировок; черновики ответов.",
    skills: ["Support", "VPN Troubleshooting", "Billing"], project_types: ["vpn"],
    safe_actions: ["suggest_reply", "analyze_chat"], blocked_actions: BLOCKED,
    monetization: ["subscription", "affiliate"], automation_level: "approval_required" },
  { agent_id: "sales_operator", title: "Sales AI Operator", category: "sales",
    description: "Лиды, квалификация, скрипты, follow-up-черновики; отправка — по подтверждению.",
    skills: ["Sales", "Lead Qualification", "Follow-up"], project_types: ["vpn", "saas", "services"],
    safe_actions: ["suggest_reply", "create_content_plan", "analyze_chat"], blocked_actions: BLOCKED,
    monetization: ["cpa", "subscription", "services"], automation_level: "approval_required" },
  { agent_id: "content_strategist", title: "Content Strategist", category: "content",
    description: "Контент-стратегия, рубрики, календарь, форматы под нишу.",
    skills: ["Content Strategy", "Editorial Calendar", "Formats"], project_types: ["media", "personal_brand", "telegram_channel"],
    safe_actions: ["create_content_plan", "prepare_post"], blocked_actions: BLOCKED,
    monetization: ["subscription", "paid_content"], automation_level: "drafts" },
  { agent_id: "influencer_manager", title: "AI Influencer Manager", category: "marketing",
    description: "Управление инфлюенсер-присутствием, коллаборации, брифы.",
    skills: ["Influencer Ops", "Outreach Drafts", "Brief Writing"], project_types: ["media", "digital_twin", "personal_brand"],
    safe_actions: ["suggest_reply", "create_content_plan"], blocked_actions: BLOCKED,
    monetization: ["ads", "affiliate", "services"], automation_level: "approval_required" },
  { agent_id: "digital_twin_manager", title: "Digital Twin Manager", category: "digital_twins",
    description: "Ведёт цифрового двойника: тон, сценарии, публикации, консистентность образа.",
    skills: ["Persona", "Consistency", "Scripting"], project_types: ["digital_twin", "media"],
    safe_actions: ["prepare_post", "create_content_plan", "analyze_chat"], blocked_actions: BLOCKED,
    monetization: ["subscription", "paid_content", "ads"], automation_level: "approval_required" },
  { agent_id: "ai_streamer_producer", title: "AI Streamer Producer", category: "ai_characters",
    description: "Продюсер AI-стримера: сетка эфиров, сценарии, подводки, реакции.",
    skills: ["Show Running", "Scripting", "Scheduling"], project_types: ["media", "digital_twin"],
    safe_actions: ["create_content_plan", "prepare_post"], blocked_actions: BLOCKED,
    monetization: ["donations", "subscription", "ads"], automation_level: "approval_required" },
  { agent_id: "community_moderator", title: "Community Moderator", category: "telegram",
    description: "Модерация групп: правила, черновики предупреждений; реальные действия — под Approval.",
    skills: ["Moderation", "Rules", "Triage"], project_types: ["telegram_channel", "community"],
    safe_actions: ["suggest_reply", "analyze_chat"], blocked_actions: BLOCKED,
    monetization: ["subscription"], automation_level: "approval_required" },
  { agent_id: "lead_gen_agent", title: "Lead Generation Agent", category: "sales",
    description: "Поиск и квалификация лидов, черновики первичных касаний (white-hat).",
    skills: ["Lead Gen", "Qualification", "Outreach Drafts"], project_types: ["vpn", "saas", "services"],
    safe_actions: ["create_content_plan", "suggest_reply", "analyze_chat"], blocked_actions: BLOCKED,
    monetization: ["cpa", "services"], automation_level: "approval_required" },
  { agent_id: "analytics_agent", title: "Analytics Agent", category: "analytics",
    description: "Метрики каналов/постов, отчёты, инсайты и рекомендации.",
    skills: ["Analytics", "Reporting", "Insights"], project_types: ["media", "vpn", "telegram_channel"],
    safe_actions: ["analyze_chat", "create_content_plan"], blocked_actions: BLOCKED,
    monetization: ["subscription"], automation_level: "advice_only" },
];

export function getAgent(id: string): AgentTemplate | undefined {
  return AGENTS.find((a) => a.agent_id === id);
}
export function agentsByCategory(cat: string): AgentTemplate[] {
  return AGENTS.filter((a) => a.category === cat);
}

// Setup wizard — 10 вопросов.
export type WizardStep = { id: string; q: string; options: string[]; multi?: boolean };
export const WIZARD: WizardStep[] = [
  { id: "project_type", q: "Для какого проекта?", options: ["VPN", "AI-персонаж", "Telegram-канал", "Личный бренд", "Медиа", "Другое"] },
  { id: "goal", q: "Какая цель?", options: ["Подписчики", "Продажи", "Контент", "Поддержка", "Монетизация"], multi: true },
  { id: "platform", q: "Где работаем?", options: ["Telegram", "Instagram", "TikTok", "YouTube", "Сайт", "Все"], multi: true },
  { id: "tone", q: "Стиль общения?", options: ["Профессиональный", "Дружелюбный", "Дерзкий", "Нативный", "Премиум"] },
  { id: "automation", q: "Уровень автоматизации?", options: ["Только советы", "Черновики", "Approval", "Автоматизация low-risk"] },
  { id: "monetization", q: "Монетизация?", options: ["Реклама", "Подписка", "CPA", "Продажа услуг", "Донаты", "Stars"], multi: true },
  { id: "frequency", q: "Частота контента?", options: ["Ежедневно", "Несколько раз в неделю", "Еженедельно"] },
  { id: "risk", q: "Уровень риска?", options: ["Минимальный", "Средний", "Высокий"] },
  { id: "approval_mode", q: "Режим подтверждения?", options: ["View", "Suggest", "Approval", "Autopilot (low-risk)"] },
  { id: "budget", q: "Бюджет?", options: ["Минимальный", "Средний", "Высокий"] },
];

export type WizardAnswers = Record<string, string | string[]>;
export type RoutedProfile = {
  agent: AgentTemplate | null;
  playbook: string[];
  safe_actions: string[];
  blocked_actions: string[];
  monetization_path: string[];
  next_steps: string[];
};

// Router AI stub — детерминированный, без сети/модели.
export function routeAgentTemplate(agentId: string, answers: WizardAnswers): RoutedProfile {
  const agent = getAgent(agentId) ?? null;
  const goal = ([] as string[]).concat(answers.goal as string[] | string || []);
  const platforms = ([] as string[]).concat(answers.platform as string[] | string || []);
  const playbook = [
    `Цель: ${goal.join(", ") || "не задана"}`,
    `Платформы: ${platforms.join(", ") || "Telegram"}`,
    `Тон: ${(answers.tone as string) || "Дружелюбный"}`,
    `Режим: ${(answers.approval_mode as string) || "Approval"} (по умолчанию MANUAL_APPROVAL_ONLY)`,
    "Неделя 1: настройка образа + контент-план",
    "Неделя 2: черновики + сбор реакций",
    "Неделя 3: оптимизация по метрикам",
  ];
  return {
    agent,
    playbook,
    safe_actions: agent?.safe_actions ?? SAFE,
    blocked_actions: agent?.blocked_actions ?? BLOCKED,
    monetization_path: ([] as string[]).concat((answers.monetization as string[] | string) ?? agent?.monetization ?? []),
    next_steps: ["Подтвердить профиль", "Настроить под проект в /client", "Запустить в Approval-режиме"],
  };
}

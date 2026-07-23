// P21-MEDIA — AI Media Creator / Virtual Creator Studio. Config-only.
// Без реального клонирования голоса/лица, без внешних API, без публикаций, без биометрии.
// Все действия — конфигурация. По умолчанию MANUAL_APPROVAL_ONLY.

export type MediaAgent = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  integrations: string[];
  monetization: string[];
  safe_actions: string[];
  blocked_actions: string[];
  automation_level: "advice_only" | "drafts" | "approval_required";
};

const MEDIA_SAFE = ["design_character", "draft_script", "create_content_plan", "prepare_post", "analyze_chat"];
const MEDIA_BLOCKED = ["real_voice_clone", "real_face_clone", "auto_publish", "auto_stream", "bulk_message"];

export const MEDIA_AGENTS: MediaAgent[] = [
  { id: "ai_media_creator", title: "AI Media Creator",
    description: "Создаёт цифрового персонажа, голос, локации, сценарии, shorts, эфиры; ведёт контент-пайплайн через Publisher.",
    skills: ["Character Design", "Scripting", "Content Plan", "Publishing", "Monetization"],
    integrations: ["Grok Workspace", "Grok Imagine", "ElevenLabs", "HeyGen", "LiveKit", "Telegram Publisher"],
    monetization: ["stars", "subscription", "sponsorship", "affiliate", "ads", "paid_content"],
    safe_actions: MEDIA_SAFE, blocked_actions: MEDIA_BLOCKED, automation_level: "approval_required" },
  { id: "ai_streamer_producer", title: "AI Streamer Producer",
    description: "Продюсер AI-стримера: сетка эфиров, сценарии, подводки, реакции, монетизация стрима.",
    skills: ["Show Running", "Scripting", "Scheduling", "Live Ops"],
    integrations: ["Grok Workspace", "LiveKit", "OBS / RTMP", "Telegram Publisher"],
    monetization: ["donations", "stars", "subscription", "ads"],
    safe_actions: MEDIA_SAFE, blocked_actions: MEDIA_BLOCKED, automation_level: "approval_required" },
  { id: "digital_twin_manager", title: "Digital Twin Manager",
    description: "Ведёт цифрового двойника: образ, тон, консистентность, публикации.",
    skills: ["Persona", "Consistency", "Scripting"], integrations: ["Grok Workspace", "HeyGen", "ElevenLabs"],
    monetization: ["subscription", "paid_content", "ads"], safe_actions: MEDIA_SAFE, blocked_actions: MEDIA_BLOCKED, automation_level: "approval_required" },
  { id: "virtual_influencer", title: "Virtual Influencer Operator",
    description: "Управляет виртуальным инфлюенсером: контент, коллаборации, бренд-интеграции.",
    skills: ["Brand", "Content", "Outreach Drafts"], integrations: ["Grok Imagine", "ElevenLabs", "Telegram Publisher"],
    monetization: ["sponsorship", "affiliate", "ads", "subscription"], safe_actions: MEDIA_SAFE, blocked_actions: MEDIA_BLOCKED, automation_level: "approval_required" },
  { id: "ai_news_host", title: "AI News Host",
    description: "AI-ведущая новостей: сводки, подводки, выпуски, публикация после подтверждения.",
    skills: ["News Digest", "Scripting", "Voiceover Draft"], integrations: ["Grok Workspace", "ElevenLabs", "HeyGen"],
    monetization: ["ads", "subscription", "sponsorship"], safe_actions: MEDIA_SAFE, blocked_actions: MEDIA_BLOCKED, automation_level: "approval_required" },
  { id: "ai_radio_host", title: "AI Radio Host",
    description: "AI-радиоведущий: подводки, эфирная сетка, голосовые вставки между треками.",
    skills: ["Radio", "Scripting", "Scheduling"], integrations: ["Grok Voice", "ElevenLabs", "Liquidsoap/Icecast"],
    monetization: ["donations", "ads", "subscription"], safe_actions: MEDIA_SAFE, blocked_actions: MEDIA_BLOCKED, automation_level: "approval_required" },
  { id: "ai_video_chat_avatar", title: "AI Video Chat Avatar",
    description: "AI-собеседник по видео-чату (realtime): голос/видео сессия, ответы фанатам через approval.",
    skills: ["Realtime Voice", "Persona", "Interaction"], integrations: ["LiveKit / WebRTC", "STT (Deepgram/Whisper)", "TTS (ElevenLabs/Grok Voice)", "Avatar (HeyGen/Tavus/D-ID)"],
    monetization: ["tips", "paid_session", "subscription"], safe_actions: MEDIA_SAFE, blocked_actions: MEDIA_BLOCKED, automation_level: "approval_required" },
];

export type Provider = { id: string; label: string; kind: "brain" | "voice" | "avatar" | "image_video" | "realtime" | "streaming"; status: "planned" | "available" };
export const PROVIDERS: Provider[] = [
  { id: "grok_workspace", label: "Grok Workspace", kind: "brain", status: "planned" },
  { id: "grok_api", label: "Grok API", kind: "brain", status: "planned" },
  { id: "openrouter", label: "OpenRouter", kind: "brain", status: "available" },
  { id: "grok_imagine", label: "Grok Imagine", kind: "image_video", status: "planned" },
  { id: "grok_voice", label: "Grok Voice", kind: "voice", status: "planned" },
  { id: "elevenlabs", label: "ElevenLabs", kind: "voice", status: "planned" },
  { id: "openai_tts", label: "OpenAI Realtime/TTS", kind: "voice", status: "planned" },
  { id: "heygen", label: "HeyGen", kind: "avatar", status: "planned" },
  { id: "tavus", label: "Tavus", kind: "avatar", status: "planned" },
  { id: "did", label: "D-ID", kind: "avatar", status: "planned" },
  { id: "livekit", label: "LiveKit / WebRTC", kind: "realtime", status: "planned" },
  { id: "obs_rtmp", label: "OBS / RTMP", kind: "streaming", status: "planned" },
];

export const IDENTITY_TYPES = ["fictional", "consented_real_person", "brand_character"] as const;
export type IdentityType = (typeof IDENTITY_TYPES)[number];

export const MONETIZATION = ["Telegram Stars", "paid channel", "donations", "sponsorships", "affiliate", "subscriptions", "ads", "tips", "merch"];

// Character wizard steps.
export type MediaStep = { id: string; q: string; options?: string[]; input?: boolean; multi?: boolean };
export const CHAR_WIZARD: MediaStep[] = [
  { id: "name", q: "Имя персонажа", input: true },
  { id: "persona", q: "Роль / персона", options: ["Блогер", "Стример", "Ведущая новостей", "Модель", "Радиоведущий", "Sales-presenter", "Video-chat companion"] },
  { id: "niche", q: "Ниша", options: ["Медиа", "Технологии", "Развлечения", "Музыка", "VPN/SaaS", "Личный бренд"], multi: true },
  { id: "audience", q: "Аудитория", options: ["RU", "UA", "Глобал", "18-24", "25-34", "35+"], multi: true },
  { id: "tone", q: "Тон", options: ["Профессиональный", "Дружелюбный", "Дерзкий", "Нативный", "Премиум"] },
  { id: "visual_style", q: "Визуальный стиль", options: ["Neon Cyber", "Минимал", "Гламур", "Стрит", "Аниме", "Реализм"] },
  { id: "locations", q: "Локации / студия", options: ["Квартира", "Студия", "Улица", "Сцена", "Виртуальная сцена"], multi: true },
  { id: "channels", q: "Каналы", options: ["Telegram", "YouTube", "TikTok", "Instagram", "Сайт"], multi: true },
  { id: "monetization", q: "Монетизация", options: MONETIZATION, multi: true },
  { id: "identity_type", q: "Тип личности (важно для согласия)", options: ["fictional", "consented_real_person", "brand_character"] },
  { id: "approval_mode", q: "Режим", options: ["View", "Suggest", "Approval", "Autopilot (low-risk)"] },
];

export type MediaAnswers = Record<string, string | string[]>;

// Детерминированный сбор профиля персонажа. Никаких моделей/сети/биометрии.
export function buildCharacterProfile(agentId: string, answers: MediaAnswers) {
  const agent = MEDIA_AGENTS.find((a) => a.id === agentId) ?? null;
  const identity = (answers.identity_type as string) || "fictional";
  const cloneAllowed = identity !== "consented_real_person" ? false : false; // клонирование только при verified consent → в MVP всегда false
  const profile = {
    character: {
      name: (answers.name as string) || "Без имени",
      persona: (answers.persona as string) || "",
      niche: answers.niche || [],
      audience: answers.audience || [],
      tone: (answers.tone as string) || "Дружелюбный",
      visual_style: (answers.visual_style as string) || "Neon Cyber",
      locations: answers.locations || [],
      channels: answers.channels || [],
    },
    consent: {
      identity_type: identity as IdentityType,
      consent_status: identity === "consented_real_person" ? "pending" : "not_required",
      voice_clone_allowed: cloneAllowed,
      face_clone_allowed: cloneAllowed,
      ai_disclosure_required: true,
    },
    provider_stack: {
      brain: "grok_workspace | openrouter",
      image_video: "grok_imagine",
      voice: "elevenlabs | grok_voice",
      avatar: "heygen | tavus",
      realtime: "livekit",
      streaming: "obs_rtmp",
    },
    monetization: answers.monetization || agent?.monetization || [],
    automation_level: (answers.approval_mode as string) || "Approval",
  };
  const pipeline = [
    "Идея/сценарий → Grok Workspace",
    "Визуал/сцена → Grok Imagine (AI-маркировка обязательна)",
    "Голос → ElevenLabs / Grok Voice (только свой/согласованный)",
    "Аватар/видео → HeyGen / Tavus",
    "Realtime video-chat → LiveKit",
    "Публикация → EPIC GRAM Publisher (Approval)",
  ];
  return {
    agent,
    profile,
    pipeline,
    provider_stack: profile.provider_stack,
    safe_actions: agent?.safe_actions ?? MEDIA_SAFE,
    blocked_actions: agent?.blocked_actions ?? MEDIA_BLOCKED,
    next_steps: ["Подтвердить профиль и consent", "Выбрать providers", "Собрать первый контент-план", "Запустить в Approval-режиме"],
  };
}

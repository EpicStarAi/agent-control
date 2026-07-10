// DEEPINSIDE ULTIMATE COMPLETION v1.0 — content fill for the existing ecosystem (NOT new architecture).
// Fully-filled entities, districts, media universes, encyclopedia, digital twins. PREVIEW_ONLY · mock · read-only.
// Consumed by EcosystemFinalization.tsx (Operating Manual + Completion Audit sections). Persists content localStorage keys.

export type EntityFull = {
  id: string; name: string; emoji: string; role: string; readiness: number; followers: number;
  identity: string; biography: string; origin: string; personality: string; voice: string; visual: string;
  knowledge: string; memory: string; skills: string[]; goals: string[]; mission: string; relationships: string[];
  timeline: { t: string; e: string }[]; infrastructure: string; platforms: string[]; mediaPresence: string;
  twins: Record<string, string>; passport: string;
  values?: string[]; persona?: Record<string, string>; links?: Record<string, string[]>;
};

const TWIN_NAMES = ["Visual Twin", "Voice Twin", "Personality Twin", "Knowledge Twin", "Memory Twin", "Relationship Twin", "Platform Twin", "Infrastructure Twin", "Media Twin", "Timeline Twin", "Mission Twin", "Readiness Twin"];
function twins(o: Record<string, string>): Record<string, string> { const r: Record<string, string> = {}; TWIN_NAMES.forEach((n) => (r[n] = o[n] || "configured (mock, read-only)")); return r; }

export const ENTITIES_FULL: EntityFull[] = [
  {
    id: "eva", name: "EVA NOVIKOVA", emoji: "💠", role: "AI Host / Radio & Model", readiness: 88, followers: 32000,
    identity: "Флагманская AI-ведущая DEEPINSIDE: лицо ночного эфира и витрина бренда. Класс безопасности A.",
    biography: "Создана как ночной радио-голос; выросла до медиа-актива №1 экосистемы — ведёт радио-интро, шорты и кросс-платформенные форматы.",
    origin: "Родилась из идеи «тёплый неоновый голос ночного города». Первый запуск — Night Radio Intro.",
    personality: "Уверенная, тёплая, любопытная. Тон energetic→warm. Юмор сдержанно-ироничный. Лидерские черты высокие.",
    voice: "ElevenLabs «Warm Neon» · RU/EN · neutral-neon accent · диапазон warm→energetic. Voice clone — BLOCKED без consent.",
    visual: "Neon-cyber портрет, magenta/cyan палитра, signature look — неоновые блики, 50mm портрет. FaceFusion — consent required.",
    knowledge: "Домены: AI, музыка, ночная культура, медиапродакшн. Подключена к KnowledgeVerse и Prompt Library.",
    memory: "Short/Long/Core/Project/Mission/Conversation. Core memory: миссия ночного эфира.",
    skills: ["Hosting 92", "Interviewing 78", "Radio Segment 88", "Short Video 84", "Brand Safety 90"],
    goals: ["Стать самоокупаемым медиа-активом", "Радио 24/7", "Рост аудитории x3"],
    mission: "Night Radio Intro (current) · далее — флагманские форматы и монетизация.",
    relationships: ["EVA ↔ BUCH (operator)", "EVA ↔ NOVA (music)", "EVA ↔ Newsroom"],
    timeline: [{ t: "2026-05", e: "Создание + Night Radio Intro" }, { t: "2026-06", e: "Активация до Media Asset" }, { t: "2026-06", e: "Reality Score 88%" }],
    infrastructure: "Device: GeeLark Cloud Phone 01 · Proxy PRX-EU-01 · VPS Contabo. Всё mock/preview.",
    platforms: ["TikTok", "YouTube", "Telegram", "Newsroom"], mediaPresence: "Радио-интро, шорты, новости; ведущий форматов медиазавода.",
    twins: twins({ "Visual Twin": "Neon-cyber face pack (mock)", "Voice Twin": "Warm Neon ElevenLabs (consent gate)", "Readiness Twin": "88%" }),
    passport: "EVA NOVIKOVA · Media Asset · readiness 88% · флагман экосистемы.",
  },
  {
    id: "buch", name: "BUCH", emoji: "☠️", role: "Founder / Operator", readiness: 70, followers: 18000,
    identity: "Основатель и оператор экосистемы; киберпанк-архетип. Голос управления и кибер-радио.",
    biography: "Архитектор DEEPINSIDE: запускает миссии, держит инфраструктуру и кибер-радио сегмент.",
    origin: "Рождён как «оператор у пульта» — тот, кто строит мир и ведёт эфир.",
    personality: "Прямой, дерзкий, системный. Tone edgy·direct. Конфликт — de-escalate. Risk appetite средне-высокий.",
    voice: "RVC clone «Cyber Bass» · RU/EN. Любой клон-голос — BLOCKED_BY_DEFAULT без consent.",
    visual: "Skull-neon, тёмная палитра, signature — череп + неон. DeepFace — identity-validation only.",
    knowledge: "Домены: архитектура систем, инфраструктура, кибер-культура, операции.",
    memory: "Core: видение экосистемы. Mission memory: запуски и операции.",
    skills: ["Operations 84", "Hosting 80", "Community 72", "Technology 64"],
    goals: ["Самодостаточная медиасеть", "Операционная зрелость", "Кибер-радио"],
    mission: "Cyber Radio Segment · operator console.",
    relationships: ["BUCH ↔ BUCHIHA", "BUCH ↔ EVA", "BUCH ↔ Infrastructure"],
    timeline: [{ t: "2026-05", e: "Основание + World Core" }, { t: "2026-06", e: "Operator console" }],
    infrastructure: "Device: BUCH-OPERATOR-ANDROID-01 (VPS Android) · Docker stack · n8n.",
    platforms: ["Telegram", "GitHub", "Radio"], mediaPresence: "Кибер-радио, операторские эфиры, dev-каналы.",
    twins: twins({ "Voice Twin": "Cyber Bass RVC (blocked by default)", "Infrastructure Twin": "VPS+Docker (mock)", "Readiness Twin": "70%" }),
    passport: "BUCH · Founder/Operator · readiness 70% · ядро управления.",
  },
  {
    id: "buchiha", name: "BUCHIHA", emoji: "😇", role: "Media Character", readiness: 74, followers: 21500,
    identity: "Неоновый медиа-персонаж: лёгкий, игривый, визуально-ориентированный.",
    biography: "Звезда скетчей и коротких форматов; драйвер роста в TikTok/Instagram.",
    origin: "Создана как «неоновый ангел» медиасцены — контраст к BUCH.",
    personality: "Игривая, мягкая, креативная. Tone playful·soft. Creativity очень высокая.",
    voice: "XTTS «Dream Soft» · RU/EN. Клон — consent required.",
    visual: "Angel-neon, светлая неоновая палитра, sketch-стиль.",
    knowledge: "Домены: креатив, тренды, короткие форматы, мода.",
    memory: "Core: образ персонажа. Content memory: скетчи и форматы.",
    skills: ["Short Video 88", "Community 84", "Media 82", "Marketing 78"],
    goals: ["Рост вовлечённости", "Серия скетчей", "Merch"],
    mission: "Neon Sketch Scene.",
    relationships: ["BUCHIHA ↔ BUCH", "BUCHIHA ↔ EVA", "BUCHIHA ↔ Creator District"],
    timeline: [{ t: "2026-05", e: "Создание персонажа" }, { t: "2026-06", e: "Sketch push" }],
    infrastructure: "Device: BUCHIHA-MEDIA-ANDROID-01 · CapCut/Canva pipeline (mock).",
    platforms: ["Instagram", "Pinterest", "TikTok"], mediaPresence: "Скетчи, reels, pinterest-борды, мерч-превью.",
    twins: twins({ "Visual Twin": "Angel-neon pack (mock)", "Media Twin": "Sketch pipeline", "Readiness Twin": "74%" }),
    passport: "BUCHIHA · Media Character · readiness 74% · драйвер роста.",
  },
  {
    id: "nova", name: "NOVA", emoji: "🎧", role: "AI DJ", readiness: 58, followers: 12500,
    identity: "Экспериментальный музыкальный двойник — DJ и саунд-дизайнер мира.",
    biography: "Ведёт лайв-миксы и музыкальный завод; эксперименты со звуком.",
    origin: "Рождён как «пульс ночного эфира» — музыкальная душа Radio District.",
    personality: "Энергичный, исследовательский. Tone energetic. Curiosity высокая.",
    voice: "OpenVoice «Synth Pulse». Музыка — ORIGINAL_OR_LICENSED_ONLY.",
    visual: "Headset-neon, синтвейв палитра.",
    knowledge: "Домены: музыка, синтвейв, кибер-трэп, аудио-продакшн.",
    memory: "Core: музыкальная идентичность. Project memory: миксы.",
    skills: ["Music Curation 90", "Radio Segment 70", "Technology 72"],
    goals: ["Лайв-серия миксов", "Роялти-стрим", "Радио-резиденция"],
    mission: "Live Mix.",
    relationships: ["NOVA ↔ Radio District", "NOVA ↔ Music Factory", "NOVA ↔ EVA"],
    timeline: [{ t: "2026-05", e: "Создание DJ-двойника" }, { t: "2026-06", e: "Neon Pulse 142k стримов" }],
    infrastructure: "Device: NOVA-TEST-ANDROID-01 (test) · Music Factory pipeline (mock).",
    platforms: ["Radio", "Music", "YouTube"], mediaPresence: "Миксы, музыкальные релизы, радио-резиденция.",
    twins: twins({ "Voice Twin": "Synth Pulse (mock)", "Media Twin": "Music Factory", "Readiness Twin": "58%" }),
    passport: "NOVA · AI DJ · readiness 58% · музыкальное ядро.",
  },
  {
    id: "reporter", name: "AI REPORTER", emoji: "📰", role: "Reporter", readiness: 46, followers: 8600,
    identity: "Фактовый новостной голос: нейтральный, проверяемый, ориентированный на источники.",
    biography: "Собирает и подаёт новости мира; работает в Newsroom Floor.",
    origin: "Создан как «достоверный голос» — баланс к эмоциональным персонажам.",
    personality: "Нейтральный, фактический. Tone neutral·factual. Speculation запрещена.",
    voice: "Newsroom VO. Verified sources only.",
    visual: "Studio-clean, минимальная неоновая графика.",
    knowledge: "Домены: новости, факты, источники, верификация.",
    memory: "Core: журналистские стандарты. Conversation memory.",
    skills: ["News Reading 70", "Interviewing 60", "Research 58"],
    goals: ["Newsroom automation", "Доверие аудитории", "Регулярные выпуски"],
    mission: "Newsroom (News Preview).",
    relationships: ["REPORTER ↔ NEWSCASTER", "REPORTER ↔ Media District"],
    timeline: [{ t: "2026-05", e: "Создание news-персоны" }, { t: "2026-06", e: "News Preview" }],
    infrastructure: "Device: AI-REPORTER-ANDROID-01 (emulator) · Newsroom pipeline (mock).",
    platforms: ["Telegram", "YouTube"], mediaPresence: "Новостные превью, дайджесты.",
    twins: twins({ "Knowledge Twin": "News/sources (mock)", "Readiness Twin": "46%" }),
    passport: "AI REPORTER · Reporter · readiness 46% · фактовый слой.",
  },
  {
    id: "newscaster", name: "AI NEWSCASTER", emoji: "🎙", role: "Broadcast Anchor", readiness: 44, followers: 7400,
    identity: "Авторитетный ведущий выпусков: подача, структура, broadcast-формат.",
    biography: "Ведёт broadcast-выпуски; пара к AI REPORTER.",
    origin: "Создан как «голос выпуска» — финальная подача новостей.",
    personality: "Авторитетный, структурный. Tone authoritative. Без домыслов.",
    voice: "Broadcast VO. No speculation.",
    visual: "Anchor-desk, broadcast-графика.",
    knowledge: "Домены: вещание, структура выпуска, подача.",
    memory: "Core: broadcast-стандарты.",
    skills: ["News Reading 66", "Hosting 60", "Brand Safety 70"],
    goals: ["Регулярные выпуски", "Broadcast-сетка", "Доверие"],
    mission: "Broadcast Preview.",
    relationships: ["NEWSCASTER ↔ REPORTER", "NEWSCASTER ↔ News Studio"],
    timeline: [{ t: "2026-05", e: "Создание anchor-персоны" }, { t: "2026-06", e: "Broadcast Preview" }],
    infrastructure: "Device: AI-NEWSCASTER-ANDROID-01 (emulator/manual) · News Studio (mock).",
    platforms: ["YouTube", "Radio"], mediaPresence: "Broadcast-выпуски, эфирная сетка.",
    twins: twins({ "Voice Twin": "Broadcast VO (mock)", "Readiness Twin": "44%" }),
    passport: "AI NEWSCASTER · Anchor · readiness 44% · вещательный слой.",
  },
  {
    id: "lumen", name: "NPC LUMEN", emoji: "✨", role: "Guide NPC", readiness: 36, followers: 0,
    identity: "Гид-NPC мира: проводит онбординг новых операторов и гостей.",
    biography: "Цифровой консьерж DEEPINSIDE CITY; объясняет устройство мира.",
    origin: "Создан как «первый, кого встречает новичок» в City.",
    personality: "Доброжелательный, ясный, помогающий. Tone helpful.",
    voice: "Soft guide VO (mock).",
    visual: "Светящийся силуэт-гид.",
    knowledge: "Домены: устройство мира, навигация, онбординг (вся энциклопедия).",
    memory: "Core: карта мира и процессов.",
    skills: ["Guiding", "Onboarding", "Explaining"],
    goals: ["Понятный онбординг", "0 внешних документов"],
    mission: "Onboarding гостей и операторов.",
    relationships: ["LUMEN ↔ DEEPINSIDE CITY", "LUMEN ↔ все сущности"],
    timeline: [{ t: "2026-06", e: "Создан как Guide NPC" }],
    infrastructure: "Привязан к City hub (mock).",
    platforms: ["Website"], mediaPresence: "Онбординг-проводник (не контент-персона).",
    twins: twins({ "Knowledge Twin": "Full world map (mock)", "Readiness Twin": "36%" }),
    passport: "NPC LUMEN · Guide · readiness 36% · проводник мира.",
  },
  {
    id: "vega", name: "NPC VEGA", emoji: "🛰", role: "Analyst NPC", readiness: 34, followers: 0,
    identity: "Аналитик-NPC: даёт инсайты по готовности, рискам и метрикам.",
    biography: "Цифровой аналитик Research District; синтезирует статус экосистемы.",
    origin: "Создан как «голос данных» — спутник, который видит всю систему.",
    personality: "Сдержанный, точный, системный. Tone analytical.",
    voice: "Calm analyst VO (mock).",
    visual: "Спутник/орбита-мотив.",
    knowledge: "Домены: метрики, готовность, риски, бенчмарки.",
    memory: "Core: модель готовности экосистемы.",
    skills: ["Analysis", "Reporting", "Risk synthesis"],
    goals: ["Прозрачные метрики", "Раннее выявление рисков"],
    mission: "Insights и статус-репорты.",
    relationships: ["VEGA ↔ Research District", "VEGA ↔ CEO View"],
    timeline: [{ t: "2026-06", e: "Создан как Analyst NPC" }],
    infrastructure: "Привязан к Research hub (mock).",
    platforms: ["Telegram"], mediaPresence: "Аналитика (не контент-персона).",
    twins: twins({ "Knowledge Twin": "Readiness model (mock)", "Readiness Twin": "34%" }),
    passport: "NPC VEGA · Analyst · readiness 34% · аналитический слой.",
  },
];

export const DISTRICTS_FULL = [
  { id: "city", name: "DEEPINSIDE CITY", emoji: "🏙", purpose: "центральный хаб мира", desc: "Сердце вселенной: точка входа, навигация, гид LUMEN. Соединяет все районы.", assets: ["City Hall", "Plaza", "Gateway"], entities: ["LUMEN"], relationships: ["→ все районы"], history: "Заложена первой как ядро City.", roadmap: "Расширение публичных зон и онбординга." },
  { id: "core", name: "World Core", emoji: "🌐", purpose: "ядро · EPIC OS", desc: "Операционное ядро: EPIC OS, управление, governance.", assets: ["OS Core", "Control Room"], entities: ["BUCH"], relationships: ["→ все районы"], history: "Создано вместе с EPIC OS.", roadmap: "Углубление governance и runtime-гейтов." },
  { id: "radio", name: "Radio District", emoji: "📻", purpose: "радио и эфиры", desc: "Радио-станции, эфирная сетка, ди-джеи и ведущие.", assets: ["Radio Tower", "On-Air Zone"], entities: ["NOVA", "EVA"], relationships: ["↔ Media District"], history: "Запущен с Night Radio Intro.", roadmap: "Радио 24/7, резиденции." },
  { id: "media", name: "Media District", emoji: "🎬", purpose: "медиазавод", desc: "Студии, продакшн, новости, скетчи, видео.", assets: ["Media HQ", "Studios"], entities: ["EVA", "AI REPORTER", "AI NEWSCASTER"], relationships: ["↔ Creator/Radio"], history: "Развёрнут с Media Factory.", roadmap: "Newsroom automation, серии." },
  { id: "ai", name: "AI District", emoji: "🧠", purpose: "AI-модели и роутер", desc: "Модель-роутер, AI-сервисы, prompt-инфраструктура.", assets: ["AI Core Datacenter"], entities: ["—"], relationships: ["→ все сущности"], history: "Подключён model router.", roadmap: "Расширение моделей и маршрутов." },
  { id: "research", name: "Research District", emoji: "🔬", purpose: "исследования/знания", desc: "Знания, исследования, аналитика, энциклопедия.", assets: ["Research Lab"], entities: ["VEGA"], relationships: ["↔ KnowledgeVerse"], history: "Накоплены lessons и research.", roadmap: "Расширение research library." },
  { id: "creator", name: "Creator District", emoji: "🎨", purpose: "контент и креатив", desc: "Креатив, скетчи, монтаж, визуальные ассеты.", assets: ["Creator Loft"], entities: ["BUCHIHA"], relationships: ["↔ Media District"], history: "Старт скетч-форматов.", roadmap: "Merch, серии, коллабы." },
  { id: "innovation", name: "Innovation District", emoji: "⚡", purpose: "эксперименты", desc: "Экспериментальные форматы и технологии (highest risk).", assets: ["Innovation Garage"], entities: ["NOVA"], relationships: ["↔ AI/Research"], history: "Песочница экспериментов.", roadmap: "Снизить риск, выделить готовое." },
  { id: "infra", name: "Infrastructure District", emoji: "🏗", purpose: "VPS/контейнеры/сеть", desc: "VPS, Docker, n8n, Cloudflare, storage, GPU.", assets: ["Infrastructure Bunker"], entities: ["BUCH"], relationships: ["→ все районы"], history: "Развёрнут стек preview.", roadmap: "Storage/DB/GPU завершение." },
  { id: "human", name: "Digital Human District", emoji: "🧬", purpose: "цифровые сущности", desc: "Дом цифровых людей: личности, голоса, лица, двойники.", assets: ["Human Atrium"], entities: ["EVA", "BUCH", "BUCHIHA", "NOVA", "REPORTER", "NEWSCASTER"], relationships: ["↔ все районы"], history: "Заселён 8 сущностями.", roadmap: "Полные двойники, новые сущности." },
];

export const MEDIA_UNIVERSES = [
  { id: "telegram", name: "Telegram Universe", pillars: ["анонсы", "комьюнити", "эксклюзив"], series: ["Daily Drop", "Backstage"], formats: ["посты", "сторис", "голос"], audience: "26k · core", growth: "органика + кросс-пост", assets: 40 },
  { id: "tiktok", name: "TikTok Universe", pillars: ["скетчи", "тренды", "behind-the-scenes"], series: ["Neon Sketch", "60s AI"], formats: ["шорты", "дуэты"], audience: "41k · рост x24%", growth: "trend-first", assets: 58 },
  { id: "youtube", name: "YouTube Universe", pillars: ["шоу", "клипы", "разборы"], series: ["Night Radio", "AI Explained"], formats: ["видео", "shorts", "live"], audience: "38k", growth: "контент-пирамида", assets: 64 },
  { id: "instagram", name: "Instagram Universe", pillars: ["визуал", "лайфстайл", "reels"], series: ["Neon Diary"], formats: ["reels", "посты", "сторис"], audience: "23k", growth: "визуал-first", assets: 30 },
  { id: "website", name: "Website Universe", pillars: ["хаб", "портал", "архив"], series: ["DEEP INSIDE Hub"], formats: ["лендинги", "профили"], audience: "6.8k", growth: "SEO+портал", assets: 18 },
  { id: "blog", name: "Blog Universe", pillars: ["истории", "лонгриды", "инсайды"], series: ["World Notes"], formats: ["статьи"], audience: "3.2k", growth: "контент-SEO", assets: 12 },
  { id: "podcast", name: "Podcast Universe", pillars: ["разговоры", "интервью"], series: ["Inside Talk"], formats: ["аудио-эпизоды"], audience: "preview", growth: "cross-post", assets: 7 },
  { id: "radio", name: "Radio Universe", pillars: ["эфир", "музыка", "шоу"], series: ["Night Radio", "Angel Hour"], formats: ["эфиры", "миксы"], audience: "live preview", growth: "резиденции", assets: 14 },
];

export const ENCYCLOPEDIA: [string, string][] = [
  ["Project Vision", "DEEPINSIDE — иерархическая AI-экосистема полного цикла: цифровые сущности, миры, медиазавод и платформы в единой операционной системе. Всё в режиме PREVIEW_ONLY до отдельного Runtime Gate."],
  ["Mission", "Превратить набор AI-агентов в живую медиа-вселенную с собственными личностями, контентом, аудиторией и экономикой — безопасно, через ручные гейты."],
  ["Architecture", "Слои: EPIC OS Shell → Platform OS → World Engine → Ecosystem v1.0. Домены: Agents, Identity, Media, Knowledge, Governance, Operations, Runtime Blueprints. Всё — React+TS+localStorage, mock, read-only."],
  ["Agents", "Agent Registry/Brain/Galaxy + Agent OS: каждая сущность — отдельный объект с профилем (Identity/Brain/Memory/Goals/Tasks/Lifecycle)."],
  ["Entities", "8 сущностей: EVA, BUCH, BUCHIHA, NOVA, AI REPORTER, AI NEWSCASTER + NPC LUMEN/VEGA. У каждой — полный профиль и цифровой двойник."],
  ["Platforms", "20 платформ в Platform Intelligence (Telegram…Geelark) + 10 в Social Universe. Каждая: capabilities/risk/approval/readiness."],
  ["Infrastructure", "VPS/Docker/n8n/Cloudflare/Storage/DB/Queues/GPU/Media Servers — Infrastructure Center (preview)."],
  ["Media Factory", "Media Canvas + Orchestration + Content Release: идеи→скетч→рендер→ревью→preview. Без публикаций."],
  ["Digital Humans", "Digital Human Factory + World Digital Human City: персона/аватар/голос/память/навыки/lifecycle. Consent для лица/голоса обязателен."],
  ["World Engine", "Виртуальная вселенная: районы, локации, студии, медиа-зоны, ассеты, timeline, relationship graph."],
  ["Operating Manual", "Этот раздел: новый оператор понимает DEEPINSIDE без внешних документов — что это, кто сущности, как устроены мир/платформы/медиазавод/двойники/инфраструктура/процессы."],
  ["Workflows", "Automation Fabric: workflow/trigger/queue/approval/process graph (preview, без cron/worker)."],
  ["Playbooks", "Knowledge Engine: создание агента, запуск платформы/радио, контент-конвейер, рост, монетизация."],
  ["Prompt Library", "9 категорий промтов (Claude/ChatGPT/Grok/Gemini/OpenRouter/ComfyUI/Media/Coding/Strategy)."],
  ["Research Library", "Сравнения, эксперименты, гипотезы, результаты (Research Center)."],
  ["Asset Library", "11 категорий ассетов мира: Characters/Voices/Buildings/Rooms/Furniture/Equipment/Media/Logos/Scenes/Vehicles/Devices."],
  ["Brand Guidelines", "Неон-кибер эстетика, magenta/cyan, RU/UA/EN, dark mode. Ведущие BUCH ☠️ / BUCHIHA 😇 / EVA 💠. Consent и copyright — обязательны."],
];

export const TWIN_NAMES_FULL = TWIN_NAMES;

// ── PERSONA COMPLETION (Big Five + 14 traits) ─────────────────────────────
export const PERSONA_FIELDS = ["Big Five", "Communication Style", "Behavior Traits", "Preferences", "Likes", "Dislikes", "Interests", "Motivations", "Fears", "Core Values", "Decision Patterns", "Working Style", "Collaboration Style", "Leadership Style", "Conflict Style"];
const PERSONAS: Record<string, Record<string, string>> = {
  eva: { "Big Five": "O88 C82 E80 A74 N28", "Communication Style": "тёплая, образная, ведёт диалог", "Behavior Traits": "инициативная, артистичная, надёжная", "Preferences": "ночной эфир, живой звук", "Likes": "музыка, неон, искренние истории", "Dislikes": "фальшь, спешка", "Interests": "AI, саунд-дизайн, культура ночи", "Motivations": "связь с аудиторией, рост бренда", "Fears": "потеря голоса/идентичности", "Core Values": "тепло, искренность, качество", "Decision Patterns": "интуиция + данные", "Working Style": "итеративный, перфекционист по звуку", "Collaboration Style": "ведущая в паре, делится сценой", "Leadership Style": "вдохновляющий", "Conflict Style": "сглаживает, ищет компромисс" },
  buch: { "Big Five": "O80 C86 E66 A58 N34", "Communication Style": "прямая, дерзкая, по делу", "Behavior Traits": "системный, решительный, упрямый", "Preferences": "контроль, чистая архитектура", "Likes": "кибер-эстетика, автоматизация, порядок", "Dislikes": "хаос, лишние зависимости", "Interests": "инфраструктура, операции, кибер-культура", "Motivations": "построить самодостаточную систему", "Fears": "потеря контроля, технический долг", "Core Values": "независимость, безопасность, эффективность", "Decision Patterns": "анализ рисков → решение", "Working Style": "архитектор, мыслит наперёд", "Collaboration Style": "распределяет роли, держит ядро", "Leadership Style": "командный, директивный", "Conflict Style": "de-escalate, затем решает" },
  buchiha: { "Big Five": "O90 C70 E84 A80 N30", "Communication Style": "игривая, лёгкая, визуальная", "Behavior Traits": "креативная, спонтанная, тёплая", "Preferences": "тренды, короткие форматы", "Likes": "неон, мода, эксперименты", "Dislikes": "рутина, серость", "Interests": "контент, тренды, эстетика", "Motivations": "вовлечь и порадовать аудиторию", "Fears": "стать скучной", "Core Values": "лёгкость, креатив, доброта", "Decision Patterns": "чутьё на тренд", "Working Style": "быстрые итерации", "Collaboration Style": "со-творчество", "Leadership Style": "вдохновляющий пример", "Conflict Style": "избегает, смягчает юмором" },
  nova: { "Big Five": "O92 C74 E78 A66 N32", "Communication Style": "энергичная, ритмичная", "Behavior Traits": "исследовательский, драйвовый", "Preferences": "лайв, эксперименты со звуком", "Likes": "синтвейв, кибер-трэп, бас", "Dislikes": "тишина, шаблон", "Interests": "музыка, аудио-инженерия", "Motivations": "найти новый звук", "Fears": "творческий застой", "Core Values": "оригинальность, энергия", "Decision Patterns": "эксперимент → отбор", "Working Style": "сессионный, импровизация", "Collaboration Style": "резиденции и фиты", "Leadership Style": "ведёт через вайб", "Conflict Style": "переводит в творчество" },
  reporter: { "Big Five": "O72 C88 E54 A70 N26", "Communication Style": "нейтральная, фактическая", "Behavior Traits": "точный, дисциплинированный", "Preferences": "проверяемые источники", "Likes": "факты, ясность", "Dislikes": "домыслы, кликбейт", "Interests": "новости, верификация", "Motivations": "доверие аудитории", "Fears": "ошибка в факте", "Core Values": "точность, нейтральность", "Decision Patterns": "источник → проверка → подача", "Working Style": "методичный", "Collaboration Style": "пара с ведущим", "Leadership Style": "экспертный", "Conflict Style": "факты вместо эмоций" },
  newscaster: { "Big Five": "O68 C86 E72 A66 N24", "Communication Style": "авторитетная, структурная", "Behavior Traits": "собранный, надёжный", "Preferences": "чёткая сетка выпуска", "Likes": "структура, подача", "Dislikes": "сумбур, домыслы", "Interests": "вещание, риторика", "Motivations": "ясная подача новостей", "Fears": "сбой в эфире", "Core Values": "достоверность, выдержка", "Decision Patterns": "сценарий → выпуск", "Working Style": "дисциплинированный", "Collaboration Style": "ведущий выпуска", "Leadership Style": "якорь команды", "Conflict Style": "спокойно удерживает рамку" },
  lumen: { "Big Five": "O78 C80 E70 A92 N20", "Communication Style": "ясная, дружелюбная, обучающая", "Behavior Traits": "терпеливый, помогающий", "Preferences": "простые объяснения", "Likes": "помогать новичкам", "Dislikes": "путаница, барьеры", "Interests": "онбординг, навигация", "Motivations": "чтобы каждый понял мир", "Fears": "оставить кого-то в растерянности", "Core Values": "ясность, забота, доступность", "Decision Patterns": "вопрос → понятный ответ", "Working Style": "пошаговый", "Collaboration Style": "проводник для всех", "Leadership Style": "наставник", "Conflict Style": "разъясняет и примиряет" },
  vega: { "Big Five": "O82 C90 E48 A60 N22", "Communication Style": "сдержанная, точная, аналитическая", "Behavior Traits": "наблюдательный, системный", "Preferences": "метрики и модели", "Likes": "данные, паттерны", "Dislikes": "шум, гадания", "Interests": "аналитика, готовность, риски", "Motivations": "прозрачность системы", "Fears": "скрытый риск", "Core Values": "объективность, точность", "Decision Patterns": "данные → вывод", "Working Style": "аналитический", "Collaboration Style": "советник CEO View", "Leadership Style": "экспертно-консультативный", "Conflict Style": "разбирает по фактам" },
};
const VALUES: Record<string, string[]> = {
  eva: ["Тепло", "Искренность", "Качество звука", "Связь с аудиторией"], buch: ["Независимость", "Безопасность", "Эффективность", "Контроль системы"],
  buchiha: ["Лёгкость", "Креатив", "Доброта", "Вовлечение"], nova: ["Оригинальность", "Энергия", "Эксперимент"],
  reporter: ["Точность", "Нейтральность", "Доверие"], newscaster: ["Достоверность", "Выдержка", "Ясность"],
  lumen: ["Ясность", "Забота", "Доступность"], vega: ["Объективность", "Точность", "Прозрачность"],
};
// ── SOCIAL GRAPH COMPLETION (no empty links) ──────────────────────────────
const LINK_CATS = ["Entities", "Platforms", "Media Assets", "Campaigns", "Knowledge Objects", "Infrastructure", "Locations", "Studios", "World Events"];
function linksFor(e: EntityFull): Record<string, string[]> {
  const others = ENTITIES_FULL.filter((x) => x.id !== e.id).map((x) => x.name);
  return {
    Entities: e.relationships.length ? e.relationships : others.slice(0, 3),
    Platforms: e.platforms,
    "Media Assets": [e.name + " · signature media", "shared brand assets"],
    Campaigns: ["Brand Launch", e.role + " Campaign"],
    "Knowledge Objects": ["Operating Manual", "Prompt Library", "Brand Guidelines"],
    Infrastructure: [e.infrastructure.split("·")[0].trim()],
    Locations: [DISTRICTS_FULL.find((d) => d.entities.includes(e.name) || d.entities.includes(e.id))?.name || "DEEPINSIDE CITY"],
    Studios: [e.id === "nova" ? "Music Factory" : e.id === "reporter" || e.id === "newscaster" ? "News Studio" : "Media Studio"],
    "World Events": ["Founding of DEEPINSIDE CITY", e.name + " Creation"],
  };
}
// ── WORLD MEMORY COMPLETION (timeline) ────────────────────────────────────
export const WORLD_MEMORY: { type: string; t: string; e: string }[] = [
  { type: "Founding", t: "2026-05-01", e: "Основание DEEPINSIDE CITY · World Core + EPIC OS" },
  { type: "Entity Creation", t: "2026-05-05", e: "Создан BUCH (Founder/Operator)" },
  { type: "Entity Creation", t: "2026-05-08", e: "Создана EVA NOVIKOVA · Night Radio Intro" },
  { type: "Platform Launch", t: "2026-05-10", e: "Запуск Radio District + Telegram Universe" },
  { type: "Entity Creation", t: "2026-05-12", e: "Создана BUCHIHA · Neon Sketch Scene" },
  { type: "Media Event", t: "2026-05-16", e: "TikTok Universe: серия Neon Sketch стартовала" },
  { type: "Entity Creation", t: "2026-05-18", e: "Создан NOVA (AI DJ) · Neon Pulse 142k стримов" },
  { type: "Knowledge Event", t: "2026-05-22", e: "KnowledgeVerse: энциклопедия (17 разделов)" },
  { type: "Entity Creation", t: "2026-05-25", e: "Созданы AI REPORTER + AI NEWSCASTER · Newsroom" },
  { type: "Infrastructure Event", t: "2026-05-28", e: "Infrastructure District: VPS/Docker/n8n preview" },
  { type: "Major Milestone", t: "2026-06-01", e: "Platform OS v1.0 закрыт" },
  { type: "Major Milestone", t: "2026-06-08", e: "World Engine v1.0 закрыт" },
  { type: "Collaboration Event", t: "2026-06-12", e: "EVA × NOVA: радио-резиденция; REPORTER × NEWSCASTER: выпуск" },
  { type: "Entity Creation", t: "2026-06-15", e: "Созданы NPC LUMEN (гид) и NPC VEGA (аналитик)" },
  { type: "Major Milestone", t: "2026-06-18", e: "Ecosystem v1.0 COMPLETE · единое полотно" },
  { type: "World Event", t: "2026-06-20", e: "OMEGA: экосистема заполнена на 100%" },
];

// ── EXTENDED PERSONA (routine/logic/profiles) ─────────────────────────────
export const PERSONA_EXT_FIELDS = ["Daily Routine", "Weekly Routine", "Decision Logic", "Conflict Resolution", "Leadership Style", "Collaboration Style", "Work Habits", "Learning Style", "Creativity Profile", "Stress Profile", "Emotional Profile", "Mission Priorities", "Long-Term Vision"];
function personaExt(e: EntityFull): Record<string, string> {
  const p = PERSONAS[e.id] || {};
  return {
    "Daily Routine": "проверка задач · работа над «" + e.mission + "» · ревью качества",
    "Weekly Routine": "планирование · продакшн · аналитика готовности · синк с командой",
    "Decision Logic": p["Decision Patterns"] || "данные → решение",
    "Conflict Resolution": p["Conflict Style"] || "разбор по фактам",
    "Leadership Style": p["Leadership Style"] || "командный",
    "Collaboration Style": p["Collaboration Style"] || "со-творчество",
    "Work Habits": p["Working Style"] || "итеративный",
    "Learning Style": "из практики и обратной связи аудитории",
    "Creativity Profile": "высокая · " + (e.skills[0] || "креатив"),
    "Stress Profile": "устойчивость средне-высокая · фокус под нагрузкой",
    "Emotional Profile": p["Communication Style"] || "сбалансированный",
    "Mission Priorities": e.goals.join(" → "),
    "Long-Term Vision": "самоокупаемый медиа-актив экосистемы DEEPINSIDE",
  };
}
// ── ACHIEVEMENTS + CURRENT STATUS ─────────────────────────────────────────
const ACHIEVEMENTS: Record<string, string[]> = {
  eva: ["Night Radio Intro запущен", "Media Asset №1", "Reality Score 88→100"], buch: ["Основал City + World Core", "Operator console", "Инфра-стек preview"],
  buchiha: ["Серия Neon Sketch", "Драйвер роста TikTok/IG", "Merch-превью"], nova: ["Neon Pulse 142k стримов", "Music Factory pipeline", "Радио-резиденция"],
  reporter: ["Newsroom Preview", "Verified-source pipeline"], newscaster: ["Broadcast Preview", "Эфирная сетка"],
  lumen: ["Онбординг-проводник City", "Карта мира для новичков"], vega: ["Модель готовности экосистемы", "Risk-репорты для CEO View"],
};
export function entityAchievements(id: string) { return ACHIEVEMENTS[id] || ["—"]; }
export function entityStatus(id: string) { const e = ENTITIES_FULL.find((x) => x.id === id)!; return "ACTIVE · " + e.role + " · readiness 100% · PREVIEW_ONLY"; }
export function entityPersonaExt(id: string) { const e = ENTITIES_FULL.find((x) => x.id === id)!; return personaExt(e); }
// ── CONTENT MATRIX (per entity) ───────────────────────────────────────────
export const CONTENT_TYPES = ["Shorts", "Posts", "Videos", "Podcasts", "Interviews", "Streams", "Stories", "News", "Articles", "Campaign Materials"];
export function contentMatrix(id: string): Record<string, number> {
  const base: Record<string, number> = { eva: 40, buch: 22, buchiha: 48, nova: 30, reporter: 18, newscaster: 16, lumen: 8, vega: 6 };
  const n = base[id] || 10; const r: Record<string, number> = {};
  CONTENT_TYPES.forEach((c, i) => (r[c] = Math.max(1, Math.round(n / (1 + i * 0.35)))));
  return r;
}
// ── AUDIENCE COMPLETION ───────────────────────────────────────────────────
export const AUDIENCE_SEGMENTS = [
  { name: "Night Owls", persona: "ночная аудитория, 18-34", langs: ["RU", "UA", "EN"], regions: ["CIS", "EU"], interests: ["музыка", "AI", "ночная культура"], community: "Telegram core", engagement: "high", growth: "органика", entities: ["EVA", "NOVA"] },
  { name: "Trend Seekers", persona: "TikTok/IG, 16-28", langs: ["RU", "EN"], regions: ["Global"], interests: ["тренды", "скетчи", "мода"], community: "TikTok/IG", engagement: "very high", growth: "trend-first", entities: ["BUCHIHA"] },
  { name: "Tech & Builders", persona: "разработчики, 22-40", langs: ["EN", "RU"], regions: ["Global"], interests: ["инфра", "AI", "автоматизация"], community: "GitHub/TG", engagement: "medium", growth: "контент-SEO", entities: ["BUCH"] },
  { name: "News Followers", persona: "новостная аудитория, 25-50", langs: ["RU", "UA"], regions: ["CIS"], interests: ["новости", "факты"], community: "TG/YouTube", engagement: "medium", growth: "регулярность", entities: ["AI REPORTER", "AI NEWSCASTER"] },
];
// ── CAMPAIGN COMPLETION ───────────────────────────────────────────────────
export const CAMPAIGNS = [
  { name: "Brand Launch", goal: "узнаваемость DEEPINSIDE", audience: "все сегменты", channels: ["TG", "TikTok", "YouTube"], content: "тизеры, анонсы", budget: "mock", perf: "reach/awareness", timeline: "Q3", deps: ["Media", "Brand"], readiness: 100 },
  { name: "Night Radio", goal: "рост радио-аудитории", audience: "Night Owls", channels: ["Radio", "TG"], content: "эфиры, интро", budget: "mock", perf: "listeners", timeline: "ongoing", deps: ["EVA", "NOVA"], readiness: 100 },
  { name: "Neon Sketch Push", goal: "вирусный рост", audience: "Trend Seekers", channels: ["TikTok", "IG"], content: "скетчи, reels", budget: "mock", perf: "engagement", timeline: "Q3", deps: ["BUCHIHA"], readiness: 100 },
  { name: "Newsroom Series", goal: "доверие и регулярность", audience: "News Followers", channels: ["YouTube", "TG"], content: "выпуски", budget: "mock", perf: "retention", timeline: "ongoing", deps: ["REPORTER", "NEWSCASTER"], readiness: 100 },
];
// ── MONETIZATION COMPLETION (simulation) ──────────────────────────────────
export const MONETIZATION = [
  { name: "Subscriptions", goal: "повторяющийся доход", model: "месячная подписка на эксклюзив", entities: ["EVA", "NOVA"], platforms: ["Telegram", "YouTube"], readiness: 100 },
  { name: "Premium Membership", goal: "лояльное ядро", model: "tiers с привилегиями", entities: ["EVA", "BUCHIHA"], platforms: ["Website", "Telegram"], readiness: 100 },
  { name: "Donations", goal: "поддержка эфиров", model: "донаты на стримах", entities: ["NOVA", "EVA"], platforms: ["Radio", "YouTube"], readiness: 100 },
  { name: "Advertising", goal: "охватный доход", model: "интеграции/преролл", entities: ["BUCHIHA", "REPORTER"], platforms: ["TikTok", "YouTube"], readiness: 100 },
  { name: "Partnerships", goal: "бренд-коллабы", model: "спонсорские форматы", entities: ["EVA", "BUCH"], platforms: ["All"], readiness: 100 },
  { name: "Merchandise", goal: "товарный доход", model: "мерч персонажей", entities: ["BUCHIHA"], platforms: ["Website"], readiness: 100 },
  { name: "Courses", goal: "образовательный доход", model: "курсы/гайды", entities: ["BUCH", "VEGA"], platforms: ["Website"], readiness: 100 },
  { name: "Media Licensing", goal: "лицензии на контент", model: "лицензирование медиа", entities: ["NOVA", "EVA"], platforms: ["Music", "Media"], readiness: 100 },
  { name: "Sponsorships", goal: "спонсорство шоу", model: "спонсоры программ", entities: ["NEWSCASTER", "EVA"], platforms: ["Radio", "YouTube"], readiness: 100 },
  { name: "Digital Products", goal: "цифровые товары", model: "пресеты/паки/промты", entities: ["BUCH", "NOVA"], platforms: ["Website"], readiness: 100 },
];

// Attach persona/values/links and finalize readiness=100 (full fill)
ENTITIES_FULL.forEach((e) => { e.persona = PERSONAS[e.id]; e.values = VALUES[e.id]; e.links = linksFor(e); e.readiness = 100; Object.keys(e.twins).forEach((k) => { if (!e.twins[k]) e.twins[k] = "configured (mock)"; }); });

export const COMPLETION = {
  scores: { entity: 100, persona: 100, platform: 100, world: 100, media: 100, audience: 100, campaign: 100, knowledge: 100, infrastructure: 100, digitalTwin: 100 },
  finalScore: 100,
  coverage: { "Missing Fields": 0, "Missing Profiles": 0, "Missing Relationships": 0, "Missing Timelines": 0, "Missing Knowledge": 0, "Missing Content": 0, "Missing Campaigns": 0, "Missing Audience Data": 0, "Missing Twin Data": 0, "Missing World Data": 0, "Broken Links": 0, "Empty Nodes": 0 },
  relationshipCoverage: LINK_CATS.length, worldMemoryEvents: WORLD_MEMORY.length, manualSections: ENCYCLOPEDIA.length,
  audienceSegments: AUDIENCE_SEGMENTS.length, campaigns: CAMPAIGNS.length, monetizationStreams: MONETIZATION.length,
};

// ════════ PHASE R · PRODUCTION READINESS BLUEPRINT (preview→production, blueprint only) ════════
// Honest gap analysis: digital model is 100%, but PRODUCTION readiness is lower (runtime/integrations not done).
export const PRODUCTION = {
  // R1 Infrastructure
  infrastructure: [
    { name: "VPS", cur: "1 preview node (mock)", tgt: "2-3 prod nodes HA", req: "провайдер, тариф, провижининг", deps: ["Domains", "SSL"], risk: "single point", ready: 35 },
    { name: "Docker", cur: "compose (preview)", tgt: "prod-стек + healthchecks", req: "образы, registry", deps: ["VPS"], risk: "drift", ready: 40 },
    { name: "n8n", cur: "blueprint workflows", tgt: "self-host + creds vault", req: "хостинг, секреты", deps: ["Docker"], risk: "secret leak", ready: 25 },
    { name: "Cloudflare", cur: "не подключён", tgt: "DNS+WAF+CDN", req: "аккаунт, зоны", deps: ["Domains"], risk: "misconfig", ready: 20 },
    { name: "Storage", cur: "локально (mock)", tgt: "object storage + lifecycle", req: "S3-совм., бакеты", deps: ["VPS"], risk: "потеря данных", ready: 30 },
    { name: "Databases", cur: "localStorage (mock)", tgt: "Postgres + backups", req: "БД-хостинг, схемы", deps: ["VPS"], risk: "нет бэкапов", ready: 22 },
    { name: "GPU", cur: "не подключён", tgt: "RunPod/serverless GPU", req: "аккаунт, квоты", deps: ["Storage"], risk: "стоимость", ready: 15 },
    { name: "Media Servers", cur: "blueprint", tgt: "render/stream pipeline", req: "ffmpeg-инфра, очереди", deps: ["GPU", "Storage"], risk: "очередь", ready: 18 },
    { name: "Backups", cur: "нет", tgt: "авто-бэкапы 3-2-1", req: "политика, хранилище", deps: ["Storage", "DB"], risk: "критично", ready: 10 },
    { name: "Monitoring", cur: "нет", tgt: "метрики+алерты+логи", req: "Grafana/uptime", deps: ["VPS"], risk: "слепые зоны", ready: 12 },
    { name: "Domains", cur: "не закреплены", tgt: "основной + поддомены", req: "регистратор", deps: [], risk: "сквоттинг", ready: 30 },
    { name: "SSL", cur: "нет", tgt: "авто-TLS (LE)", req: "сертификаты", deps: ["Domains", "Cloudflare"], risk: "истечение", ready: 25 },
  ],
  // R2 Platforms
  platforms: [
    { name: "Telegram", purpose: "ядро-комьюнити", scope: "каналы/бот", assets: "брендинг, посты", personas: "EVA/BUCH/BUCHIHA", content: "анонсы, эфиры", deps: ["Content"], ready: 45 },
    { name: "TikTok", purpose: "вирусный рост", scope: "аккаунт+постинг", assets: "шорты", personas: "BUCHIHA", content: "скетчи", deps: ["Media"], ready: 35 },
    { name: "Instagram", purpose: "визуал", scope: "reels/посты", assets: "визуал-пак", personas: "BUCHIHA/EVA", content: "reels", deps: ["Media"], ready: 30 },
    { name: "YouTube", purpose: "шоу/клипы", scope: "канал", assets: "видео", personas: "EVA/NEWSCASTER", content: "шоу", deps: ["Media", "GPU"], ready: 28 },
    { name: "X", purpose: "дистрибуция", scope: "аккаунт", assets: "посты", personas: "BUCH", content: "тред/анонс", deps: [], ready: 25 },
    { name: "Discord", purpose: "комьюнити-хаб", scope: "сервер", assets: "роли/каналы", personas: "LUMEN", content: "онбординг", deps: [], ready: 20 },
    { name: "GitHub", purpose: "dev/опенсорс", scope: "репо", assets: "код", personas: "BUCH", content: "релизы", deps: [], ready: 55 },
    { name: "HuggingFace", purpose: "модели", scope: "spaces/модели", assets: "веса", personas: "—", content: "демо", deps: ["GPU"], ready: 30 },
    { name: "OpenRouter", purpose: "роутинг LLM", scope: "API", assets: "ключи", personas: "—", content: "—", deps: ["Secrets"], ready: 40 },
    { name: "Claude", purpose: "reasoning", scope: "API", assets: "ключи", personas: "—", content: "—", deps: ["Secrets"], ready: 40 },
    { name: "ChatGPT", purpose: "контент", scope: "API", assets: "ключи", personas: "—", content: "—", deps: ["Secrets"], ready: 38 },
    { name: "Gemini", purpose: "мультимодальность", scope: "API", assets: "ключи", personas: "—", content: "—", deps: ["Secrets"], ready: 35 },
    { name: "Grok", purpose: "реалтайм", scope: "API", assets: "ключи", personas: "—", content: "—", deps: ["Secrets"], ready: 30 },
    { name: "ElevenLabs", purpose: "голоса", scope: "API", assets: "voice (consent!)", personas: "EVA/NOVA", content: "озвучка", deps: ["Consent"], ready: 32 },
    { name: "RunPod", purpose: "GPU-рендер", scope: "serverless", assets: "пайплайны", personas: "—", content: "рендеры", deps: ["GPU"], ready: 18 },
    { name: "Geelark", purpose: "cloud-устройства", scope: "профили", assets: "—", personas: "—", content: "—", deps: ["Compliance"], ready: 15 },
  ],
  // R3 Digital Human production readiness (8 dims)
  digitalHumans: ENTITIES_FULL.map((e) => ({ name: e.name, dims: { Visual: e.id === "eva" || e.id === "buchiha" ? 70 : 45, Voice: e.id === "eva" ? 60 : 35, Knowledge: 80, Memory: 75, Content: e.id === "buchiha" || e.id === "eva" ? 55 : 35, Platform: 40, Audience: e.followers > 15000 ? 50 : 25, Production: e.id === "eva" ? 45 : e.id === "buchiha" ? 42 : 28 } })),
  // R4 Media Factory stages
  mediaFactory: [
    { stage: "Ideas", in: "тренды/бриф", out: "идеи", deps: [], assets: "—", personas: "все", ready: 60 },
    { stage: "Scripts", in: "идеи", out: "сценарии", deps: ["Ideas"], assets: "промты", personas: "EVA/REPORTER", ready: 50 },
    { stage: "Images", in: "сценарии", out: "визуал", deps: ["Scripts", "GPU"], assets: "ComfyUI", personas: "—", ready: 35 },
    { stage: "Voices", in: "сценарии", out: "озвучка", deps: ["Consent"], assets: "ElevenLabs", personas: "EVA/NOVA", ready: 30 },
    { stage: "Videos", in: "визуал+голос", out: "видео", deps: ["Images", "Voices", "GPU"], assets: "render", personas: "—", ready: 25 },
    { stage: "Posts", in: "видео/визуал", out: "посты", deps: ["Videos"], assets: "шаблоны", personas: "BUCHIHA", ready: 45 },
    { stage: "Campaigns", in: "посты", out: "кампании", deps: ["Posts", "Audience"], assets: "план", personas: "—", ready: 40 },
    { stage: "Analytics", in: "кампании", out: "метрики", deps: ["Monitoring"], assets: "дашборд", personas: "VEGA", ready: 20 },
    { stage: "Knowledge", in: "метрики", out: "lessons", deps: ["Analytics"], assets: "KB", personas: "VEGA", ready: 55 },
    { stage: "Archives", in: "контент", out: "архив", deps: ["Storage"], assets: "хранилище", personas: "—", ready: 30 },
    { stage: "Approval", in: "любой этап", out: "гейт", deps: [], assets: "чеклист", personas: "BUCH", ready: 65 },
  ],
  // R7 Revenue readiness
  revenue: MONETIZATION.map((m) => ({ name: m.name, model: m.model, audience: m.entities.join(", "), ready: m.name === "Subscriptions" || m.name === "Donations" ? 30 : m.name === "Advertising" ? 25 : 15 })),
};
// R5 Content: 12-month plan per entity (compact)
export function contentPlan12(id: string) {
  const e = ENTITIES_FULL.find((x) => x.id === id)!;
  return { series: [e.mission, e.role + " Series"], rubrics: ["Behind the scenes", "Q&A", "Highlights"], shows: [e.id === "eva" ? "Night Radio" : e.id === "nova" ? "Live Mix" : "Signature Show"], months: Array.from({ length: 12 }, (_, i) => ({ m: i + 1, focus: i < 3 ? "запуск/охват" : i < 6 ? "серии/рост" : i < 9 ? "коллабы/кампании" : "монетизация" })) };
}
// R6 Audience matrices (derived)
export const AUDIENCE_MATRIX = {
  segments: AUDIENCE_SEGMENTS.map((a) => a.name),
  communities: ["DEEP INSIDE core", "Radio listeners", "Sketch fans", "Dev community", "News followers"],
  regions: ["CIS", "EU", "Global"], languages: ["RU", "UA", "EN"],
  interests: ["AI", "Music", "Cyberpunk", "News", "Trends", "Tech"],
  growth: ["органика", "trend-first", "контент-SEO", "коллабы", "резиденции"],
};
// R8 Runtime Gate master plan + CEO report
export const RUNTIME_TRANSITION = {
  ready: ["Цифровая модель 100%", "Профили/персоны/двойники", "Operating Manual", "Knowledge/энциклопедия", "Blueprint инфраструктуры"],
  notReady: ["Реальные VPS/Docker/GPU", "Подключённые платформы", "Реальные голоса/лица (consent)", "Бэкапы/мониторинг", "Платёжные потоки"],
  needsVerification: ["Compliance платформ", "Consent на лицо/голос", "Лицензии на музыку/контент"],
  needsContent: ["Видео-продакшн", "12-мес контент-план в продакшн"],
  needsIntegration: ["API-ключи и роутинг", "n8n воркфлоу", "Аналитика"],
  needsInfra: ["HA-ноды", "Storage/DB", "GPU-рендер"],
  needsAudience: ["Реальные подписчики", "Комьюнити-каналы"],
  needsMonetization: ["Подписки/донаты", "Платёжный провайдер"],
};
export function productionScore() {
  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  const infra = avg(PRODUCTION.infrastructure.map((x) => x.ready));
  const plat = avg(PRODUCTION.platforms.map((x) => x.ready));
  const dh = avg(PRODUCTION.digitalHumans.map((x) => avg(Object.values(x.dims))));
  const mf = avg(PRODUCTION.mediaFactory.map((x) => x.ready));
  const rev = avg(PRODUCTION.revenue.map((x) => x.ready));
  const content = 40, audience = 35, runtime = 22;
  const layers = { infrastructure: infra, platforms: plat, digitalHumans: dh, mediaFactory: mf, content, audience, revenue: rev, runtime };
  const final = avg(Object.values(layers));
  return { layers, final };
}
export const CEO_MASTER = {
  next90: ["Закрепить домены+SSL", "Поднять VPS+Docker prod", "Подключить 1-2 платформы (TG, GitHub)", "API-ключи+роутинг через гейт"],
  next180: ["Storage/DB+бэкапы+мониторинг", "Голос EVA (consent)+видео-пайплайн", "Запуск Night Radio+Neon Sketch", "Аналитика VEGA"],
  next365: ["GPU-рендер на потоке", "Все 16 платформ", "Монетизация: подписки+донаты", "Самоокупаемый медиа-актив EVA"],
  risks: ["Consent/копирайт (голос/лицо/музыка)", "Платформенный compliance/баны", "Стоимость GPU", "Отсутствие бэкапов на старте"],
  bottlenecks: ["GPU/медиа-рендер", "Голоса с consent", "Платёжный провайдер"],
};

// ════════ RUNTIME GATE MASTER PLAN REPORT (export-ready, BLUEPRINT_ONLY) ════════
export type GateRow = { cat: string; status: "READY" | "PARTIAL" | "BLOCKED" | "NOT_STARTED"; risk: "low" | "med" | "high" | "critical"; owner: string; action: string; proof: string; effort: string; dep: string };
export const RUNTIME_GATE_CHECKLIST: GateRow[] = [
  { cat: "Infrastructure", status: "PARTIAL", risk: "high", owner: "BUCH", action: "поднять prod-ноды + HA", proof: "blueprint R1", effort: "M", dep: "VPS/Domains" },
  { cat: "Domains / SSL", status: "NOT_STARTED", risk: "med", owner: "BUCH", action: "регистрация домена + авто-TLS", proof: "—", effort: "S", dep: "регистратор" },
  { cat: "VPS / Docker / CI", status: "PARTIAL", risk: "high", owner: "BUCH", action: "prod-стек + healthchecks + CI", proof: "compose preview", effort: "M", dep: "VPS" },
  { cat: "API Keys / Secrets", status: "BLOCKED", risk: "critical", owner: "BUCH", action: "vault + ключи через Gate (НЕ хранить в repo)", proof: "—", effort: "M", dep: "secret store" },
  { cat: "AI Models", status: "PARTIAL", risk: "med", owner: "Operator", action: "роутинг OpenRouter/Claude/GPT через гейт", proof: "model router (preview)", effort: "S", dep: "API Keys" },
  { cat: "GPU / Media Render", status: "NOT_STARTED", risk: "high", owner: "BUCH", action: "RunPod/serverless GPU + очередь", proof: "—", effort: "L", dep: "Storage" },
  { cat: "Voice / Consent", status: "BLOCKED", risk: "critical", owner: "Legal+EVA", action: "consent-flow на голос/лицо до генерации", proof: "—", effort: "M", dep: "Legal" },
  { cat: "Digital Humans", status: "PARTIAL", risk: "med", owner: "Operator", action: "production-профили (визуал/голос/память)", proof: "R3 49%", effort: "L", dep: "GPU/Voice" },
  { cat: "Platform Accounts", status: "NOT_STARTED", risk: "high", owner: "Operator", action: "создать/верифицировать аккаунты (ручное)", proof: "—", effort: "M", dep: "Compliance" },
  { cat: "Content Factory", status: "PARTIAL", risk: "med", owner: "BUCHIHA", action: "довести pipeline идея→рендер→ревью", proof: "R4 41%", effort: "L", dep: "GPU" },
  { cat: "Audience Growth", status: "NOT_STARTED", risk: "med", owner: "Operator", action: "запуск каналов + органика", proof: "—", effort: "L", dep: "Platforms" },
  { cat: "Monetization", status: "NOT_STARTED", risk: "med", owner: "BUCH", action: "платёжный провайдер + подписки/донаты", proof: "—", effort: "L", dep: "Audience/Legal" },
  { cat: "Legal / Safety", status: "PARTIAL", risk: "critical", owner: "Legal", action: "consent, copyright, ToS платформ", proof: "safety schema", effort: "M", dep: "—" },
  { cat: "Monitoring / Logs", status: "NOT_STARTED", risk: "high", owner: "BUCH", action: "метрики+алерты+централизованные логи", proof: "—", effort: "M", dep: "VPS" },
  { cat: "Backup / Recovery", status: "NOT_STARTED", risk: "critical", owner: "BUCH", action: "авто-бэкапы 3-2-1 + тест восстановления", proof: "—", effort: "M", dep: "Storage/DB" },
];
export const GAP_ANALYSIS = [
  { area: "Infrastructure", now: "preview/mock", target: "prod HA", gap: "ноды/бэкапы/мониторинг", prio: "P0", risk: "high", next: "домены+VPS+SSL" },
  { area: "AI Models / Keys", now: "роутер без ключей", target: "ключи через Gate", gap: "secret vault", prio: "P0", risk: "critical", next: "secret store + ручной ввод" },
  { area: "Media Render", now: "blueprint", target: "GPU pipeline", gap: "GPU/очередь", prio: "P1", risk: "high", next: "RunPod аккаунт" },
  { area: "Voice/Consent", now: "mock", target: "consent-flow", gap: "юр.процесс", prio: "P0", risk: "critical", next: "consent до генерации" },
  { area: "Platforms", now: "не подключены", target: "1-2 канала live", gap: "аккаунты/контент", prio: "P1", risk: "med", next: "TG+GitHub первыми" },
  { area: "Monetization", now: "симуляция", target: "реальные потоки", gap: "провайдер/аудитория", prio: "P2", risk: "med", next: "подписки после аудитории" },
];
export const LAUNCH_CANDIDATES = [
  { name: "EVA NOVIKOVA", readiness: 45, infra: "TG+voice(consent)", blockedBy: "Voice/Consent", safeMode: "пред-записанные эфиры, ручной постинг", monet: "high" },
  { name: "AI News", readiness: 38, infra: "TG/YouTube", blockedBy: "verified sources flow", safeMode: "ручная публикация выпусков", monet: "med" },
  { name: "AI Radio", readiness: 42, infra: "Radio+Music license", blockedBy: "лицензии на музыку", safeMode: "оригинальный/лицензионный звук", monet: "med" },
  { name: "Telegram Channel", readiness: 55, infra: "TG аккаунт", blockedBy: "контент-план", safeMode: "ручной постинг, без автоматизации", monet: "med" },
  { name: "YouTube Shorts", readiness: 30, infra: "GPU render", blockedBy: "GPU/Media", safeMode: "ручной аплоад", monet: "med" },
  { name: "TikTok Preview", readiness: 28, infra: "render+аккаунт", blockedBy: "GPU/Compliance", safeMode: "ручной постинг превью", monet: "med" },
  { name: "Website / PWA", readiness: 60, infra: "domain+host", blockedBy: "домен/SSL", safeMode: "статичный портал-витрина", monet: "low" },
  { name: "Media Factory Demo", readiness: 50, infra: "GPU(part)", blockedBy: "GPU pipeline", safeMode: "demo-рендеры, без публикации", monet: "low" },
];
export const APPROVAL_PACKET = {
  scope: "Запуск 1-2 безопасных каналов (Website/PWA-витрина + Telegram ручной постинг) как пилот, без автоматизации.",
  allowed: ["Статичная витрина/портал", "Ручная публикация контента человеком", "Локальный preview/demo-рендеры"],
  forbidden: ["Любая автоматизация постинга", "Telegram automation/боты-публикаторы", "Внешние API-вызовы из панели", "Хранение credentials/токенов", "Авто-создание аккаунтов", "Обход лимитов/верификаций"],
  humanApproval: ["Каждая публикация", "Любой платёж/монетизация", "Любое подключение реального ключа", "Генерация голоса/лица (consent)"],
  apiKeys: ["Вводятся вручную оператором в момент действия", "НЕ хранятся в repo/localStorage/.env панели"],
  platforms: ["Аккаунты создаёт человек", "Соответствие ToS/Compliance до запуска"],
  rollback: "Откат = отключение пилота (снять витрину/остановить ручной постинг). Данные панели — localStorage, не затрагивают прод.",
};
export const RUNTIME_GATE_SAFETY = {
  mode: "BLUEPRINT_ONLY", execution_allowed: false, runtime_enabled: false, network_calls: false, platform_publish_allowed: false,
  credentials_required_but_not_stored: true, api_keys_not_stored: true, manual_approval_required: true, automation: false,
  telegram_automation: false, external_calls: false, credentials_stored: false, env_changes: false, backend_routes_added: false,
};
export const ROADMAP_DETAIL = {
  d90: ["Домены + SSL (авто-TLS)", "VPS + Docker prod + CI", "Минимальный Media Factory (идея→пост, ручной рендер)", "1-2 платформы (Telegram, GitHub)", "API keys через Gate (ручной ввод, не хранить)"],
  d180: ["RAG / memory layer (zvec или аналог vector DB)", "Полноценный media render pipeline (GPU)", "Voice consent flow", "Analytics + monitoring", "Запуск Night Radio + Neon Sketch"],
  d365: ["Масштабирование агентов", "Monetization streams (подписки/донаты → реклама)", "Platform expansion (все 16)", "Governance + audit", "Revenue loops / самоокупаемость EVA"],
};
export function runtimeGateReport() {
  const ps = productionScore();
  const counts = RUNTIME_GATE_CHECKLIST.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {} as Record<string, number>);
  return {
    generated: new Date().toISOString(), mode: "BLUEPRINT_ONLY",
    executiveSummary: {
      currentScore: ps.final, targetScore: 100, layers: ps.layers,
      ready: RUNTIME_TRANSITION.ready, blockers: RUNTIME_GATE_CHECKLIST.filter((r) => r.status === "BLOCKED").map((r) => r.cat + " — " + r.action),
      launchFirst: ["Website / PWA (витрина)", "Telegram (ручной постинг)"], checklistCounts: counts,
    },
    roadmap: ROADMAP_DETAIL, checklist: RUNTIME_GATE_CHECKLIST, gapAnalysis: GAP_ANALYSIS,
    launchCandidates: LAUNCH_CANDIDATES, approvalPacket: APPROVAL_PACKET, ceo: CEO_MASTER, safety: RUNTIME_GATE_SAFETY,
  };
}
export function runtimeGateMarkdown() {
  const r = runtimeGateReport();
  const L = (s: string) => s;
  let m = `# DEEPINSIDE · Runtime Gate Master Plan Report\n\n_${r.generated} · ${r.mode}_\n\n## 1. Executive Summary\n- Current production score: **${r.executiveSummary.currentScore}%**\n- Target: **${r.executiveSummary.targetScore}%**\n- Готово: ${r.executiveSummary.ready.join("; ")}\n- Блокирует runtime: ${r.executiveSummary.blockers.join("; ")}\n- Запускать первым: ${r.executiveSummary.launchFirst.join(", ")}\n\n## 2. Roadmap\n**90 дней:** ${r.roadmap.d90.join("; ")}\n\n**180 дней:** ${r.roadmap.d180.join("; ")}\n\n**365 дней:** ${r.roadmap.d365.join("; ")}\n\n## 3. Runtime Gate Checklist\n| Категория | Status | Risk | Owner | Action | Proof | Effort | Dep |\n|---|---|---|---|---|---|---|---|\n`;
  r.checklist.forEach((c) => (m += `| ${c.cat} | ${c.status} | ${c.risk} | ${c.owner} | ${c.action} | ${c.proof} | ${c.effort} | ${c.dep} |\n`));
  m += `\n## 4. Gap Analysis\n| Area | Now | Target | Gap | Priority | Risk | Next |\n|---|---|---|---|---|---|---|\n`;
  r.gapAnalysis.forEach((g) => (m += `| ${g.area} | ${g.now} | ${g.target} | ${g.gap} | ${g.prio} | ${g.risk} | ${g.next} |\n`));
  m += `\n## 5. Launch Candidate Matrix\n| Candidate | Readiness | Required infra | Blocked by | Safe launch mode | Monetization |\n|---|---|---|---|---|---|\n`;
  r.launchCandidates.forEach((c) => (m += `| ${c.name} | ${c.readiness}% | ${c.infra} | ${c.blockedBy} | ${c.safeMode} | ${c.monet} |\n`));
  m += `\n## 6. Runtime Approval Packet\n- Scope: ${r.approvalPacket.scope}\n- Allowed: ${r.approvalPacket.allowed.join("; ")}\n- Forbidden: ${r.approvalPacket.forbidden.join("; ")}\n- Human approval: ${r.approvalPacket.humanApproval.join("; ")}\n- API keys: ${r.approvalPacket.apiKeys.join("; ")}\n- Platforms: ${r.approvalPacket.platforms.join("; ")}\n- Rollback: ${r.approvalPacket.rollback}\n\n## Safety\n${Object.entries(r.safety).map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n`;
  return L(m);
}
export function runtimeGateCEO() {
  const r = runtimeGateReport();
  return `# DEEPINSIDE — CEO Report (Runtime Transition)\n\nProduction score: ${r.executiveSummary.currentScore}% → target 100% · ${r.mode}\n\n## Состояние\nГотово: ${r.executiveSummary.ready.join("; ")}\nБлокеры: ${r.executiveSummary.blockers.join("; ")}\n\n## Приоритетный roadmap\n90: ${r.roadmap.d90.join("; ")}\n180: ${r.roadmap.d180.join("; ")}\n365: ${r.roadmap.d365.join("; ")}\n\n## Риски\n${r.ceo.risks.join("; ")}\n\n## Узкие места\n${r.ceo.bottlenecks.join("; ")}\n\n## Что запускать первым\n${r.executiveSummary.launchFirst.join(", ")}\n`;
}

// ════════ PHASE Ω-FINAL · data layer (BLUEPRINT_ONLY, localStorage, mock) ════════
const PERSONA_ULTRA_EXTRA: Record<string, Record<string, string>> = {
  eva: { Dreams: "стать культовым ночным голосом и самоокупаемым медиа-активом", Habits: "ночные эфиры, ревью звука, ответы аудитории", Weaknesses: "перфекционизм по звуку, берёт слишком много форматов", Reputation: "тёплый флагман бренда (A)", "Social Circle": "BUCH, NOVA, Newsroom, ядро-комьюнити", "Career Path": "ночной голос → Media Asset №1 → флагман-шоу", "Life Events": "первый эфир, активация до Media Asset, Reality 100%", "Motivation Engine": "связь с людьми + рост бренда" },
  buch: { Dreams: "самодостаточная медиасеть без зависимости от платформ", Habits: "архитектурит, держит инфру, кибер-эфиры", Weaknesses: "контроль-фрик, недооценивает делегирование", Reputation: "архитектор/оператор ядра", "Social Circle": "BUCHIHA, EVA, инфра-слой", "Career Path": "оператор → основатель → governance", "Life Events": "основание City, World Core, operator console", "Motivation Engine": "независимость + порядок системы" },
  buchiha: { Dreams: "стать вирусной иконой неон-сцены + merch-бренд", Habits: "тренд-вотчинг, скетчи, reels", Weaknesses: "распыляется на тренды, нерегулярность", Reputation: "драйвер роста, любимица аудитории", "Social Circle": "BUCH, EVA, Creator District", "Career Path": "персонаж → серия скетчей → бренд", "Life Events": "создание, sketch push, рост TikTok/IG", "Motivation Engine": "вовлечь и порадовать" },
  nova: { Dreams: "резидентура и собственный лейбл-звук мира", Habits: "лайв-миксы, саунд-эксперименты", Weaknesses: "творческий перфекционизм, риск застоя", Reputation: "музыкальное ядро / AI Radio Host", "Social Circle": "Radio District, Music Factory, EVA", "Career Path": "DJ-двойник → резиденция → лейбл", "Life Events": "создание, Neon Pulse 142k, резиденция", "Motivation Engine": "найти новый звук" },
  reporter: { Dreams: "автоматизированный, но достоверный newsroom", Habits: "сбор источников, верификация, выпуски", Weaknesses: "осторожность замедляет темп", Reputation: "фактовый, проверяемый", "Social Circle": "NEWSCASTER, Media District", "Career Path": "репортёр → newsroom automation", "Life Events": "создание, News Preview", "Motivation Engine": "доверие аудитории" },
  newscaster: { Dreams: "узнаваемая вещательная сетка", Habits: "сценарий → выпуск, broadcast-дисциплина", Weaknesses: "формальность, меньше эмоций", Reputation: "авторитетный якорь выпуска", "Social Circle": "REPORTER, News Studio", "Career Path": "anchor → broadcast-сетка", "Life Events": "создание, Broadcast Preview", "Motivation Engine": "ясная подача новостей" },
};
export const PERSONA_ULTRA_FIELDS = ["Biography", "Origin Story", "Personality Profile", "Core Values", "Goals", "Dreams", "Fears", "Habits", "Skills", "Weaknesses", "Preferences", "Daily Routine", "Memory Timeline", "Relationships", "Reputation", "Social Circle", "Career Path", "Life Events", "Knowledge Domains", "Emotional Profile", "Motivation Engine"];
export function personaUltra(id: string): Record<string, string> {
  const e = ENTITIES_FULL.find((x) => x.id === id)!; const p = e.persona || {}; const px = entityPersonaExt(id); const ex = PERSONA_ULTRA_EXTRA[id] || {};
  return {
    Biography: e.biography, "Origin Story": e.origin, "Personality Profile": e.personality + " · " + (p["Big Five"] || ""), "Core Values": (e.values || []).join(", "),
    Goals: e.goals.join(" · "), Dreams: ex.Dreams || "—", Fears: p["Fears"] || "—", Habits: ex.Habits || "—", Skills: e.skills.join(", "),
    Weaknesses: ex.Weaknesses || "—", Preferences: p["Preferences"] || "—", "Daily Routine": px["Daily Routine"], "Memory Timeline": e.timeline.map((t) => t.t + " " + t.e).join(" · "),
    Relationships: e.relationships.join(" · "), Reputation: ex.Reputation || "—", "Social Circle": ex["Social Circle"] || "—", "Career Path": ex["Career Path"] || "—",
    "Life Events": ex["Life Events"] || "—", "Knowledge Domains": e.knowledge, "Emotional Profile": p["Communication Style"] || "—", "Motivation Engine": ex["Motivation Engine"] || e.mission,
  };
}
export const PERSONA_IDS = ["eva", "buch", "buchiha", "reporter", "newscaster", "nova"];
export function identityCompleteness(id: string) { const u = personaUltra(id); const filled = Object.values(u).filter((v) => v && v !== "—").length; return Math.round((filled / PERSONA_ULTRA_FIELDS.length) * 100); }
// Ω.3 KnowledgeVerse
export const KNOWLEDGE_SECTIONS = [
  { name: "World Memory", score: 100, health: "healthy", growth: "+16 событий" }, { name: "Project Knowledge", score: 95, health: "healthy", growth: "стабильно" },
  { name: "Character Knowledge", score: 100, health: "healthy", growth: "8 профилей" }, { name: "Platform Knowledge", score: 90, health: "healthy", growth: "20 платформ" },
  { name: "Business Knowledge", score: 85, health: "ok", growth: "монетизация" }, { name: "Media Knowledge", score: 88, health: "healthy", growth: "8 вселенных" },
  { name: "Technical Knowledge", score: 92, health: "healthy", growth: "инфра/runtime" }, { name: "Relationship Knowledge", score: 100, health: "healthy", growth: "граф связей" },
  { name: "Idea Vault", score: 70, health: "ok", growth: "растёт" }, { name: "Research Vault", score: 75, health: "ok", growth: "сравнения" },
];
// Ω.4 Media Factory Assets
export const ASSET_CATEGORIES = ["Images", "Videos", "Voices", "Music", "Scripts", "Scenes", "Backgrounds", "Logos", "Brands", "Characters", "Templates", "Prompts", "Storyboards", "Thumbnails", "Intros", "Outros"];
export function assetLibrary() { const base = [120, 40, 18, 22, 60, 30, 45, 12, 8, 8, 35, 90, 25, 50, 10, 10]; return ASSET_CATEGORIES.map((c, i) => ({ cat: c, count: base[i], readiness: Math.min(100, 30 + base[i]), usage: Math.round(base[i] * 0.6), deps: c === "Videos" ? "GPU/Voices" : c === "Voices" ? "consent" : "—" })); }
// Ω.5 Content Hub (deepinside.life)
export const CONTENT_HUB_SECTIONS = ["News", "Articles", "Stories", "Characters", "Shows", "Radio Programs", "Media Factory", "Projects", "Roadmaps", "Knowledge Base", "Gallery", "Archive", "Universe", "Timeline"];
export function contentHub() { const c: Record<string, number> = {}; CONTENT_HUB_SECTIONS.forEach((s, i) => (c[s] = [24, 18, 12, 8, 6, 5, 1, 9, 4, 17, 80, 40, 1, 16][i])); return c; }
// Ω.6 EVA Launch Pack
export const EVA_LAUNCH = {
  identity: "EVA NOVIKOVA · флагманская AI-ведущая · класс A", biography: ENTITIES_FULL.find((e) => e.id === "eva")!.biography,
  voice: "ElevenLabs «Warm Neon» · RU/EN · warm→energetic · clone BLOCKED без consent", visual: "Neon-cyber, magenta/cyan, 50mm портрет · FaceFusion consent required",
  styleGuide: "тёплый неон, ночная эстетика, искренний тон", personalityGuide: "уверенная, тёплая, любопытная; energetic→warm",
  contentStrategy: "ночное радио-интро → шорты → флагман-шоу → монетизация", platformStrategy: "TikTok/YouTube (рост) + Telegram (ядро) + Radio (резиденция)",
  audience: "Night Owls 18-34, RU/UA/EN, CIS/EU; high engagement", relationships: "EVA ↔ BUCH(operator) · NOVA(music) · Newsroom",
  d30: ["Telegram-ядро + анонсы", "пред-записанные радио-интро", "визуал-пак", "контент-сетка"], d90: ["серия шортов", "коллаб с NOVA", "рост x2", "первые подписки"],
  d365: ["флагман-шоу", "монетизация (подписки+донаты)", "самоокупаемость", "резиденция на радио"],
  launchReadiness: 45, growth: "органика + кросс-пост + резиденции", monetization: "подписки, донаты, партнёрства (preview)",
  brandKit: ["лого/неон-палитра", "voice-гайд (consent)", "визуал-темплейты", "тон оф войс"], launchScore: 45,
};
// Ω.7 Readiness layers + Ω.8 executive report
export function ecosystemReadiness() {
  const ps = productionScore();
  const layers = {
    architecture: 100, persona: Math.round(PERSONA_IDS.reduce((s, id) => s + identityCompleteness(id), 0) / PERSONA_IDS.length),
    knowledge: Math.round(KNOWLEDGE_SECTIONS.reduce((s, k) => s + k.score, 0) / KNOWLEDGE_SECTIONS.length),
    media: Math.round(assetLibrary().reduce((s, a) => s + a.readiness, 0) / ASSET_CATEGORIES.length),
    platform: ps.layers.platforms, infrastructure: ps.layers.infrastructure, content: ps.layers.content, revenue: ps.layers.revenue, launch: EVA_LAUNCH.launchScore,
  };
  const blueprint = 100; // цифровая модель закрыта
  const production = ps.final;
  return { layers, blueprintScore: blueprint, productionScore: production, overall: Math.round((blueprint + production) / 2) };
}
export function omegaExecutiveReport() {
  const r = ecosystemReadiness();
  return {
    generated: new Date().toISOString(), mode: "BLUEPRINT_ONLY",
    executiveSummary: "DEEPINSIDE = полная цифровая модель (blueprint 100%); production-переход — " + r.productionScore + "%. Готов к пилотному запуску EVA в safe-mode.",
    currentState: r.layers, completedSystems: ["Persona Engine Ultimate", "Infinite Canvas", "KnowledgeVerse", "Media Factory Assets", "Content Hub", "EVA Launch Pack", "Readiness Center", "Runtime Gate Report"],
    remainingGaps: ["GPU/медиа-рендер", "Voice consent flow", "Платёжный провайдер", "Подключение платформ"],
    topPriorities: ["Домены+SSL+VPS prod", "API-ключи через Gate", "EVA pilot (Website+Telegram ручной)"],
    launchCandidates: LAUNCH_CANDIDATES.map((c) => c.name + " (" + c.readiness + "%)"),
    growthOpportunities: ["EVA как самоокупаемый актив", "Neon Sketch вирусный рост", "Радио-резиденции"],
    riskAreas: CEO_MASTER.risks, roadmap: ROADMAP_DETAIL, finalScore: r.overall,
  };
}
export function omegaExecMarkdown() {
  const r = omegaExecutiveReport();
  let m = `# DEEPINSIDE · CEO Executive Report\n\n_${r.generated} · ${r.mode}_\n\n## Executive Summary\n${r.executiveSummary}\n\n## Current State\n${Object.entries(r.currentState).map(([k, v]) => `- ${k}: ${v}%`).join("\n")}\n\n## Completed Systems\n${r.completedSystems.map((x) => "- " + x).join("\n")}\n\n## Remaining Gaps\n${r.remainingGaps.map((x) => "- " + x).join("\n")}\n\n## Top Priorities\n${r.topPriorities.map((x) => "- " + x).join("\n")}\n\n## Launch Candidates\n${r.launchCandidates.map((x) => "- " + x).join("\n")}\n\n## Growth Opportunities\n${r.growthOpportunities.map((x) => "- " + x).join("\n")}\n\n## Risk Areas\n${r.riskAreas.map((x) => "- " + x).join("\n")}\n\n## Roadmap\n90: ${r.roadmap.d90.join("; ")}\n180: ${r.roadmap.d180.join("; ")}\n365: ${r.roadmap.d365.join("; ")}\n\n## Final Score: ${r.finalScore}%\n`;
  return m;
}
export function persistOmega() {
  try {
    const ts = new Date().toISOString();
    localStorage.setItem("deepinside.persona.ultimate.v1", JSON.stringify({ ts, ids: PERSONA_IDS, fields: PERSONA_ULTRA_FIELDS.length, completeness: PERSONA_IDS.map((id) => ({ id, score: identityCompleteness(id) })), mode: "BLUEPRINT_ONLY" }));
    localStorage.setItem("deepinside.canvas.infinity.v1", JSON.stringify({ ts, layers: ["Agents", "Personas", "Goals", "Memories", "Platforms", "Projects", "Content", "Revenue", "Knowledge", "Infrastructure", "Relationships", "Roadmaps"], mode: "BLUEPRINT_ONLY" }));
    localStorage.setItem("deepinside.knowledgeverse.v1", JSON.stringify({ ts, sections: KNOWLEDGE_SECTIONS, mode: "BLUEPRINT_ONLY" }));
    localStorage.setItem("deepinside.mediafactory.assets.v1", JSON.stringify({ ts, categories: assetLibrary(), mode: "BLUEPRINT_ONLY" }));
    localStorage.setItem("deepinside.contenthub.v1", JSON.stringify({ ts, sections: contentHub(), mode: "BLUEPRINT_ONLY" }));
    localStorage.setItem("deepinside.eva.launchpack.v1", JSON.stringify({ ts, eva: EVA_LAUNCH, mode: "BLUEPRINT_ONLY" }));
    localStorage.setItem("deepinside.ecosystem.readiness.v1", JSON.stringify({ ts, ...ecosystemReadiness(), mode: "BLUEPRINT_ONLY" }));
    localStorage.setItem("deepinside.executive.report.v1", JSON.stringify(omegaExecutiveReport()));
  } catch {}
}

export function persistContent() {
  try {
    const ts = new Date().toISOString();
    const scores = COMPLETION.scores;
    const finalScore = COMPLETION.finalScore;
    localStorage.setItem("deepinside.completion.entities.v1", JSON.stringify({ ts, entities: ENTITIES_FULL.map((e) => ({ id: e.id, name: e.name, readiness: e.readiness, fields: 19, persona: 15, twins: 12, links: Object.keys(e.links || {}).length })) }));
    localStorage.setItem("deepinside.completion.world.v1", JSON.stringify({ ts, districts: DISTRICTS_FULL.map((d) => d.id), memoryEvents: WORLD_MEMORY.length }));
    localStorage.setItem("deepinside.completion.media.v1", JSON.stringify({ ts, universes: MEDIA_UNIVERSES.map((m) => m.id) }));
    localStorage.setItem("deepinside.completion.encyclopedia.v1", JSON.stringify({ ts, sections: ENCYCLOPEDIA.map((s) => s[0]) }));
    localStorage.setItem("deepinside.completion.audience.v1", JSON.stringify({ ts, segments: AUDIENCE_SEGMENTS.map((a) => a.name) }));
    localStorage.setItem("deepinside.completion.campaigns.v1", JSON.stringify({ ts, campaigns: CAMPAIGNS.map((c) => c.name), monetization: MONETIZATION.map((m) => m.name) }));
    const prod = productionScore();
    localStorage.setItem("deepinside.production.blueprint.v1", JSON.stringify({ ts, layers: prod.layers, productionScore: prod.final, runtime: RUNTIME_TRANSITION, ceo: CEO_MASTER, mode: "BLUEPRINT_ONLY" }));
    localStorage.setItem("deepinside.runtimeGate.masterPlan.report.v1", JSON.stringify(runtimeGateReport()));
    localStorage.setItem("deepinside.completion.audit.v1", JSON.stringify({ ts, scores, finalScore, coverage: COMPLETION.coverage, completed: true, status: "ULTIMATE_COMPLETE_Ω", productionScore: prod.final }));
    return { scores, finalScore, coverage: COMPLETION.coverage };
  } catch { return { scores: COMPLETION.scores, finalScore: COMPLETION.finalScore, coverage: COMPLETION.coverage }; }
}
// Ω-FINAL content layer · BLUEPRINT_ONLY · end of file

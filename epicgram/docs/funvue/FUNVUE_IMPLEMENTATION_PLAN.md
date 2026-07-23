# FUNVUE Implementation Plan

Дата: 2026-06-30  
Статус: P1 / проектирование и подготовка к внедрению  
Репозиторий: `EpicStarAi/agent-control`  
Связанный документ: `docs/FUNVUE_DRIVE_KNOWLEDGE_BASE.md`

## 0. Цель

Собрать из Google Drive-материалов FUNVUE исполнимый слой для AI MEDIA OS:

```text
Drive PDF → Markdown Source → Knowledge Base → Operator Prompts → Dashboard → Draft/Approval → Execution
```

Главная задача: сделать не хаотичный набор PDF, а управляемую систему, где AI-оператор может:

- читать инструкции;
- создавать контент-планы;
- генерировать промпты;
- готовить черновики публикаций;
- строить traffic/marketing-гипотезы;
- проверять сценарии через compliance gate;
- отдавать финальные действия человеку на approval.

## 1. Scope

### Входит в MVP

- структура `docs/funvue/`;
- нормализация Drive-документов в Markdown;
- knowledge-base index;
- три operator prompt-файла;
- UI-раздел FUNVUE в EPIC GRAM Dashboard;
- draft-only режим;
- approval-gate перед внешними действиями;
- 7-дневный контент-план;
- traffic-plan без спама и обхода лимитов;
- weekly report.

### Не входит в MVP

- автоматическая массовая рассылка;
- обход лимитов Telegram/Fanvue/Meta/TikTok/YouTube;
- несанкционированная автоматизация аккаунтов;
- имитация личности реального человека без согласия;
- сбор персональных данных без законного основания;
- публикация без approval;
- подключение платёжных сценариев без отдельного compliance review.

## 2. Source folders

| Source | Folder ID | Role |
|---|---|---|
| Генерація | `1niqjXCajsnrEl0IelMnTcMXCoOUve0TV` | Контент, генерация, обучение, монетизация |
| Траф | `1mdp0a9WoaQPAulhbojX03nCv2QtfoZWR` | Discovery, traffic, Telegram setup, рост аудитории |

## 3. Target repository structure

```text
docs/funvue/
├── README.md
├── FUNVUE_IMPLEMENTATION_PLAN.md
├── source/
│   ├── generation/
│   │   ├── updates-may-generation.md
│   │   ├── fanvue-base.md
│   │   ├── monetization-extra.md
│   │   ├── updated-training-instruction.md
│   │   └── dfans.md
│   └── traffic/
│       ├── fanvue-discovery-mass-dm.md
│       └── telegram-usa-setup.md
├── kb/
│   ├── generation.rules.md
│   ├── traffic.rules.md
│   ├── monetization.rules.md
│   ├── platform.rules.md
│   └── compliance.rules.md
├── prompts/
│   ├── funvue-orchestrator.md
│   ├── generation-operator.md
│   └── traffic-operator.md
├── schemas/
│   ├── funvue-kb.schema.json
│   ├── content-plan.schema.json
│   ├── traffic-plan.schema.json
│   └── approval.schema.json
└── funvue-kb.index.json
```

## 4. Operators

### 4.1. FUNVUE ORCHESTRATOR

Главный координатор процесса.

Функции:

- определяет задачу пользователя;
- выбирает нужного подоператора;
- читает `funvue-kb.index.json`;
- собирает единый план;
- передаёт результат в approval;
- запрещает внешнее действие без подтверждения;
- формирует отчёты.

Allowed outputs:

- план;
- анализ;
- контент-календарь;
- список задач;
- draft-публикации;
- compliance warning;
- weekly report.

Disallowed outputs:

- команды для спама;
- инструкции обхода лимитов;
- скрытая манипуляция аудиторией;
- публикация/отправка без approval;
- сбор персональных данных без законного основания.

### 4.2. GENERATION OPERATOR

Оператор генерации модели и контента.

Функции:

- создание character profile;
- описание визуального стиля;
- генерация промптов для image/video/text;
- сбор контент-плана;
- адаптация постов под платформы;
- подготовка asset checklist;
- рекомендации по монетизации;
- контроль качества.

Inputs:

- character profile;
- target audience;
- platform;
- content style;
- source docs from `source/generation/`;
- monetization docs.

Outputs:

- 7-day content plan;
- prompt pack;
- caption pack;
- visual consistency checklist;
- monetization ideas;
- publishing draft queue.

### 4.3. TRAFFIC OPERATOR

Оператор traffic/marketing-процессов.

Функции:

- анализ каналов привлечения;
- построение traffic hypotheses;
- Discovery-план в рамках правил платформ;
- подготовка коммуникационных черновиков;
- сегментация аудитории;
- воронка: content → profile → subscription → retention;
- отчёты по метрикам;
- risk flagging.

Important: оператор работает только в безопасном режиме.

Allowed:

- opt-in коммуникации;
- работа с собственной аудиторией;
- контент-маркетинг;
- аналитика открытых метрик;
- CRM-сценарии с согласием;
- подготовка черновиков;
- ручной approval.

Disallowed:

- spam;
- platform limit bypass;
- credential sharing;
- fake identity operations;
- scraping personal data without legal basis;
- automated harassment;
- dark patterns;
- deceptive engagement.

## 5. MVP flow

```text
1. Admin opens FUNVUE dashboard.
2. Admin selects model/project.
3. System loads FUNVUE KB index.
4. Orchestrator asks Generation Operator for content plan.
5. Generation Operator creates 7-day content plan.
6. Orchestrator asks Traffic Operator for safe traffic plan.
7. Traffic Operator creates draft-only traffic plan.
8. Compliance gate checks all outputs.
9. Admin reviews plan.
10. Admin approves, edits, or rejects.
11. Approved items move to publishing/export queue.
12. Weekly report is generated.
```

## 6. UI section in EPIC GRAM Dashboard

### Navigation

Add main card:

```text
FUNVUE
AI creator / model growth / content + traffic OS
```

### Subcards

```text
FUNVUE Dashboard
├── Knowledge Base
├── Generation Operator
├── Traffic Operator
├── Monetization
├── Compliance Check
├── Content Plan
├── Draft Queue
└── Reports
```

### Buttons

| Button | Action | Mode |
|---|---|---|
| Open KB | Opens source + normalized docs | read-only |
| Generate Content Plan | Creates 7-day plan | draft |
| Generate Prompt Pack | Creates image/video/text prompts | draft |
| Create Traffic Plan | Creates safe traffic hypotheses | draft |
| Compliance Check | Reviews generated plan | review |
| Send to Approval | Pushes item to approval queue | internal |
| Export Report | Creates weekly report | read-only/export |

## 7. Data models

### 7.1. Knowledge base index

```json
{
  "project": "FUNVUE",
  "version": "0.1.0",
  "updated_at": "2026-06-30",
  "sources": [
    {
      "id": "generation",
      "name": "Генерація",
      "folder_id": "1niqjXCajsnrEl0IelMnTcMXCoOUve0TV",
      "operator": "GENERATION_OPERATOR",
      "documents": []
    },
    {
      "id": "traffic",
      "name": "Траф",
      "folder_id": "1mdp0a9WoaQPAulhbojX03nCv2QtfoZWR",
      "operator": "TRAFFIC_OPERATOR",
      "documents": []
    }
  ],
  "safety": {
    "approval_required": true,
    "draft_only_by_default": true,
    "external_actions_disabled_in_mvp": true
  }
}
```

### 7.2. Content plan item

```json
{
  "day": 1,
  "platform": "fanvue|telegram|instagram|tiktok|youtube|x",
  "content_type": "image|video|post|story|short|dm_draft",
  "theme": "string",
  "caption": "string",
  "generation_prompt": "string",
  "assets_required": [],
  "risk_flags": [],
  "approval_status": "draft|approved|rejected"
}
```

### 7.3. Traffic plan item

```json
{
  "channel": "telegram|fanvue|instagram|tiktok|youtube|x|other",
  "hypothesis": "string",
  "audience_segment": "string",
  "action_type": "content|community|partnership|paid_ads|crm_opt_in|manual_outreach_draft",
  "draft_message": "string",
  "compliance_notes": [],
  "risk_level": "low|medium|high",
  "approval_required": true
}
```

## 8. Compliance gate

Every generated output must be checked before being moved to approval.

### Checks

- Is this opt-in or public content?
- Does this violate platform rules?
- Does this include personal data?
- Does this impersonate a real person?
- Does this involve mass messaging?
- Does this require user approval?
- Does this contain adult content policy risk?
- Does this expose credentials or private links?

### Result format

```json
{
  "status": "pass|needs_review|block",
  "risk_level": "low|medium|high",
  "issues": [],
  "required_changes": [],
  "approval_required": true
}
```

## 9. Implementation phases

### Phase P1 — Docs and KB skeleton

- [x] Create `docs/FUNVUE_DRIVE_KNOWLEDGE_BASE.md`.
- [x] Create `docs/funvue/FUNVUE_IMPLEMENTATION_PLAN.md`.
- [ ] Create `docs/funvue/README.md`.
- [ ] Create source folders.
- [ ] Extract PDF text.
- [ ] Normalize PDF content to Markdown.
- [ ] Create `funvue-kb.index.json`.

### Phase P2 — Operator prompts

- [ ] Create `prompts/funvue-orchestrator.md`.
- [ ] Create `prompts/generation-operator.md`.
- [ ] Create `prompts/traffic-operator.md`.
- [ ] Add compliance constraints to every prompt.
- [ ] Add draft-only behavior.

### Phase P3 — Dashboard UI

- [ ] Add FUNVUE card to dashboard.
- [ ] Add FUNVUE route/page.
- [ ] Add KB panel.
- [ ] Add operator cards.
- [ ] Add content plan generator UI.
- [ ] Add traffic plan generator UI.
- [ ] Add compliance check UI.
- [ ] Add approval queue UI.

### Phase P4 — API layer

- [ ] Add `/api/funvue/kb`.
- [ ] Add `/api/funvue/generate-content-plan`.
- [ ] Add `/api/funvue/generate-traffic-plan`.
- [ ] Add `/api/funvue/compliance-check`.
- [ ] Add `/api/funvue/approval`.
- [ ] Add audit logging.

### Phase P5 — MVP scenario

- [ ] Select one model/persona.
- [ ] Generate 7-day content plan.
- [ ] Generate prompt pack.
- [ ] Generate safe traffic plan.
- [ ] Run compliance check.
- [ ] Send all items to approval queue.
- [ ] Export weekly report.

## 10. Replit / Codex task prompt

Use this prompt for Replit/Codex:

```text
You are working in the EPIC GRAM / AI MEDIA OS repository.

Goal:
Implement the FUNVUE MVP skeleton in draft-only mode.

Read:
- docs/FUNVUE_DRIVE_KNOWLEDGE_BASE.md
- docs/funvue/FUNVUE_IMPLEMENTATION_PLAN.md

Do not implement any external automation, posting, messaging, scraping, spam, or platform-limit bypass.
Everything must remain draft-only and approval-gated.

Tasks:
1. Create the docs/funvue folder structure from the implementation plan.
2. Add docs/funvue/README.md.
3. Add docs/funvue/funvue-kb.index.json based on the Drive folder IDs and documents.
4. Add prompt files:
   - docs/funvue/prompts/funvue-orchestrator.md
   - docs/funvue/prompts/generation-operator.md
   - docs/funvue/prompts/traffic-operator.md
5. Add a FUNVUE section/card to the EPIC GRAM dashboard.
6. Add a FUNVUE route/page with cards:
   - Knowledge Base
   - Generation Operator
   - Traffic Operator
   - Monetization
   - Compliance Check
   - Draft Queue
   - Reports
7. Add mock API endpoints or local handlers for:
   - generate content plan
   - generate traffic plan
   - compliance check
   - approval queue
8. Add audit log entries for generated drafts and approvals.
9. Keep all actions local/draft-only.
10. Add clear TODO markers where real Drive ingest, RAG and publishing integrations will be connected later.

Acceptance criteria:
- Project builds.
- FUNVUE card is visible in dashboard.
- FUNVUE page opens.
- User can generate a mock 7-day content plan.
- User can generate a mock safe traffic plan.
- Compliance check returns pass/needs_review/block.
- No real external message/post action exists.
- Approval is required before anything can move to execution.
```

## 11. Done definition

MVP is considered done when:

```text
Admin opens EPIC GRAM → FUNVUE → selects model → generates content plan → generates traffic plan → compliance check → approval queue → weekly report.
```

No external action is executed automatically in MVP.

## 12. Operating principle

```text
AI proposes.
Human approves.
System logs.
Only then execution is allowed.
```

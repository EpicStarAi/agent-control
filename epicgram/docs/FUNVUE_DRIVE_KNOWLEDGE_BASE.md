# FUNVUE Drive Knowledge Base

Дата фиксации: 2026-06-30
Репозиторий: `EpicStarAi/agent-control`

Этот документ фиксирует две рабочие Google Drive-папки как базу знаний для FUNVUE / EPIC GRAM / AI MEDIA OS.

## 1. Drive-разделы

| Раздел | Назначение | Drive URL | Folder ID |
|---|---|---|---|
| Генерація | Контент, генерация, обучение модели, упаковка профиля, монетизация | https://drive.google.com/drive/folders/1niqjXCajsnrEl0IelMnTcMXCoOUve0TV | `1niqjXCajsnrEl0IelMnTcMXCoOUve0TV` |
| Траф | Трафик, Discovery, коммуникации, Telegram-настройки, рост аудитории | https://drive.google.com/drive/folders/1mdp0a9WoaQPAulhbojX03nCv2QtfoZWR | `1mdp0a9WoaQPAulhbojX03nCv2QtfoZWR` |

## 2. Обнаруженные документы

### 2.1. Генерація

| Файл | Назначение в системе |
|---|---|
| `Оновлення травень генерація.pdf` | Обновления процесса генерации и обучения |
| `Fanvue .pdf` | Базовая документация по Fanvue-процессу |
| `додаткові способи монетизації моделей.pdf` | Дополнительные сценарии монетизации |
| `Інструкція під оновлене навчання.pdf` | Инструкция под обновленный процесс обучения |
| `dFans pdf.pdf` | Материалы по dFans / смежной платформе |

### 2.2. Траф

| Файл | Назначение в системе |
|---|---|
| `Fanvue Discovery та Mass DM.pdf` | Discovery, коммуникационный пайплайн, первичная лидогенерация |
| `налаштування тел. на США.pdf` | Технические настройки Telegram/телефона для рабочего окружения |

## 3. Архитектурное размещение

```text
FUNVUE / AI MEDIA OS
│
├── 01_GENERATION
│   ├── обучение модели
│   ├── генерация контента
│   ├── сценарии Fanvue / dFans
│   ├── обновления процесса
│   └── монетизация моделей
│
└── 02_TRAFFIC
    ├── Discovery
    ├── коммуникационный пайплайн
    ├── Telegram setup
    ├── прогрев рабочих аккаунтов
    ├── рост аудитории
    └── трафик → подписка → монетизация
```

## 4. AI-операторы

### 4.1. GENERATION OPERATOR

Зона ответственности:

- создание и упаковка цифровой модели;
- генерация фото, видео, текста и сценариев;
- подготовка контент-плана;
- адаптация материалов под Fanvue / dFans / Telegram / social media;
- ведение библиотеки промптов;
- контроль качества и соответствия бренду.

Входные данные:

- PDF из папки `Генерація`;
- брендбук модели;
- описание персонажа;
- целевая аудитория;
- правила платформы;
- approved content policy.

Выходные данные:

- контент-план;
- промпты генерации;
- сценарии публикаций;
- asset checklist;
- рекомендации по монетизации;
- задачи для человека на approval.

### 4.2. TRAFFIC OPERATOR

Зона ответственности:

- анализ каналов привлечения;
- Discovery-процессы;
- Telegram traffic layer;
- сегментация аудитории;
- подготовка безопасных коммуникационных сценариев;
- аналитика воронки;
- передача лидов в approved workflow.

Входные данные:

- PDF из папки `Траф`;
- список каналов;
- статус аккаунтов;
- разрешённые форматы коммуникации;
- лимиты платформ;
- правила compliance.

Выходные данные:

- трафик-план;
- список гипотез;
- безопасные шаблоны сообщений;
- daily/weekly отчёт;
- risk flags;
- задачи для ручного подтверждения.

## 5. Safety / Compliance Gate

Все сценарии, связанные с трафиком, коммуникациями и массовыми сообщениями, должны проходить через compliance gate.

Запрещённые режимы:

- спам;
- обход лимитов платформ;
- имитация личности реального человека без согласия;
- несанкционированная автоматизация;
- скрытая манипуляция пользователями;
- сбор или использование персональных данных без законного основания;
- действия, нарушающие правила Fanvue, Telegram, Google, Meta, TikTok, YouTube и других платформ.

Разрешённые режимы:

- opt-in коммуникации;
- работа с собственной аудиторией;
- контент-маркетинг;
- аналитика открытых метрик;
- подготовка черновиков для ручного подтверждения;
- CRM-сценарии с согласием пользователя;
- A/B-тесты в рамках правил платформ.

## 6. Следующие задачи для репозитория

### P1 — ingest

- [ ] Извлечь текст из всех PDF.
- [ ] Сохранить нормализованные markdown-версии в `docs/funvue/source/`.
- [ ] Разделить материалы на `generation`, `traffic`, `monetization`, `platform-rules`.

### P2 — knowledge base

- [ ] Создать `funvue-kb.index.json`.
- [ ] Добавить теги: `generation`, `traffic`, `fanvue`, `dfans`, `telegram`, `monetization`, `compliance`.
- [ ] Подготовить RAG-совместимую структуру для AI-оператора.

### P3 — operator prompts

- [ ] Создать system prompt для `GENERATION OPERATOR`.
- [ ] Создать system prompt для `TRAFFIC OPERATOR`.
- [ ] Создать общий `FUNVUE ORCHESTRATOR`.
- [ ] Добавить approval-gate перед действиями вне черновиков.

### P4 — UI / EPIC GRAM integration

- [ ] Добавить раздел `FUNVUE` в EPIC GRAM dashboard.
- [ ] Добавить карточки `Generation`, `Traffic`, `Monetization`, `Reports`.
- [ ] Подключить список Drive-источников.
- [ ] Добавить кнопку `Generate Plan`.
- [ ] Добавить кнопку `Create Drafts`.
- [ ] Добавить кнопку `Compliance Check`.

## 7. Минимальный YAML-манифест

```yaml
funvue:
  source: google_drive
  folders:
    generation:
      name: "Генерація"
      folder_id: "1niqjXCajsnrEl0IelMnTcMXCoOUve0TV"
      url: "https://drive.google.com/drive/folders/1niqjXCajsnrEl0IelMnTcMXCoOUve0TV"
      operator: "GENERATION_OPERATOR"
      documents:
        - "Оновлення травень генерація.pdf"
        - "Fanvue .pdf"
        - "додаткові способи монетизації моделей.pdf"
        - "Інструкція під оновлене навчання.pdf"
        - "dFans pdf.pdf"
    traffic:
      name: "Траф"
      folder_id: "1mdp0a9WoaQPAulhbojX03nCv2QtfoZWR"
      url: "https://drive.google.com/drive/folders/1mdp0a9WoaQPAulhbojX03nCv2QtfoZWR"
      operator: "TRAFFIC_OPERATOR"
      documents:
        - "Fanvue Discovery та Mass DM.pdf"
        - "налаштування тел. на США.pdf"
  safety:
    approval_required: true
    disallow:
      - spam
      - platform_limit_bypass
      - impersonation_without_consent
      - unauthorized_automation
      - unlawful_personal_data_processing
```

## 8. Цель

Сделать из Drive-материалов исполнимую базу знаний для AI-оператора:

```text
PDF → Markdown → Knowledge Base → RAG → Operator Prompt → Dashboard → Approval → Execution
```

Главный принцип: AI-оператор сначала анализирует, планирует и создаёт черновики. Любые внешние действия выполняются только после явного подтверждения оператора/админа.

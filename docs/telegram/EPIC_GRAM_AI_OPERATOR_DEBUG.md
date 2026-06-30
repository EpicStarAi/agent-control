# EPIC GRAM AI Operator Telegram Client Debug Plan

Goal: stabilize EPIC GRAM AI Operator demo without unsafe automation. The client must remain authorization-first and approval-first.

## 1. Current repo baseline

Existing app entry points:

- Web client: `apps/web`
- Desktop shell: `apps/desktop`
- API contracts: `services/api`
- Dev command: `npm run dev:host`
- Local URL: `http://127.0.0.1:3015`

## 2. First local launch

```bash
git clone https://github.com/EpicStarAi/agent-control.git
cd agent-control
npm install
npm run dev:host
```

Open:

```text
http://127.0.0.1:3015
```

Desktop shell:

```bash
npm run desktop:dev
```

## 3. Debug checklist

### Frontend

- Open DevTools Console.
- Check red errors.
- Check `Network` for 404/500/blocked API calls.
- Confirm React root renders.
- Confirm routes: `/`, `/chats`, `/agents`, `/accounts`, `/logs`, `/settings`.

### API contracts

- Inspect `services/api/README.md`.
- Confirm Telegram API endpoints are contract-only or real runtime.
- Confirm no secrets are hardcoded.

### Telegram authorization

Allowed paths only:

- TDLib / official Telegram API for user-authorized accounts.
- Bot API for owned bots.
- Telegram Mini App SDK after explicit user launch.

Do not implement hidden sessions, auth bypass, credential capture, private scraping, spam automation, or account farming.

## 4. AI Operator endpoint design

Target endpoint:

```text
POST /ai/suggest
```

Purpose:

- analyze current screen/context;
- suggest next safe operator action;
- classify Telegram entity;
- generate draft response/post;
- propose workflow step;
- require approval for external actions.

Example request:

```json
{
  "projectId": "epic-gram",
  "surface": "telegram",
  "entity": {
    "id": "local-channel-1",
    "title": "NOVIKOVA NEWS",
    "type": "channel"
  },
  "context": {
    "screen": "chats",
    "selection": "current-dialog",
    "userIntent": "prepare post"
  },
  "approvalMode": "required"
}
```

Example response:

```json
{
  "classification": "CHANNELS",
  "risk": "low",
  "requiresApproval": true,
  "suggestedAction": "draft_post",
  "draft": "...",
  "nextSteps": ["review", "approve", "schedule"],
  "audit": {
    "coreVersion": "1.0",
    "projectId": "epic-gram"
  }
}
```

## 5. Distribution auto-sort logic

Classification rules:

```text
if entity.isBot -> BOTS
else if entity.isChannel -> CHANNELS
else if entity.isGroup || entity.isSupergroup -> GROUPS
else if entity.isInternalEpicStar -> EPIC_STAR
else -> PERSONAL
```

UI folders:

- БОТЫ
- КАНАЛЫ
- ЛИЧНЫЕ
- ГРУППЫ
- EPIC★STAR

## 6. Demo priorities

P0:

1. Load Core v1.0 system prompt from `docs/core/AI_Media_Operator_Core.md`.
2. Add `configs/project.example.yaml` parsing or static placeholder.
3. Add Telegram entity classification tags to local folders.
4. Add `/ai/suggest` contract or mock route.
5. Add visible approval state for external actions.

P1:

1. Runtime status card for local API.
2. Operator suggestions panel.
3. Audit log event for every AI suggestion.
4. Dry-run preview before publish/send.

P2:

1. TDLib runtime integration.
2. Encrypted session storage.
3. Real dialog sync.
4. Human-approved sending.

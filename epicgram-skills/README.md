# EPICGRAM Skills Registry

Agent skills catalog for the EPICGRAM AI Telegram workspace.  
Follows the [Agent Skills open standard](https://agentskills.io/specification).

## Structure

```
epicgram-skills/
├── product/          # Business-logic skills — content, approval, safety
├── platform/         # Integration bridges — Telegram, Instagram, n8n, etc.
├── clients/          # Client-compatibility adapters — Cursor, Claude Code, etc.
└── meta/             # Dev/meta skills — scaffolding, linting, registry, QA
```

## Wave 1 — MVP Core (active)

| Skill | Layer | Purpose |
|---|---|---|
| `epicgram-safe-mode` | product | Mandatory safety gate before any risky action |
| `epicgram-review-and-approval` | product | Human-in-the-loop approval loop |
| `epicgram-content-brief` | product | Raw idea → structured content brief |
| `epicgram-script-writer` | product | Brief → scene-by-scene script + hooks + CTA |
| `epicgram-caption-hashtags` | product | Script/brief → platform-adapted captions + tags |
| `epicgram-multiposting-scheduler` | product | Queue, schedule, retry across platforms |
| `epicgram-n8n-orchestrator` | platform | Trigger and monitor n8n workflows |
| `epicgram-instagram-graph` | platform | Instagram Graph API publish + insights |
| `epicgram-telegram-client-ops` | platform | Telegram messages, chats, bots, channels |

## Wave 2 — Growth (planned)

`epicgram-account-identity`, `epicgram-workspace-memory`, `epicgram-content-analytics`,
`epicgram-moderation-and-abuse`, `epicgram-tiktok-publisher`, `epicgram-youtube-shorts-publisher`

## Wave 3 — Client Ecosystem (planned)

`epicgram-cursor-workflow`, `epicgram-claude-code-workflow`, `epicgram-gemini-cli-workflow`,
`epicgram-nanobot-assistant`, `epicgram-vita-content-worker`, `epicgram-skill-registry`, `epicgram-skill-linter`

## Loading a skill

```
Read epicgram-skills/product/epicgram-safe-mode/SKILL.md and follow its instructions.
```

Any agent or client that can read files from this repository can load any skill on demand.

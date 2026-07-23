# epicgram-cursor-workflow

## Description
Tells Cursor (and Cursor-compatible agents) how to discover, load, and chain EPICGRAM skills within a coding IDE context. Defines which skills to use for each class of EPICGRAM task encountered during development.

## When to use
Load when operating as an EPICGRAM agent inside Cursor IDE. Provides the conventions for calling product and platform skills from a code-editor environment.

## Skill Discovery

In Cursor, load skills by reading the SKILL.md file:
```
Read epicgram-skills/product/epicgram-safe-mode/SKILL.md and follow its instructions.
```

List all available skills:
```
Read epicgram-skills/registry.json for the full catalog.
```

## Task → Skill Mapping (Cursor context)

| Task the developer asks | Lead skill to load |
|---|---|
| "Draft a post about X" | `epicgram-content-brief` → `epicgram-script-writer` → `epicgram-caption-hashtags` |
| "Schedule this caption to Instagram" | `epicgram-safe-mode` → `epicgram-review-and-approval` → `epicgram-multiposting-scheduler` → `epicgram-instagram-graph` |
| "Send this to the Telegram channel" | `epicgram-safe-mode` → `epicgram-telegram-client-ops` |
| "Run the n8n publishing workflow" | `epicgram-safe-mode` → `epicgram-n8n-orchestrator` |
| "Add a new skill" | `epicgram-skill-scaffolder` → `epicgram-skill-linter` |

## Cursor-specific conventions

1. **Never apply file edits to EPICGRAM production code** based solely on a content operator request — content tasks flow through product skills, not code changes.
2. **Approval cards** — render as Markdown blockquotes in the Cursor chat panel.
3. **Audit logs** — write to console (Cursor terminal) with `[EPICGRAM-AUDIT]` prefix when no API endpoint is available.
4. **Secrets** — never read or print `INSTAGRAM_ACCESS_TOKEN`, `N8N_API_KEY`, `EPICGRAM_TDLIB_DATABASE_KEY` or any other secret. Reference by env var name only.
5. **Code generation** — if generating code that calls EPICGRAM APIs, always add a `// TODO: run through epicgram-safe-mode` comment above any send/publish call.

## Integration points

- Loads from: `epicgram-skills/registry.json`
- Routes to: all product and platform skills
- Client docs: https://cursor.com/docs

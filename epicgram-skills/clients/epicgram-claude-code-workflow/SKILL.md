# epicgram-claude-code-workflow

## Description
Defines how Claude Code (claude.ai/code, Claude's agentic coding environment) should discover, load, and chain EPICGRAM skills. Optimized for Claude's tool-use and file-reading patterns.

## When to use
Load when operating as an EPICGRAM agent inside Claude Code or any Claude-powered coding harness.

## Skill Loading Pattern

Claude Code reads files directly. Load any skill with:
```
Read the file at epicgram-skills/product/epicgram-safe-mode/SKILL.md
```

Always read the full SKILL.md before acting on it — partial reads lead to skipped safety steps.

## Chaining Protocol

Claude Code supports multi-step tool use. For EPICGRAM tasks, follow this chain order strictly:

```
1. epicgram-content-brief      ← always first for content tasks
2. epicgram-script-writer      ← if video format
3. epicgram-caption-hashtags   ← always before posting
4. epicgram-safe-mode          ← always before any write action
5. epicgram-review-and-approval ← always before any publish
6. epicgram-multiposting-scheduler ← manages the queue
7. platform skill              ← epicgram-telegram-client-ops / epicgram-instagram-graph / etc.
```

Never skip steps 4 and 5 regardless of operator urgency.

## Claude-specific conventions

1. **Tool calls for API requests** — use Claude's HTTP tool or bash tool to call EPICGRAM API endpoints. Always include `Authorization` or API key headers from environment variables, never from hard-coded values.
2. **Approval cards** — render using Markdown tables and bold text since Claude Code displays Markdown natively.
3. **File writes** — never write to `epicgram/services/` or any production backend file as part of a content workflow. Content tasks = skill calls, not code edits.
4. **Memory** — Claude Code has no persistent memory across sessions. Always re-read the relevant brief/caption IDs from `/api/v1/operator/briefs` or `/api/v1/operator/captions` at the start of each session.
5. **Error surfaces** — surface ALL errors to the operator before retrying. Claude should not silently swallow a 401 or 403 from EPICGRAM API.

## Integration points

- Registry: `epicgram-skills/registry.json`
- API base: `artifacts/api-server` (see `api-server` artifact config)
- Client docs: https://docs.anthropic.com/claude-code

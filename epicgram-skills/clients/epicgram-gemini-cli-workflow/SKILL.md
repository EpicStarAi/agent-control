# epicgram-gemini-cli-workflow

## Description
Defines how Gemini CLI should discover, load, and use EPICGRAM skills from the command line. Covers tool routing, file-read conventions, and Gemini CLI's `@file` and `@url` syntax for skill loading.

## When to use
Load when operating as an EPICGRAM agent inside Gemini CLI (`gemini` command, Google's AI Studio CLI).

## Skill Loading in Gemini CLI

Gemini CLI supports `@file` context injection:
```bash
gemini "@epicgram-skills/product/epicgram-safe-mode/SKILL.md Follow the safe-mode protocol for this action: ..."
```

Load the registry to see all skills:
```bash
gemini "@epicgram-skills/registry.json List all active Wave 1 skills"
```

## Gemini CLI EPICGRAM Aliases (add to ~/.gemini/config or project .geminirc)

```yaml
aliases:
  eg-brief: "@epicgram-skills/product/epicgram-content-brief/SKILL.md"
  eg-script: "@epicgram-skills/product/epicgram-script-writer/SKILL.md"
  eg-caption: "@epicgram-skills/product/epicgram-caption-hashtags/SKILL.md"
  eg-safe: "@epicgram-skills/product/epicgram-safe-mode/SKILL.md"
  eg-approve: "@epicgram-skills/product/epicgram-review-and-approval/SKILL.md"
  eg-tg: "@epicgram-skills/platform/epicgram-telegram-client-ops/SKILL.md"
  eg-ig: "@epicgram-skills/platform/epicgram-instagram-graph/SKILL.md"
  eg-n8n: "@epicgram-skills/platform/epicgram-n8n-orchestrator/SKILL.md"
```

Usage after alias setup:
```bash
gemini "{eg-brief} {eg-script} Create a 60s reel about our product launch"
```

## Gemini-specific conventions

1. **`name` and `description` are critical** — Gemini uses the H1 and Description section to route tasks to the correct skill. Keep both precise and keyword-rich.
2. **Tool calls** — use Gemini CLI's `--tool curl` or pipe to shell for EPICGRAM API calls.
3. **No interactive approval UI** — in CLI mode, approval cards are plain text prompts: print the card, wait for `y/n` input.
4. **Output format** — prefer JSON output for downstream piping: add `Output as JSON` to any skill invocation.
5. **Session context** — Gemini CLI loses context between invocations. Pass `--context` or `@file` to carry brief/caption IDs forward.

## Example workflows

```bash
# Full content pipeline
gemini "@epicgram-skills/product/epicgram-content-brief/SKILL.md \
        @epicgram-skills/product/epicgram-script-writer/SKILL.md \
        Topic: AI tools for creators, Platform: TikTok, Duration: 45s"

# Publish to Telegram (requires approval)
gemini "@epicgram-skills/product/epicgram-safe-mode/SKILL.md \
        @epicgram-skills/platform/epicgram-telegram-client-ops/SKILL.md \
        Send the following caption to @mychannel: <caption>"
```

## Integration points

- Registry: `epicgram-skills/registry.json`
- Client docs: https://github.com/google-gemini/gemini-cli

# epicgram-nanobot-assistant

## Description
Configures nanobot (and nanobot-compatible agent runtimes) to use EPICGRAM skills as a personal AI assistant for content creation, Telegram account management, and publishing approvals.

## When to use
Load when running EPICGRAM as a nanobot agent — a persistent background assistant that proactively manages content tasks and surfaces approvals to the operator.

## nanobot Agent Configuration

nanobot supports the Agent Skills open standard natively. Point it at the registry:

```yaml
# .nanobot/config.yaml
skills:
  registry: epicgram-skills/registry.json
  autoload:
    - epicgram-safe-mode          # always loaded
    - epicgram-review-and-approval # always loaded
  on_demand:
    - epicgram-content-brief
    - epicgram-script-writer
    - epicgram-caption-hashtags
    - epicgram-multiposting-scheduler
    - epicgram-telegram-client-ops
    - epicgram-instagram-graph
    - epicgram-n8n-orchestrator
```

## Trigger → Skill Mapping

nanobot can listen for triggers and auto-load the appropriate skill:

| Trigger phrase | Skills loaded |
|---|---|
| "create content", "draft a post", "write about" | `epicgram-content-brief` → `epicgram-script-writer` |
| "post to", "send to", "publish" | `epicgram-safe-mode` → `epicgram-review-and-approval` → platform skill |
| "schedule", "queue", "later" | `epicgram-multiposting-scheduler` |
| "run n8n", "trigger workflow" | `epicgram-n8n-orchestrator` |
| "what's in the queue", "show pending" | `epicgram-multiposting-scheduler` (read) |

## Approval in nanobot context

nanobot surfaces approval requests as persistent notifications. The operator approves/rejects from the nanobot interface (chat or desktop notification). The agent waits and does not time out for 24 hours unless configured otherwise.

## Persistent memory

nanobot supports persistent context. Store these between sessions:
- Active EPICGRAM `account_id` — so the operator doesn't re-select it each time.
- Current `brief_id` if a content pipeline is in progress.
- Queue size — proactively alert the operator if queue grows > 5 items.

Never store: access tokens, session keys, or private message content.

## Integration points

- Registry: `epicgram-skills/registry.json`
- Autoloads: `epicgram-safe-mode`, `epicgram-review-and-approval`
- Client standard: https://agentskills.io/clients
- nanobot docs: https://nanobot.ai (or local installation)

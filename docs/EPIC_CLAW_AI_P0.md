# EPIC💀CLAW AI — P0 Implementation Plan

Status: approved for implementation
Branch: `feat/epic-claw-ai-p0`
Production: untouched
Telegram mutations: disabled by default

## Objective

Turn the existing EPIC💀GRAM operator into a controlled agent runtime with a model gateway, typed tools, persistent task state, client/project memory, approvals, audit logging, and Telegram read-only capabilities.

## Non-negotiable safety defaults

```env
TELEGRAM_SEND_ENABLED=false
TELEGRAM_MUTATION=false
BROWSER_WRITE_ENABLED=false
AGENT_AUTONOMY=observe
```

No tool may bypass these flags. Production, VPS, nginx, PM2, and NOVIKOVA are not modified by this branch.

## P0 deliverables

1. AI Model Gateway
   - OpenRouter-compatible provider interface.
   - Configurable primary and fallback models.
   - Request timeout, retry policy, token and cost limits.
   - Structured JSON responses.
   - Provider/model usage logging.

2. Agent Runtime
   - Task lifecycle: queued, planning, waiting_approval, running, completed, failed, cancelled.
   - Planner → executor → verifier loop.
   - Maximum steps and retry limits.
   - Cancellation and emergency stop.

3. Tool Registry
   - Typed input/output schemas.
   - Risk levels L0–L5.
   - Read/write capability metadata.
   - Permission and feature-flag checks before execution.
   - Initial read-only tools:
     - `telegram.get_status`
     - `telegram.list_accounts`
     - `telegram.list_chats`
     - `telegram.get_chat`
     - `telegram.get_messages`
     - `telegram.search_messages`
     - `telegram.get_admin_rights`

4. Approval Gate
   - L0/L1: automatic in observe/copilot mode.
   - L2+: explicit approval record required.
   - Approval bound to user, task, tool, arguments hash, expiry, and current account.
   - State revalidation immediately before execution.

5. Memory
   - Client profile memory.
   - Project/channel memory.
   - Current task working memory.
   - Procedural playbooks.
   - No unrestricted training on Telegram conversations.

6. Telegram Knowledge Base
   - Source registry with URL, version, checked date, validity, and confidence.
   - Official Telegram documentation and internal verified playbooks.
   - Retrieval interface prepared for PostgreSQL + pgvector.

7. Audit and observability
   - Trace ID and workflow ID for every task.
   - Model call usage, latency, cost, status, and fallback.
   - Tool request, approval, execution, result, and error.
   - No secrets or raw session keys in logs.

8. Operator API
   - `POST /api/operator/tasks`
   - `GET /api/operator/tasks/:id`
   - `POST /api/operator/tasks/:id/cancel`
   - `POST /api/operator/approvals/:id/approve`
   - `POST /api/operator/approvals/:id/reject`
   - `GET /api/operator/tools`
   - `GET /api/operator/health`

9. Operator UI
   - Goal input.
   - Current plan and active step.
   - Tool activity timeline.
   - Approval cards with argument preview.
   - Cost and model indicator.
   - Stop button.
   - Russian interface.

## Core data model

- `agent_tasks`
- `agent_task_steps`
- `agent_runs`
- `agent_tool_calls`
- `agent_approvals`
- `agent_memories`
- `agent_playbooks`
- `ai_usage_logs`
- `knowledge_sources`
- `knowledge_documents`
- `knowledge_chunks`

Every tenant-bound table must include tenant/user scope and timestamps.

## Execution pipeline

```text
User goal
→ authenticate and resolve tenant/account
→ classify task
→ load client/project memory
→ retrieve relevant knowledge
→ generate structured plan
→ validate plan and budgets
→ execute permitted read-only tool
→ compare expected and actual result
→ persist trace and state
→ return progress/result
```

## Acceptance criteria

- A user can submit a natural-language goal and receive a persisted structured plan.
- The runtime can call at least three real Telegram read-only tools through the registry.
- Every call has schema validation, permission checks, trace ID, status, and audit entry.
- A write-capable tool cannot execute while mutation flags are disabled.
- The UI shows task state, steps, tool calls, errors, and cancellation.
- Model failure triggers a bounded fallback or a clear failed state.
- Restarting the API does not lose persisted task history.
- No production deployment occurs from this branch.

## Implementation order

1. Audit existing operator routes, auth, database layer, and TDLib client.
2. Add database migrations and shared types.
3. Implement tool registry and policy checks.
4. Wrap existing TDLib read methods as tools.
5. Implement model gateway and structured planner.
6. Implement task runtime and persistence.
7. Add approvals and kill switches.
8. Add operator API endpoints.
9. Connect the existing operator UI.
10. Add unit, integration, and safety tests.

## Definition of done for P0

P0 is complete when EPIC💀CLAW can understand a user goal, create a plan, inspect the authorized Telegram environment through real read-only tools, explain what it found, persist the complete trace, and remain technically incapable of sending or mutating Telegram data under the default configuration.

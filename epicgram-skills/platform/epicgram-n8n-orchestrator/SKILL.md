# epicgram-n8n-orchestrator

## Description
Triggers, monitors, and manages n8n workflows from within EPICGRAM operator context. Acts as a safe bridge between AI-driven actions and production n8n automations. All triggers go through the safety gate.

## When to use
Load when:
- The operator asks to run an n8n workflow by name or ID.
- A product skill (multiposting-scheduler, content-brief) needs to hand off to n8n for execution.
- The operator wants to check the status of a running workflow execution.
- Debugging a failed n8n execution from within EPICGRAM.

## Safety policy

**ALL n8n workflow triggers are classified ORANGE or RED by default.**  
Always call `epicgram-safe-mode` before triggering. Exceptions:
- Read-only calls (list workflows, get execution status) — GREEN.
- Dry-run / test executions in a staging n8n instance — YELLOW.

## Configuration

Required environment variables (set via EPICGRAM secrets, never hard-coded):
```
N8N_BASE_URL=https://your-n8n-instance.com
N8N_API_KEY=<secret>
```

## API Reference

### List available workflows
```
GET {N8N_BASE_URL}/api/v1/workflows
Headers: X-N8N-API-KEY: {N8N_API_KEY}
```

### Trigger a workflow (webhook)
```
POST {N8N_BASE_URL}/webhook/{workflow_webhook_path}
Content-Type: application/json
Body: { "source": "epicgram", "payload": <data>, "operator": <account> }
```

### Trigger via API (by workflow ID)
```
POST {N8N_BASE_URL}/api/v1/workflows/{workflowId}/run
Headers: X-N8N-API-KEY: {N8N_API_KEY}
Body: { "startNode": null, "data": <payload> }
```

### Get execution status
```
GET {N8N_BASE_URL}/api/v1/executions/{executionId}
Headers: X-N8N-API-KEY: {N8N_API_KEY}
```

## Trigger Flow

1. Identify workflow by name or ID (list if ambiguous).
2. Classify action with `epicgram-safe-mode` (ORANGE for production triggers).
3. Present approval card via `epicgram-review-and-approval`.
4. On approval: POST to webhook or API endpoint.
5. Poll execution status every 10s for up to 5 minutes.
6. Return result to operator — success summary or error detail.
7. Log to audit trail: `{ event: "n8n_trigger", workflow_id, execution_id, status, operator }`.

## Error Handling

| HTTP status | Meaning | Action |
|---|---|---|
| 200/201 | Triggered successfully | Poll for completion |
| 401 | Invalid API key | Alert operator, do not retry |
| 404 | Workflow not found | List available workflows, let operator choose |
| 409 | Workflow already running | Show status of existing run |
| 5xx | n8n server error | Retry once after 30s, then alert |

## Operator Status Card

```
⚙️ n8n — <workflow name>
─────────────────────────────
Status:     running / success / error
Started:    <timestamp>
Execution:  <execution_id>
─────────────────────────────
<last output node result if available>
```

## Integration points

- Always calls: `epicgram-safe-mode` before any trigger
- Always calls: `epicgram-review-and-approval` for ORANGE/RED triggers
- Called by: `epicgram-multiposting-scheduler`, `epicgram-content-brief` (for automated pipelines)
- Audit: `POST /api/v1/audit`

# FIRST CONTROLLED EXECUTION TEST PLAN
DEEPINSIDE · n8n · one workflow · manual · whitelisted · no autonomy

Status: T7.5 observability ✓ · T7.6 graph ✓ · T8 gate ✓ · T8.5 controlled execution ✓ · build exit 0.
Default is SAFE: nothing executes unless `N8N_EXECUTOR_ENABLED=true` AND every gate passes.

## 1. Environment setup
Set in the API server env (local only; never commit):
- `N8N_API_KEY=<local n8n key>`  — read server-side only, never shown.
- `N8N_EXECUTOR_ENABLED=true`
Restart the API after any env change (env is read at process start):
```powershell
Get-NetTCPConnection -LocalPort 8788 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }
npm run api:dev
```

## 2. Terminal health commands
```powershell
curl.exe http://127.0.0.1:8788/operator/analytics/status
curl.exe http://127.0.0.1:8788/infra/n8n/summary
curl.exe http://127.0.0.1:8788/infra/n8n/workflows
```
Expect JSON. `summary`/`workflows` must show n8n online and at least one workflow. No secrets appear in output.

## 3. UI path
`/agents` → 🧬 AI Stack → Workflows → (Workflows tab) Inspect a workflow → Graph tab → Executor Gate tab.

## 4. Allowed workflow criteria
Pick ONE safe whitelisted workflow. Do NOT select any workflow containing:
Telegram send · email send · social publishing · shell command · file delete · destructive DB mutation (delete/drop/truncate) · mass/batch send · unknown high-risk nodes.
Good first target: a trivial test workflow (e.g. Manual Trigger → Set → NoOp) with no external side effects.

## 5. Required gate checklist (all TRUE)
- [ ] workflow selected
- [ ] workflow whitelisted (Mark Workflow Whitelisted)
- [ ] graph inspected (Mark Graph Inspected)
- [ ] executions inspected (Mark Executions Inspected)
- [ ] risky nodes acknowledged (if any)
- [ ] credentials used acknowledged (if any)
- [ ] forbidden nodes = 0
- [ ] preflight = READY
- [ ] manual gate armed (Arm Manual Executor Gate)
- [ ] phrase entered EXACTLY: `EXECUTE ONE WHITELISTED WORKFLOW`

## 6. Execute button conditions
`Execute One Whitelisted Workflow` stays DISABLED unless ALL of:
`N8N_EXECUTOR_ENABLED=true` · `N8N_API_KEY` present · preflight READY · forbidden nodes = 0 · gate armed · exact phrase.

## 7. Expected safe result (payload-free)
Only: `executionPerformed, workflowIdMasked, workflowName, executionIdMasked, status, startedAt, stoppedAt, durationMs, evidenceId, safety`.
Never: raw payload · credentials · secrets · tokens · env · webhook body · request/response body.

## 8. Evidence
Written to localStorage `deepinside.selfHostedStack.executorEvidence.v1`:
`evidenceId, timestamp, workflowIdMasked, workflowName, executionIdMasked, operatorDecision, preflightSnapshot, graphSnapshotSafe, executionSummarySafe, safety`.

## 9. Failure handling
No automatic retry. Do not run again. Inspect the safe error summary, use Copy Claude Debug Prompt, keep the evidence entry. Rollback note: no retry, no repeated execution — re-arm consciously only after review.

## 10. n8n API fallback
If `/api/v1/workflows/:id/run` is unavailable in this n8n version, the response returns `executionPerformed:false` with a status reason — do NOT hack around it. Next phase **T8.6 — Safe Webhook Trigger Workflow**: a dedicated whitelisted webhook workflow with a test-only payload behind the same gates.

## Final GO / NO-GO
GO only if: env set + API restarted + n8n online + one safe whitelisted workflow + all gate checks TRUE + forbidden=0 + preflight READY + armed + exact phrase + button enabled.
NO-GO if any is false → stay in dry-arm.

## Реализовано

- EPICGRAM session security и per-user Telegram binding.
- Account-aware TDLib context и protected operator/Telegram APIs.
- Protected SSE/events, server-side chat ownership и candidate runtime flags.
- Real approved Telegram sends через Postgres-backed approval storage.
- PostgreSQL allowlist, action audit и persistent scheduler.
- Worker locking/idempotency через `FOR UPDATE SKIP LOCKED`.
- Manual CI и live Telegram E2E workflow.

## Live proof

- Active account slot: `account-mrt1***vcz`.
- Direct approved send chat: `899***006`.
- Direct approved send message: `230***673` / history readback `241***248`.
- PostgreSQL approval: `0b9a7074-e58e-4bee-820f-97b1005f9f4f`.
- PostgreSQL audit: `aud_mrt4jyrg_e8efed`.
- Scheduler sent job: `ee73abe5-3299-4d24-8cc6-993b8b52bc64`.
- Scheduler message: `241***249` / history readback `251***824`.
- Cancelled job: `2e963964-2c77-4791-b43a-d3df3f4fef3d`.
- Race/idempotency job: `ab5015d3-6688-4433-a4ee-9e97cd25db36`.

## Security proof

- Replay confirm/execute rejected.
- Payload text change rejected.
- Chat change rejected.
- Wrong internal secret rejected.
- `TELEGRAM_SEND_ENABLED=false` rejected.
- `TELEGRAM_MUTATION=false` rejected.
- Revoked allowlist rejected.
- Production-like runtime without reachable DB fails closed with `approval_db_required`.

## Не изменялось

- Production frontend/backend.
- Production DB.
- Production TDLib sessions.
- nginx.
- PM2 production processes.

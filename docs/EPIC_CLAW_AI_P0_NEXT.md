# Next slice

1. Wire `GET /operator/claw/tools` and `POST /operator/claw/tools/execute` to the runtime.
2. Require the existing authenticated operator session before either route is available.
3. Persist task, plan, step and tool-call records in PostgreSQL.
4. Add OpenRouter-compatible Model Gateway in draft-only mode.
5. Add integration tests proving unauthenticated and write-capability requests are rejected.

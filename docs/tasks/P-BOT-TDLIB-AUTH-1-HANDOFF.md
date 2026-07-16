# Claude/Codex handoff

Implement `docs/tasks/P-BOT-TDLIB-AUTH-1.md` exactly within branch `feat/bot-tdlib-auth-flow`.

Start with a read-only audit of the existing bot webhook, Telegram Mini App initData validation, TDLib session manager, and `/tma/profile` architecture. Reuse existing security and policy primitives where possible.

Do not merge, deploy, restart production, change the production webhook, or touch the NOVIKOVA TDLib database. Build and test on an isolated candidate only. Finish with a Draft PR and the report required by the specification.
# EPIC💀CLAW Runtime

This module is the controlled execution boundary between AI planning and external tools.

- `tool-registry.mjs` — risk metadata, kill switches, approval checks and execution lifecycle.
- `telegram-tools.mjs` — real read-only TDLib adapters.
- `runtime.mjs` — runtime composition and audit hooks.

All external actions must be registered here before they can be exposed to an AI model. Direct model-to-runtime imports of `sendMessage`, account mutation, browser writes, or infrastructure actions are prohibited.

---
name: EPICGRAM AI Operator Glow System
description: Architecture of the AI activity neon glow effect around the main workspace
---

**Event bus:** `window.dispatchEvent(new CustomEvent("epicgram:ai-glow", { detail: { state } }))`.
States: `idle | thinking | tool_call | success | error | approval_required`.
Settings changes dispatched as: `"epicgram:glow-settings-changed"`.

**Files:**
- Hook: `artifacts/epicgram-web/src/hooks/useAIGlowSettings.ts` — persistence, 6 themes, intensity, color resolution
- Component: `artifacts/epicgram-web/src/components/AIOperatorGlow.tsx` — fixed overlay, CSS keyframes, running border for tool_call
- Emitter: `GlobalAIOperatorSidebar.tsx` — calls `emitGlowState()` at: thinking start, each toolCall SSE, done (→success/approval_required), navigation action, error, abort

**CSS approach:** `position:fixed, inset:0, pointer-events:none, z-50` with `box-shadow` (inner+outer) animated via `@keyframes`. Running border = 4 gradient bars (`ag-bar-top/right/bottom/left`) with staggered delays.

**Why:** `box-shadow` on a fixed overlay is the only approach that doesn't touch the layout at all and still covers the entire viewport perimeter. `pointer-events:none` ensures zero click interference.

**Auto-reset:** success → idle after 1.2s; error → idle after 3s. These are handled inside `AIOperatorGlow` via `setTimeout`. Caller just emits the state, doesn't need to reset.

**Settings persistence key:** `"epicgram.glow.v1"`. UI lives in SettingsCenter → Оформление → "✦ AI Оператор · Свечение". Has live preview buttons that fire real glow events for testing.

**prefers-reduced-motion:** handled via CSS media query inside the injected `<style>` — animations collapse to static opacity, running bars disappear.

# PR 2 — Telegram-native Profile + AI Operator Overlay

## Objective

Build a mobile-first Telegram-native user profile inside EPIC💀GRAM AI / Telegram Mini App, while keeping EPIC💀CLAW AI Operator as a separate contextual overlay above the profile.

## Product rule

The profile remains the primary surface. The operator augments it and must not replace, obscure, or destroy user context.

## Routes

- `/tma/profile`
- `/tma/profile?operator=compact`
- `/tma/profile?operator=expanded`

## Operator states

```ts
type OperatorPanelState = "closed" | "compact" | "expanded";
```

### closed
- floating branded AI control
- preserves full profile interaction

### compact
- bottom sheet occupying approximately 35–45% of `100dvh`
- current context: connected Telegram profile
- quick read-only actions and task preparation

### expanded
- full-screen `100dvh` overlay
- fixed header
- isolated history scroll
- sticky footer/input
- Allow/Deny action cards

## Profile information policy

Render only fields provided by authenticated Telegram Mini App data, EPICGRAM backend, or TDLib.

Do not fabricate or infer:
- registration date
- phone number
- security status
- private account metadata
- unsupported online state

Sensitive fields require explicit product permission and backend support.

## Suggested component structure

```text
apps/web/app/tma/profile/page.tsx
apps/web/components/tma/TelegramProfileView.tsx
apps/web/components/tma/ProfileInfoCard.tsx
apps/web/components/tma/ProfileMediaTabs.tsx
apps/web/components/tma/FloatingOperatorButton.tsx
apps/web/components/tma/AIOperatorOverlay.tsx
```

## Mobile layout contract

- root profile surface: `min-h-[100dvh]`
- expanded operator: `h-[100dvh] max-h-[100dvh]`
- operator grid: `grid grid-rows-[auto_minmax(0,1fr)_auto]`
- history: `min-h-0 overflow-y-auto overscroll-contain`
- footer safe area: `pb-[env(safe-area-inset-bottom)]`
- minimum touch target: 44x44px
- opening/closing overlay preserves profile scroll position

## Safety contract

```text
ANALYZE → text only, no action
DRAFT → draft only, no mutation
PREPARE_ACTION → pending card
ALLOW → execute exactly once
DENY → terminal CANCELLED
```

No Telegram/profile mutation may occur before explicit Allow.

## Visual direction

- Telegram-native hierarchy
- EPIC💀GRAM dark matte surfaces
- restrained neon contour lighting
- red/fuchsia theme support
- no pixel-perfect copying of Nicegram or Telegram proprietary artwork

## Acceptance gates

- `/tma/profile` works at 320–430px
- only real fields are rendered
- compact and expanded operator states work deterministically
- profile scroll position survives overlay open/close
- history scroll does not chain to page/body
- header/footer remain visible
- Allow/Deny are never hidden by input or browser chrome
- read-only never creates an action card
- Deny cannot be revived after reload
- operator overlay does not break profile navigation

## Related issue

Closes #14

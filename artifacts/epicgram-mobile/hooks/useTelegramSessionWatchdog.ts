import { useEffect, useRef, useState } from "react";
import { fetch } from "expo/fetch";

// OWNER ALERT WATCHDOG (React Native / Expo port)
//
// Subscribes to the EPICGRAM backend's SSE event bus (/v1/runtime/events)
// using expo/fetch streaming (getReader), which works on iOS, Android, and web.
// Mirrors the logic in epicgram-web/src/hooks/useTelegramSessionWatchdog.ts:
// watches for "auth.state_changed" events where unexpectedDrop=true.

export type TelegramSessionAlert = {
  accountId: string | null;
  authorizationState: string | null;
  at: string;
} | null;

// Module-level singleton state — one watchdog subscription for the whole app.
let currentAlert: TelegramSessionAlert = null;
const listeners = new Set<(alert: TelegramSessionAlert) => void>();

function setAlert(next: TelegramSessionAlert) {
  currentAlert = next;
  for (const listener of listeners) listener(next);
}

export function getTelegramAlert(): TelegramSessionAlert {
  return currentAlert;
}

export function dismissTelegramAlert() {
  setAlert(null);
}

export function subscribeTelegramAlert(
  listener: (alert: TelegramSessionAlert) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Read/subscribe helper for components that just need to react to alert state. */
export function useTelegramSessionAlert(): TelegramSessionAlert {
  const [alert, setLocalAlert] = useState<TelegramSessionAlert>(getTelegramAlert());
  useEffect(() => subscribeTelegramAlert(setLocalAlert), []);
  return alert;
}

/**
 * Mount ONCE in the root _layout. Owns the single SSE connection used for
 * session-drop alerting. Uses expo/fetch streaming so it works natively on
 * iOS and Android (no EventSource polyfill needed).
 */
export function useTelegramSessionWatchdogEffect() {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return;

    const sseUrl = `https://${domain}/api/v1/runtime/events`;
    let active = true;

    async function connectSSE() {
      while (active) {
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const response = await fetch(sseUrl, {
            headers: { Accept: "text/event-stream" },
            signal: controller.signal,
          });

          if (!response.body) break;
          const reader = (response.body as ReadableStream<Uint8Array>).getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (active) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (!raw || raw === ":keepalive") continue;

              let evt: {
                type?: string;
                accountId?: string | null;
                data?: Record<string, unknown>;
              } | null = null;
              try {
                evt = JSON.parse(raw);
              } catch {
                continue;
              }

              if (!evt || evt.type !== "auth.state_changed") continue;
              const authorizationState =
                (evt.data?.authorizationState as string) ?? null;
              const unexpectedDrop = Boolean(evt.data?.unexpectedDrop);

              if (unexpectedDrop) {
                const alert: TelegramSessionAlert = {
                  accountId: evt.accountId ?? null,
                  authorizationState,
                  at: new Date().toISOString(),
                };
                setAlert(alert);
                console.warn(
                  `[epicgram-mobile] Telegram session for account "${alert.accountId ?? "main"}" went offline unexpectedly (now: ${authorizationState}). Re-authenticate in Settings.`
                );
              } else if (authorizationState === "authorizationStateReady") {
                // Session recovered — clear any standing alert for this account.
                if (
                  currentAlert &&
                  (currentAlert.accountId ?? null) === (evt.accountId ?? null)
                ) {
                  setAlert(null);
                }
              }
            }
          }
        } catch (err: unknown) {
          if (!active) break;
          // Reconnect after delay on transient errors
          const isAbort =
            err instanceof Error && err.name === "AbortError";
          if (isAbort) break;
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }

    connectSSE();

    return () => {
      active = false;
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);
}

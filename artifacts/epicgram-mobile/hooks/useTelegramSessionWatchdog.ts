import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { fetch } from "expo/fetch";

// OWNER ALERT WATCHDOG (React Native / Expo port)
//
// Subscribes to the EPICGRAM backend's SSE event bus (/v1/runtime/events)
// using expo/fetch streaming (getReader), which works on iOS, Android, and web.
// Mirrors the logic in epicgram-web/src/hooks/useTelegramSessionWatchdog.ts:
// watches for "auth.state_changed" events where unexpectedDrop=true.
//
// Foreground recovery: when the OS resumes the app from background the SSE
// connection has been torn down and may have missed a recovery event. An
// AppState listener polls /v1/accounts on every foreground transition so
// a stale alert is cleared if the session has already recovered, then
// re-establishes the SSE stream.

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

// ---------------------------------------------------------------------------
// SSE connection state — tracks whether the watchdog stream is live or
// trying to reconnect after a proxy/network failure.
// ---------------------------------------------------------------------------

export type WatchdogConnectionState = "connected" | "reconnecting";

let connectionState: WatchdogConnectionState = "reconnecting";
const connectionStateListeners = new Set<
  (state: WatchdogConnectionState) => void
>();

function setConnectionState(next: WatchdogConnectionState) {
  if (connectionState === next) return;
  connectionState = next;
  for (const listener of connectionStateListeners) listener(next);
}

export function getWatchdogConnectionState(): WatchdogConnectionState {
  return connectionState;
}

export function subscribeWatchdogConnectionState(
  listener: (state: WatchdogConnectionState) => void
): () => void {
  connectionStateListeners.add(listener);
  return () => connectionStateListeners.delete(listener);
}

/** Read/subscribe helper for components that need to react to SSE connection state. */
export function useWatchdogConnectionState(): WatchdogConnectionState {
  const [state, setLocalState] = useState<WatchdogConnectionState>(
    getWatchdogConnectionState()
  );
  useEffect(() => subscribeWatchdogConnectionState(setLocalState), []);
  return state;
}

type AccountSlot = {
  slotId?: string;
  authorizationState?: string | null;
};

/**
 * Mount ONCE in the root _layout. Owns the single SSE connection used for
 * session-drop alerting. Uses expo/fetch streaming so it works natively on
 * iOS and Android (no EventSource polyfill needed).
 *
 * On every app foreground event (AppState → "active") the hook:
 *   1. Polls /v1/accounts to check whether the alerted account has recovered.
 *   2. If authorizationStateReady, dismisses the standing alert.
 *   3. Aborts the current SSE reader so the reconnect loop picks up a fresh
 *      connection instead of waiting on the dead stream.
 */
export function useTelegramSessionWatchdogEffect() {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    if (!domain) return;

    const sseUrl = `https://${domain}/api/v1/runtime/events`;
    const accountsUrl = `https://${domain}/api/v1/accounts`;
    let active = true;

    // Normalise accountId to a canonical string for comparison.
    // The API uses "main" as the default slotId; the alert stores null for that.
    function normaliseId(id: string | null | undefined): string {
      return id ?? "main";
    }

    /** One-shot poll: dismiss the alert if the session is now Ready. */
    async function pollAndSync() {
      if (!currentAlert) return;
      try {
        const res = await fetch(accountsUrl, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          accounts?: AccountSlot[];
        };
        const accounts = data?.accounts ?? [];
        const alertedId = normaliseId(currentAlert?.accountId);
        const match = accounts.find(
          (a) => normaliseId(a.slotId) === alertedId
        );
        if (match?.authorizationState === "authorizationStateReady") {
          // Session recovered while we were backgrounded — clear the alert.
          if (
            currentAlert &&
            normaliseId(currentAlert.accountId) === alertedId
          ) {
            setAlert(null);
          }
        }
      } catch {
        // Network errors during the sync poll are non-fatal; the SSE stream
        // will catch any subsequent state changes once reconnected.
      }
    }

    async function connectSSE() {
      while (active) {
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const response = await fetch(sseUrl, {
            headers: { Accept: "text/event-stream" },
            signal: controller.signal,
          });

          if (!response.ok || !response.body) {
            // Proxy or backend returned an error (e.g. 503 when backend is
            // offline). Mark as reconnecting and back off before retrying.
            setConnectionState("reconnecting");
            await new Promise((r) => setTimeout(r, 5000));
            continue;
          }

          // Stream is open — mark connected so the UI clears any indicator.
          setConnectionState("connected");

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

          // Stream ended cleanly (server closed). Mark reconnecting so the UI
          // shows a spinner while the loop re-establishes the connection.
          if (active) setConnectionState("reconnecting");
        } catch (err: unknown) {
          if (!active) break;
          const isAbort = err instanceof Error && err.name === "AbortError";
          if (isAbort) {
            // Aborted externally (e.g. foreground reconnect) — loop continues
            // so a fresh connection is established immediately. Leave the
            // connection state as-is; the new connection will update it.
            continue;
          }
          // Transient network error — mark reconnecting and back off.
          setConnectionState("reconnecting");
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }

    connectSSE();

    // On foreground: sync alert state from the API then force a fresh SSE
    // connection (the old one was torn down when the OS suspended the runtime).
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === "active") {
        pollAndSync();
        abortRef.current?.abort();
      }
    }
    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      active = false;
      abortRef.current?.abort();
      abortRef.current = null;
      appStateSubscription.remove();
    };
  }, []);
}

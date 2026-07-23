import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";

// OWNER ALERT WATCHDOG
//
// Subscribes to the backend's read-only SSE event bus (/v1/runtime/events)
// and watches for "auth.state_changed" events on the real Telegram (TDLib)
// runtime. If the session was previously fully authorized
// (authorizationStateReady) and drops to any other state — remote logout,
// ban, expired session, TDLib restart losing the client, etc — this is
// almost certainly something the owner needs to know about right away, not
// just a status label that quietly changes somewhere in the UI.
//
// On an unexpected drop we:
//  - fire a persistent (no auto-dismiss) toast
//  - set a banner flag other components can read via `getTelegramAlert()`
//  - log to the browser console for anyone checking devtools
//
// The banner clears once the session goes back to authorizationStateReady,
// or the owner explicitly dismisses it.

export type TelegramSessionAlert = {
  accountId: string | null;
  authorizationState: string | null;
  at: string;
} | null;

let currentAlert: TelegramSessionAlert = null;
let activeToastId: string | number | null = null;
const listeners = new Set<(alert: TelegramSessionAlert) => void>();

function setAlert(next: TelegramSessionAlert) {
  currentAlert = next;
  for (const listener of listeners) listener(next);
}

export function getTelegramAlert(): TelegramSessionAlert {
  return currentAlert;
}

export function dismissTelegramAlert() {
  if (activeToastId !== null) {
    toast.dismiss(activeToastId);
    activeToastId = null;
  }
  setAlert(null);
}

export function subscribeTelegramAlert(listener: (alert: TelegramSessionAlert) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Mount ONCE near the app root. Owns the single SSE connection used for
 * session-drop alerting; safe to call the exported alert helpers from any
 * other component without re-subscribing.
 */
export function useTelegramSessionWatchdogEffect() {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;
    const es = new EventSource(apiUrl("/v1/runtime/events"));
    esRef.current = es;

    es.onmessage = (msg) => {
      let evt: { type?: string; accountId?: string | null; data?: Record<string, unknown> } | null = null;
      try {
        evt = JSON.parse(msg.data);
      } catch {
        return;
      }
      if (!evt || evt.type !== "auth.state_changed") return;
      const authorizationState = (evt.data?.authorizationState as string) ?? null;
      const unexpectedDrop = Boolean(evt.data?.unexpectedDrop);

      if (unexpectedDrop) {
        const alert: TelegramSessionAlert = {
          accountId: evt.accountId ?? null,
          authorizationState,
          at: new Date().toISOString()
        };
        setAlert(alert);
        console.warn(
          `[epicgram] Telegram session for account "${alert.accountId ?? "main"}" went offline unexpectedly (now: ${authorizationState}). Owner action needed: re-authenticate in Settings.`
        );
        // Dismiss any previous alert toast before firing a new one, then store
        // the new ID so we can dismiss it programmatically when the session
        // recovers or the owner manually clears the banner.
        if (activeToastId !== null) toast.dismiss(activeToastId);
        activeToastId = toast.error("Telegram-сессия отключилась неожиданно", {
          description: "Аккаунт вышел из авторизации без явного логаута. Переавторизуйтесь в Настройках, чтобы восстановить сессию.",
          duration: Infinity
        });
      } else if (authorizationState === "authorizationStateReady") {
        // Session recovered — clear any standing alert for this account,
        // including the persistent toast so it doesn't linger after re-auth.
        if (currentAlert && (currentAlert.accountId ?? null) === (evt.accountId ?? null)) {
          if (activeToastId !== null) {
            toast.dismiss(activeToastId);
            activeToastId = null;
          }
          setAlert(null);
        }
      }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);
}

/** Read/subscribe helper for components that just need to render the banner. */
export function useTelegramSessionAlert(): TelegramSessionAlert {
  const [alert, setLocalAlert] = useState<TelegramSessionAlert>(getTelegramAlert());
  useEffect(() => subscribeTelegramAlert(setLocalAlert), []);
  return alert;
}

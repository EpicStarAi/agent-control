// OperatorPresenceProvider — React context for EPIC💀GRAM operator state
// Lightweight neon glow based on operator state
"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { OPERATOR_STATES, OPERATOR_TARGETS, type OperatorState, type UIActionPayload } from '@/lib/epic-live-feed';

interface OperatorPresenceContextValue {
  state: OperatorState;
  setState: (s: OperatorState) => void;
  emitAction: (action: UIActionPayload) => void;
  lastAction: UIActionPayload | null;
}

const OperatorPresenceContext = createContext<OperatorPresenceContextValue>({
  state: OPERATOR_STATES.IDLE,
  setState: () => {},
  emitAction: () => {},
  lastAction: null,
});

export function OperatorPresenceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OperatorState>(OPERATOR_STATES.IDLE);
  const [lastAction, setLastAction] = useState<UIActionPayload | null>(null);

  const emitAction = useCallback((action: UIActionPayload) => {
    setLastAction(action);
  }, []);

  return (
    <OperatorPresenceContext.Provider value={{ state, setState, emitAction, lastAction }}>
      {children}
    </OperatorPresenceContext.Provider>
  );
}

export function useOperatorPresence() {
  return useContext(OperatorPresenceContext);
}

// Neon glow class based on operator state
export function getOperatorGlowClass(state: OperatorState): string {
  const map: Record<OperatorState, string> = {
    IDLE: 'text-tg-muted',
    THINKING: 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]',
    NAVIGATING: 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]',
    TARGETING: 'text-purple-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.8)]',
    ACTING: 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]',
    PUBLISHING: 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]',
    VERIFYING: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]',
    SUCCESS: 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,1)]',
    ERROR: 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]',
  };
  return map[state] || 'text-tg-muted';
}

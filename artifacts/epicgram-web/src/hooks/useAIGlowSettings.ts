// useAIGlowSettings — persisted glow theme settings for AI Operator visual activity mode.
// Exported separately so SettingsCenter and AIOperatorGlow can both read/write without prop-drilling.

import { useCallback, useEffect, useState } from "react";

export type GlowState =
  | "idle"
  | "thinking"
  | "tool_call"
  | "success"
  | "error"
  | "approval_required";

export const GLOW_THEMES = [
  { id: "crimson", name: "Crimson Red",   color: "#dc2626" },
  { id: "purple",  name: "Neon Purple",   color: "#a855f7" },
  { id: "cyber",   name: "Cyber Blue",    color: "#06b6d4" },
  { id: "toxic",   name: "Toxic Green",   color: "#22c55e" },
  { id: "amber",   name: "Amber Gold",    color: "#f59e0b" },
  { id: "custom",  name: "Custom Color",  color: "#e11d48" },
] as const;

export type GlowThemeId = typeof GLOW_THEMES[number]["id"];

export interface GlowSettings {
  enabled: boolean;
  themeId: GlowThemeId;
  customColor: string;   // used when themeId === "custom"
  intensity: number;     // 0–100
}

const LS_KEY = "epicgram.glow.v1";
const DEFAULTS: GlowSettings = {
  enabled: true,
  themeId: "crimson",
  customColor: "#e11d48",
  intensity: 70,
};

export function loadGlowSettings(): GlowSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveGlowSettings(s: GlowSettings) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

export function resolveGlowColor(settings: GlowSettings): string {
  if (settings.themeId === "custom") return settings.customColor;
  return GLOW_THEMES.find(t => t.id === settings.themeId)?.color ?? DEFAULTS.customColor;
}

// Utility: parse "#rrggbb" → [r, g, b]
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return [220, 38, 38];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

// React hook — keeps settings in sync with localStorage and cross-tab updates
export function useAIGlowSettings() {
  const [settings, setSettingsState] = useState<GlowSettings>(loadGlowSettings);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) setSettingsState(loadGlowSettings());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setSettings = useCallback((patch: Partial<GlowSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      saveGlowSettings(next);
      return next;
    });
  }, []);

  return { settings, setSettings, color: resolveGlowColor(settings) };
}

// Emit a glow state change event — call from anywhere in the app
export function emitGlowState(state: GlowState) {
  try {
    window.dispatchEvent(new CustomEvent("epicgram:ai-glow", { detail: { state } }));
  } catch {}
}

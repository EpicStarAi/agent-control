// AIOperatorGlow — contraluz neon border effect around the main EPICGRAM workspace.
// Triggered by AI Operator state events. Zero layout impact (position:fixed, pointer-events:none).
// Respects prefers-reduced-motion and user intensity/enabled settings.

import { useEffect, useRef, useState } from "react";
import { type GlowState, loadGlowSettings, resolveGlowColor, hexToRgb, emitGlowState } from "@/hooks/useAIGlowSettings";

const GLOW_KEYFRAMES = `
@keyframes ag-think {
  0%, 100% { opacity: 0.25; }
  50%       { opacity: 1; }
}
@keyframes ag-tool-pulse {
  0%, 100% { opacity: 0.55; }
  50%       { opacity: 1; }
}
@keyframes ag-success-flash {
  0%   { opacity: 1; }
  60%  { opacity: 0.6; }
  100% { opacity: 0; }
}
@keyframes ag-error {
  0%, 100% { opacity: 0.9; }
  40%      { opacity: 0.15; }
}
@keyframes ag-approval {
  0%, 100% { opacity: 0.75; }
  50%       { opacity: 0.38; }
}
/* Running border bars */
@keyframes ag-bar-right  { 0% { top: -60%; }    100% { top: 160%; } }
@keyframes ag-bar-bottom { 0% { left: 160%; }   100% { left: -60%; } }
@keyframes ag-bar-left   { 0% { bottom: -60%; } 100% { bottom: 160%; } }
@keyframes ag-bar-top    { 0% { right: 160%; }  100% { right: -60%; } }
/* Reduced-motion fallbacks: fade in/out only */
@media (prefers-reduced-motion: reduce) {
  @keyframes ag-think         { 0%, 100% { opacity: 0.5; } }
  @keyframes ag-tool-pulse    { 0%, 100% { opacity: 0.8; } }
  @keyframes ag-bar-right,
  @keyframes ag-bar-bottom,
  @keyframes ag-bar-left,
  @keyframes ag-bar-top       { 0%, 100% { opacity: 0; } }
  @keyframes ag-error         { 0%, 100% { opacity: 0.7; } }
  @keyframes ag-approval      { 0%, 100% { opacity: 0.6; } }
}
`;

interface GlowLayerProps {
  state: GlowState;
  color: string;       // hex
  intensity: number;   // 0–100
}

// Steady glow base — box-shadow inset overlay
function GlowBase({ state, color, intensity }: GlowLayerProps) {
  const [r, g, b] = hexToRgb(color);
  const scale = intensity / 100;

  if (state === "idle") return null;

  // Override color for success/error states
  const [fr, fg, fb] =
    state === "success"           ? [34, 197, 94]   :
    state === "error"             ? [239, 68, 68]    :
    state === "approval_required" ? [245, 158, 11]   :
    [r, g, b];

  const configs = {
    thinking: {
      shadow: `0 0 ${Math.round(40 * scale)}px ${Math.round(10 * scale)}px rgba(${fr},${fg},${fb},${(0.45 * scale).toFixed(2)}),
               inset 0 0 ${Math.round(30 * scale)}px ${Math.round(8 * scale)}px rgba(${fr},${fg},${fb},${(0.12 * scale).toFixed(2)})`,
      animation: "ag-think 2.6s ease-in-out infinite",
    },
    tool_call: {
      shadow: `0 0 ${Math.round(60 * scale)}px ${Math.round(16 * scale)}px rgba(${fr},${fg},${fb},${(0.7 * scale).toFixed(2)}),
               inset 0 0 ${Math.round(50 * scale)}px ${Math.round(12 * scale)}px rgba(${fr},${fg},${fb},${(0.18 * scale).toFixed(2)})`,
      animation: "ag-tool-pulse 0.85s ease-in-out infinite",
    },
    success: {
      shadow: `0 0 ${Math.round(80 * scale)}px ${Math.round(24 * scale)}px rgba(${fr},${fg},${fb},${(0.95 * scale).toFixed(2)}),
               inset 0 0 ${Math.round(60 * scale)}px ${Math.round(16 * scale)}px rgba(${fr},${fg},${fb},${(0.3 * scale).toFixed(2)})`,
      animation: "ag-success-flash 0.9s ease-out forwards",
    },
    error: {
      shadow: `0 0 ${Math.round(50 * scale)}px ${Math.round(14 * scale)}px rgba(${fr},${fg},${fb},${(0.85 * scale).toFixed(2)}),
               inset 0 0 ${Math.round(40 * scale)}px ${Math.round(10 * scale)}px rgba(${fr},${fg},${fb},${(0.22 * scale).toFixed(2)})`,
      animation: "ag-error 0.7s ease-in-out infinite",
    },
    approval_required: {
      shadow: `0 0 ${Math.round(44 * scale)}px ${Math.round(12 * scale)}px rgba(${fr},${fg},${fb},${(0.65 * scale).toFixed(2)}),
               inset 0 0 ${Math.round(36 * scale)}px ${Math.round(8 * scale)}px rgba(${fr},${fg},${fb},${(0.16 * scale).toFixed(2)})`,
      animation: "ag-approval 2.4s ease-in-out infinite",
    },
  };

  const cfg = configs[state as keyof typeof configs];
  if (!cfg) return null;

  return (
    <div
      aria-hidden
      style={{
        position: "fixed", inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        boxShadow: cfg.shadow,
        animation: cfg.animation,
        borderRadius: 0,
      }}
    />
  );
}

// Running border (tool_call only) — 4 gradient bars that circuit the viewport
function RunningBorder({ color, intensity }: { color: string; intensity: number }) {
  const [r, g, b] = hexToRgb(color);
  const alpha = ((intensity / 100) * 0.9).toFixed(2);
  const barColor = `rgba(${r},${g},${b},${alpha})`;
  const dur = 1.4; // seconds per bar

  const barBase: React.CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
  };

  // Top bar (travels right→left along top edge)
  const topBar: React.CSSProperties = {
    ...barBase,
    top: -1, left: 0, right: 0,
    height: 2,
    background: `linear-gradient(90deg, transparent, ${barColor} 30%, ${barColor} 70%, transparent)`,
    width: "60%",
    animation: `ag-bar-top ${dur}s linear infinite`,
    animationDelay: "0s",
    boxShadow: `0 0 8px 2px ${barColor}, 0 0 16px 4px rgba(${r},${g},${b},${(parseFloat(alpha) * 0.5).toFixed(2)})`,
  };

  // Right bar (travels top→bottom along right edge)
  const rightBar: React.CSSProperties = {
    ...barBase,
    right: -1, top: 0, bottom: 0,
    width: 2,
    background: `linear-gradient(180deg, transparent, ${barColor} 30%, ${barColor} 70%, transparent)`,
    height: "60%",
    animation: `ag-bar-right ${dur}s linear infinite`,
    animationDelay: `${dur * 0.25}s`,
    boxShadow: `0 0 8px 2px ${barColor}, 0 0 16px 4px rgba(${r},${g},${b},${(parseFloat(alpha) * 0.5).toFixed(2)})`,
  };

  // Bottom bar (travels left→right along bottom edge, reversed)
  const bottomBar: React.CSSProperties = {
    ...barBase,
    bottom: -1, left: 0, right: 0,
    height: 2,
    background: `linear-gradient(90deg, transparent, ${barColor} 30%, ${barColor} 70%, transparent)`,
    width: "60%",
    animation: `ag-bar-bottom ${dur}s linear infinite`,
    animationDelay: `${dur * 0.5}s`,
    boxShadow: `0 0 8px 2px ${barColor}, 0 0 16px 4px rgba(${r},${g},${b},${(parseFloat(alpha) * 0.5).toFixed(2)})`,
  };

  // Left bar (travels bottom→top along left edge)
  const leftBar: React.CSSProperties = {
    ...barBase,
    left: -1, top: 0, bottom: 0,
    width: 2,
    background: `linear-gradient(180deg, transparent, ${barColor} 30%, ${barColor} 70%, transparent)`,
    height: "60%",
    animation: `ag-bar-left ${dur}s linear infinite`,
    animationDelay: `${dur * 0.75}s`,
    boxShadow: `0 0 8px 2px ${barColor}, 0 0 16px 4px rgba(${r},${g},${b},${(parseFloat(alpha) * 0.5).toFixed(2)})`,
  };

  return (
    <div
      aria-hidden
      style={{ position: "fixed", inset: -1, zIndex: 51, pointerEvents: "none", overflow: "hidden" }}
    >
      <div style={topBar} />
      <div style={rightBar} />
      <div style={bottomBar} />
      <div style={leftBar} />
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────────
export function AIOperatorGlow() {
  const [glowState, setGlowState] = useState<GlowState>("idle");
  const [settings, setSettings] = useState(loadGlowSettings);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-read settings when they change (from SettingsCenter)
  useEffect(() => {
    const onGlowSettings = () => setSettings(loadGlowSettings());
    window.addEventListener("epicgram:glow-settings-changed", onGlowSettings);
    return () => window.removeEventListener("epicgram:glow-settings-changed", onGlowSettings);
  }, []);

  // Listen for AI state events
  useEffect(() => {
    const onGlow = (e: Event) => {
      const state = (e as CustomEvent).detail?.state as GlowState;
      if (!state) return;

      // Cancel pending success-reset timer
      if (successTimerRef.current) clearTimeout(successTimerRef.current);

      setGlowState(state);

      // Auto-reset transient states
      if (state === "success") {
        successTimerRef.current = setTimeout(() => setGlowState("idle"), 1200);
      }
      if (state === "error") {
        successTimerRef.current = setTimeout(() => setGlowState("idle"), 3000);
      }
    };
    window.addEventListener("epicgram:ai-glow", onGlow);
    return () => {
      window.removeEventListener("epicgram:ai-glow", onGlow);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Nothing to render if disabled or idle
  if (!settings.enabled || glowState === "idle") return null;

  const color = resolveGlowColor(settings);

  return (
    <>
      <style>{GLOW_KEYFRAMES}</style>
      <GlowBase state={glowState} color={color} intensity={settings.intensity} />
      {glowState === "tool_call" && (
        <RunningBorder color={color} intensity={settings.intensity} />
      )}
    </>
  );
}

// Convenience re-export so consumers don't need to import the hook separately
export { emitGlowState };

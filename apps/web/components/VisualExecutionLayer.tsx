"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgentVisualStep } from "@/lib/uiActionRegistry";
import { visualTargetToDomTarget } from "@/lib/uiActionRegistry";

type Rect = { left: number; top: number; width: number; height: number };

function targetSelector(target: string) {
  return `[data-ui-target="${CSS.escape(target)}"]`;
}

function readRect(target: string): Rect | null {
  if (typeof document === "undefined") return null;
  const node = document.querySelector<HTMLElement>(targetSelector(visualTargetToDomTarget(target as never)));
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

export function VisualExecutionLayer({
  step,
  paused,
  skipped,
}: {
  step: AgentVisualStep | null;
  paused: boolean;
  skipped: boolean;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [path, setPath] = useState<Array<{ x: number; y: number }>>([]);

  useEffect(() => {
    if (!step || skipped) {
      setRect(null);
      return;
    }

    const update = () => {
      const next = readRect(step.visualTarget);
      setRect(next);
      if (next) {
        setPath((points) => {
          const point = { x: next.left + next.width / 2, y: next.top + Math.min(next.height / 2, 42) };
          return [...points.slice(-5), point];
        });
      }
    };

    update();
    const timer = window.setInterval(update, 350);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step?.stepId, step?.visualTarget, skipped]);

  const cursor = useMemo(() => {
    if (!rect) return null;
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + Math.min(rect.height / 2, 42),
    };
  }, [rect]);

  if (!step || skipped || !rect || !cursor) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[180]" aria-hidden="true">
      <style>{`
        @keyframes epicBreachSpin {
          from { transform: rotate(0deg) scale(.94); }
          to { transform: rotate(360deg) scale(1.06); }
        }
        @keyframes epicBreachPulse {
          0%, 100% { opacity: .74; transform: translate(-50%, -50%) scale(.92); filter: hue-rotate(0deg); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); filter: hue-rotate(22deg); }
        }
        @keyframes epicStarDrift {
          0% { background-position: 0 0, 18px 12px; opacity: .28; }
          50% { opacity: .58; }
          100% { background-position: 42px 28px, -22px 36px; opacity: .28; }
        }
        @keyframes epicArcFlicker {
          0%, 100% { opacity: .72; box-shadow: 0 0 34px rgba(236,72,153,.8), 0 0 70px rgba(59,130,246,.28); }
          45% { opacity: 1; box-shadow: 0 0 46px rgba(236,72,153,1), 0 0 96px rgba(56,189,248,.48); }
          62% { opacity: .82; }
        }
      `}</style>
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <filter id="epic-red-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <polyline
          points={path.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="rgba(236,72,153,.86)"
          strokeDasharray="2 9"
          strokeLinecap="round"
          strokeWidth="3"
          filter="url(#epic-red-glow)"
        />
      </svg>
      <div
        className="absolute overflow-hidden rounded-2xl border border-fuchsia-400/65 bg-black/35 shadow-[0_0_52px_rgba(236,72,153,.44),0_0_90px_rgba(37,99,235,.16),inset_0_0_42px_rgba(0,0,0,.94)]"
        style={{
          left: rect.left - 6,
          top: rect.top - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,0,0,.98)_0%,rgba(9,3,19,.92)_34%,rgba(88,28,135,.26)_58%,transparent_76%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(56,189,248,.85) 0 1px, transparent 1.6px), radial-gradient(circle, rgba(236,72,153,.72) 0 1px, transparent 1.8px)",
            backgroundSize: "34px 34px, 52px 52px",
            animation: paused ? undefined : "epicStarDrift 3.2s linear infinite",
          }}
        />
        <div className="absolute inset-x-0 top-1/2 h-14 -translate-y-1/2 bg-fuchsia-500/12 blur-xl" />
      </div>
      <div
        className="absolute h-24 w-24 rounded-full"
        style={{
          left: cursor.x,
          top: cursor.y,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, #000 0%, #05000a 30%, rgba(168,85,247,.95) 45%, rgba(236,72,153,.82) 54%, rgba(56,189,248,.36) 65%, transparent 74%)",
          boxShadow: "0 0 36px rgba(236,72,153,.86), 0 0 72px rgba(59,130,246,.34), inset 0 0 24px #000",
          animation: paused ? undefined : "epicBreachPulse 1.2s ease-in-out infinite",
        }}
      >
        <div
          className="absolute inset-2 rounded-full border border-fuchsia-300/85 border-l-sky-400/80 border-t-white/20"
          style={{ animation: paused ? undefined : "epicBreachSpin 1.1s linear infinite, epicArcFlicker .9s ease-in-out infinite" }}
        />
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_18px_rgba(236,72,153,.95),0_0_34px_rgba(56,189,248,.75)]" />
      </div>
      <div
        className="absolute max-w-xs rounded-xl border border-fuchsia-400/40 bg-black/90 px-3 py-2 text-xs text-fuchsia-50 shadow-[0_0_34px_rgba(168,85,247,.34)] backdrop-blur"
        style={{ left: Math.min(cursor.x + 18, window.innerWidth - 280), top: Math.max(12, cursor.y - 18) }}
      >
        <div className="font-black uppercase tracking-wide text-fuchsia-300">{paused ? "PAUSED" : step.status}</div>
        <div className="mt-1 font-semibold">{step.message}</div>
        <div className="mt-1 text-sky-100/70">Ожидается: {step.expectedResult}</div>
        {step.actualResult && <div className="mt-1 text-emerald-200">Факт: {step.actualResult}</div>}
      </div>
    </div>
  );
}

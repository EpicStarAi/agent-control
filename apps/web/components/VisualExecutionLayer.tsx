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
      <svg className="absolute inset-0 h-full w-full">
        <polyline
          points={path.map((point) => `${point.x},${point.y}`).join(" ")}
          fill="none"
          stroke="rgba(34,211,238,.65)"
          strokeDasharray="5 7"
          strokeWidth="2"
        />
      </svg>
      <div
        className="absolute rounded-2xl border-2 border-cyan-300 bg-cyan-300/10 shadow-[0_0_34px_rgba(34,211,238,.45)]"
        style={{
          left: rect.left - 6,
          top: rect.top - 6,
          width: rect.width + 12,
          height: rect.height + 12,
        }}
      />
      <div
        className={`absolute h-6 w-6 rounded-full border border-white/80 bg-cyan-300/80 shadow-[0_0_24px_rgba(34,211,238,.85)] ${paused ? "" : "animate-pulse"}`}
        style={{ left: cursor.x - 12, top: cursor.y - 12 }}
      >
        <div className="absolute left-4 top-4 h-4 w-4 rotate-45 rounded-sm bg-cyan-200/90" />
      </div>
      <div
        className="absolute max-w-xs rounded-xl border border-cyan-300/35 bg-black/85 px-3 py-2 text-xs text-cyan-50 shadow-telegram backdrop-blur"
        style={{ left: Math.min(cursor.x + 18, window.innerWidth - 280), top: Math.max(12, cursor.y - 18) }}
      >
        <div className="font-black uppercase tracking-wide text-cyan-200">{paused ? "PAUSED" : step.status}</div>
        <div className="mt-1 font-semibold">{step.message}</div>
        <div className="mt-1 text-cyan-100/70">Ожидается: {step.expectedResult}</div>
        {step.actualResult && <div className="mt-1 text-emerald-200">Факт: {step.actualResult}</div>}
      </div>
    </div>
  );
}

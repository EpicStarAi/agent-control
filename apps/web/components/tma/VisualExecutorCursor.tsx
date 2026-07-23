"use client";

import { useEffect, useState } from "react";
import type { ExecutionPhase, Point } from "@/lib/visualExecutor";
import { phaseColor } from "@/lib/visualExecutor";

type Props = {
  visible: boolean;
  position: Point;
  label: string;
  phase: ExecutionPhase;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

// The EPIC💀CLAW AI cursor. Purely presentational: it never intercepts pointer
// events (pointer-events:none) so it cannot click anything on the user's behalf.
export default function VisualExecutorCursor({ visible, position, label, phase }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const color = phaseColor(phase);

  return (
    <div
      aria-hidden="true"
      data-epic-cursor="1"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        transition: reducedMotion ? "none" : "transform 620ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease",
        opacity: visible ? 1 : 0,
        pointerEvents: "none",
        zIndex: 220,
        willChange: "transform",
      }}
    >
      <div style={{ position: "relative", transform: "translate(-6px, -4px)" }}>
        {/* Pulsing focus ring */}
        <span
          style={{
            position: "absolute",
            left: -12,
            top: -12,
            width: 44,
            height: 44,
            borderRadius: "9999px",
            border: `2px solid ${color}`,
            boxShadow: `0 0 22px ${color}`,
            opacity: 0.7,
            animation: reducedMotion ? "none" : "epicCursorPulse 1.5s ease-in-out infinite",
          }}
        />
        {/* Claw / skull glyph */}
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 30,
            height: 30,
            borderRadius: "10px",
            background: "radial-gradient(circle at 35% 30%, rgba(10,12,24,0.96), rgba(2,2,6,0.98))",
            border: `1px solid ${color}`,
            boxShadow: `0 0 18px ${color}`,
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          💀
        </span>
        {/* Action label */}
        {label ? (
          <span
            style={{
              position: "absolute",
              left: 34,
              top: 2,
              whiteSpace: "nowrap",
              maxWidth: "62vw",
              overflow: "hidden",
              textOverflow: "ellipsis",
              padding: "4px 9px",
              borderRadius: "9px",
              fontSize: 11,
              fontWeight: 600,
              color: "#f8fafc",
              background: "rgba(3,7,18,0.82)",
              border: `1px solid ${color}66`,
              backdropFilter: "blur(8px)",
            }}
          >
            {label}
          </span>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes epicCursorPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.65;
          }
          50% {
            transform: scale(1.18);
            opacity: 0.3;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          span {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

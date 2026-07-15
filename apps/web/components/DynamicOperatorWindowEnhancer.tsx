"use client";

import { useEffect } from "react";

const STORAGE_KEY = "epicgram.tma.profile.operator.geometry.v2";
const TARGET_PATH = "/tma/profile";
const MIN_WIDTH = 360;
const MIN_HEIGHT = 420;
const EDGE_GAP = 16;

type Geometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized?: boolean;
  maximized?: boolean;
};

function loadGeometry(): Geometry | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Geometry) : null;
  } catch {
    return null;
  }
}

function saveGeometry(value: Geometry) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Persistence is optional.
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function isTargetRoute() {
  return window.location.pathname === TARGET_PATH;
}

function findTmaProfileOperator(): HTMLElement | null {
  if (!isTargetRoute()) return null;

  const sections = Array.from(document.querySelectorAll<HTMLElement>("section"));
  return (
    sections.find((section) => {
      const text = section.textContent ?? "";
      const parent = section.parentElement;
      const parentStyle = parent ? window.getComputedStyle(parent) : null;
      const rect = section.getBoundingClientRect();

      return (
        text.includes("EPIC💀CLAW AI OPERATOR") &&
        text.includes("CONVERSATION · ANALYSIS · PLANNING · ACTION") &&
        parentStyle?.position === "fixed" &&
        rect.width >= 280 &&
        rect.height >= 300
      );
    }) ?? null
  );
}

export default function DynamicOperatorWindowEnhancer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cleanupCurrent: (() => void) | null = null;

    const clearEnhancement = () => {
      cleanupCurrent?.();
      cleanupCurrent = null;
    };

    const enhance = () => {
      if (!isTargetRoute() || window.innerWidth < 768) {
        clearEnhancement();
        return;
      }

      const root = findTmaProfileOperator();
      if (!root || root.dataset.dynamicOperatorWindow === "tma-profile") return;

      clearEnhancement();
      root.dataset.dynamicOperatorWindow = "tma-profile";

      const overlay = root.parentElement as HTMLElement | null;
      const initialRect = root.getBoundingClientRect();
      const stored = loadGeometry();
      let geometry: Geometry = stored ?? {
        x: clamp(window.innerWidth - 520, EDGE_GAP, window.innerWidth - 460),
        y: clamp(72, EDGE_GAP, window.innerHeight - 520),
        width: clamp(initialRect.width || 460, MIN_WIDTH, Math.min(620, window.innerWidth - EDGE_GAP * 2)),
        height: clamp(initialRect.height || 680, MIN_HEIGHT, window.innerHeight - EDGE_GAP * 2),
      };
      let previousGeometry: Geometry | null = null;

      if (overlay) {
        overlay.style.pointerEvents = "none";
        overlay.style.background = "transparent";
        overlay.style.backdropFilter = "none";
      }

      root.style.position = "fixed";
      root.style.inset = "auto";
      root.style.margin = "0";
      root.style.maxWidth = "none";
      root.style.maxHeight = "none";
      root.style.zIndex = "170";
      root.style.transform = "none";
      root.style.overflow = "hidden";
      root.style.pointerEvents = "auto";
      root.style.boxShadow = "0 28px 90px rgba(0,0,0,.62), 0 0 40px rgba(217,70,239,.18)";

      const header = Array.from(root.querySelectorAll<HTMLElement>("header")).find((node) =>
        (node.textContent ?? "").includes("EPIC💀CLAW AI OPERATOR"),
      );

      const controls = document.createElement("div");
      controls.dataset.dynamicOperatorControls = "1";
      controls.style.cssText = "position:absolute;top:10px;right:88px;display:flex;gap:6px;z-index:30";

      const makeButton = (label: string, title: string) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.title = title;
        button.setAttribute("aria-label", title);
        button.style.cssText = "width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.16);background:rgba(3,7,18,.58);color:#fff;font-size:15px;line-height:1;backdrop-filter:blur(10px);cursor:pointer";
        return button;
      };

      const minimizeButton = makeButton("—", "Свернуть AI Operator");
      const maximizeButton = makeButton("□", "Развернуть AI Operator");
      controls.append(minimizeButton, maximizeButton);
      root.appendChild(controls);

      const resizeHandle = document.createElement("div");
      resizeHandle.dataset.dynamicOperatorResize = "1";
      resizeHandle.title = "Изменить размер";
      resizeHandle.style.cssText = "position:absolute;right:0;bottom:0;width:26px;height:26px;z-index:35;cursor:nwse-resize;background:linear-gradient(135deg,transparent 44%,rgba(34,211,238,.8) 45%,rgba(217,70,239,.85) 72%,transparent 73%);border-bottom-right-radius:18px";
      root.appendChild(resizeHandle);

      const apply = () => {
        const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - EDGE_GAP * 2);
        const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - EDGE_GAP * 2);

        geometry.width = clamp(geometry.width, MIN_WIDTH, maxWidth);
        geometry.height = clamp(geometry.height, MIN_HEIGHT, maxHeight);
        geometry.x = clamp(geometry.x, EDGE_GAP, window.innerWidth - geometry.width - EDGE_GAP);
        geometry.y = clamp(geometry.y, EDGE_GAP, window.innerHeight - geometry.height - EDGE_GAP);

        root.style.left = `${geometry.x}px`;
        root.style.top = `${geometry.y}px`;
        root.style.width = `${geometry.width}px`;
        root.style.height = geometry.minimized ? "68px" : `${geometry.height}px`;
        root.style.borderRadius = geometry.maximized ? "0" : "20px";
        resizeHandle.style.display = geometry.minimized || geometry.maximized ? "none" : "block";
        saveGeometry(geometry);
      };

      const maximize = () => {
        if (!geometry.maximized) {
          previousGeometry = { ...geometry, minimized: false, maximized: false };
          geometry = {
            x: EDGE_GAP,
            y: EDGE_GAP,
            width: window.innerWidth - EDGE_GAP * 2,
            height: window.innerHeight - EDGE_GAP * 2,
            minimized: false,
            maximized: true,
          };
        } else {
          geometry = previousGeometry ?? {
            x: window.innerWidth - 500,
            y: 72,
            width: 460,
            height: 680,
          };
          previousGeometry = null;
        }
        apply();
      };

      minimizeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        geometry.minimized = !geometry.minimized;
        geometry.maximized = false;
        apply();
      });

      maximizeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        maximize();
      });

      header?.addEventListener("dblclick", maximize);

      let dragStart: { x: number; y: number; gx: number; gy: number } | null = null;
      let resizeStart: { x: number; y: number; width: number; height: number } | null = null;

      const onPointerMove = (event: PointerEvent) => {
        if (dragStart && !geometry.maximized) {
          geometry.x = dragStart.gx + event.clientX - dragStart.x;
          geometry.y = dragStart.gy + event.clientY - dragStart.y;
          root.style.left = `${geometry.x}px`;
          root.style.top = `${geometry.y}px`;
        }

        if (resizeStart && !geometry.maximized) {
          geometry.width = resizeStart.width + event.clientX - resizeStart.x;
          geometry.height = resizeStart.height + event.clientY - resizeStart.y;
          root.style.width = `${clamp(geometry.width, MIN_WIDTH, window.innerWidth - geometry.x - EDGE_GAP)}px`;
          root.style.height = `${clamp(geometry.height, MIN_HEIGHT, window.innerHeight - geometry.y - EDGE_GAP)}px`;
        }
      };

      const finishPointer = () => {
        if (dragStart) {
          const snapDistance = 28;
          if (geometry.x < snapDistance) geometry.x = EDGE_GAP;
          if (window.innerWidth - (geometry.x + geometry.width) < snapDistance) {
            geometry.x = window.innerWidth - geometry.width - EDGE_GAP;
          }
          if (geometry.y < snapDistance) geometry.y = EDGE_GAP;
        }

        dragStart = null;
        resizeStart = null;
        document.body.style.userSelect = "";
        apply();
      };

      const startDrag = (event: PointerEvent) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, input, textarea, a, [data-dynamic-operator-controls]")) return;
        if (geometry.maximized) return;

        dragStart = {
          x: event.clientX,
          y: event.clientY,
          gx: geometry.x,
          gy: geometry.y,
        };
        document.body.style.userSelect = "none";
        event.preventDefault();
      };

      const startResize = (event: PointerEvent) => {
        resizeStart = {
          x: event.clientX,
          y: event.clientY,
          width: geometry.width,
          height: geometry.height,
        };
        document.body.style.userSelect = "none";
        event.preventDefault();
        event.stopPropagation();
      };

      header?.style.setProperty("cursor", "move");
      header?.style.setProperty("touch-action", "none");
      header?.addEventListener("pointerdown", startDrag);
      resizeHandle.addEventListener("pointerdown", startResize);
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", finishPointer);
      window.addEventListener("pointercancel", finishPointer);
      window.addEventListener("resize", apply);
      apply();

      cleanupCurrent = () => {
        header?.removeEventListener("pointerdown", startDrag);
        header?.removeEventListener("dblclick", maximize);
        resizeHandle.removeEventListener("pointerdown", startResize);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", finishPointer);
        window.removeEventListener("pointercancel", finishPointer);
        window.removeEventListener("resize", apply);
        controls.remove();
        resizeHandle.remove();
        delete root.dataset.dynamicOperatorWindow;
        root.removeAttribute("style");
        header?.style.removeProperty("cursor");
        header?.style.removeProperty("touch-action");
        if (overlay) overlay.removeAttribute("style");
      };
    };

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(enhance, 500);
    enhance();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      clearEnhancement();
    };
  }, []);

  return null;
}

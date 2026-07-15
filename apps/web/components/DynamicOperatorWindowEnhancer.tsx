"use client";

import { useEffect } from "react";

const STORAGE_KEY = "epicgram.operator.window.geometry.v1";
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
    // Storage is optional; the window remains functional without persistence.
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function findOperatorRoot(): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("div, aside, section"));
  const label = candidates.find((node) => {
    const text = node.textContent ?? "";
    return text.includes("CLAW") && text.includes("OPERATOR") && text.includes("CONVERSATION");
  });
  if (!label) return null;

  let node: HTMLElement | null = label;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    if ((style.position === "fixed" || style.position === "absolute") && rect.width >= 280 && rect.height >= 300) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export default function DynamicOperatorWindowEnhancer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cleanupCurrent: (() => void) | null = null;

    const enhance = () => {
      if (window.innerWidth < 768) {
        cleanupCurrent?.();
        cleanupCurrent = null;
        return;
      }

      const root = findOperatorRoot();
      if (!root || root.dataset.dynamicOperatorWindow === "1") return;
      root.dataset.dynamicOperatorWindow = "1";

      const initialRect = root.getBoundingClientRect();
      const stored = loadGeometry();
      let geometry: Geometry = stored ?? {
        x: clamp(initialRect.left || window.innerWidth - 500, EDGE_GAP, window.innerWidth - 460),
        y: clamp(initialRect.top || 96, EDGE_GAP, window.innerHeight - 520),
        width: clamp(initialRect.width || 440, MIN_WIDTH, Math.min(620, window.innerWidth - EDGE_GAP * 2)),
        height: clamp(initialRect.height || 620, MIN_HEIGHT, window.innerHeight - EDGE_GAP * 2)
      };
      let previousGeometry: Geometry | null = null;

      root.style.position = "fixed";
      root.style.inset = "auto";
      root.style.margin = "0";
      root.style.maxWidth = "none";
      root.style.maxHeight = "none";
      root.style.zIndex = "160";
      root.style.transform = "none";
      root.style.resize = "none";
      root.style.overflow = "hidden";
      root.style.boxShadow = "0 28px 90px rgba(0,0,0,.58), 0 0 36px rgba(217,70,239,.16)";

      const header = Array.from(root.querySelectorAll<HTMLElement>("div, header")).find((node) => {
        const text = node.textContent ?? "";
        const rect = node.getBoundingClientRect();
        return text.includes("OPERATOR") && rect.height >= 42 && rect.height <= 180;
      }) ?? root.firstElementChild as HTMLElement | null;

      const controls = document.createElement("div");
      controls.dataset.dynamicOperatorControls = "1";
      controls.style.cssText = "position:absolute;top:8px;right:72px;display:flex;gap:6px;z-index:20";

      const makeButton = (label: string, title: string) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.title = title;
        button.setAttribute("aria-label", title);
        button.style.cssText = "width:30px;height:30px;border-radius:9px;border:1px solid rgba(255,255,255,.16);background:rgba(3,7,18,.48);color:#fff;font-size:15px;line-height:1;backdrop-filter:blur(10px);cursor:pointer";
        return button;
      };

      const minimizeButton = makeButton("—", "Свернуть AI Operator");
      const maximizeButton = makeButton("□", "Развернуть AI Operator");
      controls.append(minimizeButton, maximizeButton);
      root.appendChild(controls);

      const resizeHandle = document.createElement("div");
      resizeHandle.dataset.dynamicOperatorResize = "1";
      resizeHandle.title = "Изменить размер";
      resizeHandle.style.cssText = "position:absolute;right:0;bottom:0;width:24px;height:24px;z-index:30;cursor:nwse-resize;background:linear-gradient(135deg,transparent 45%,rgba(34,211,238,.75) 46%,rgba(217,70,239,.8) 70%,transparent 71%);border-bottom-right-radius:14px";
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
        root.style.height = geometry.minimized ? "64px" : `${geometry.height}px`;
        root.style.borderRadius = geometry.maximized ? "0" : "18px";
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
            maximized: true
          };
        } else {
          geometry = previousGeometry ?? { x: window.innerWidth - 500, y: 80, width: 460, height: 680 };
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
          if (window.innerWidth - (geometry.x + geometry.width) < snapDistance) geometry.x = window.innerWidth - geometry.width - EDGE_GAP;
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
        dragStart = { x: event.clientX, y: event.clientY, gx: geometry.x, gy: geometry.y };
        document.body.style.userSelect = "none";
        event.preventDefault();
      };

      const startResize = (event: PointerEvent) => {
        resizeStart = { x: event.clientX, y: event.clientY, width: geometry.width, height: geometry.height };
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
      };
    };

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(enhance, 700);
    enhance();

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      cleanupCurrent?.();
    };
  }, []);

  return null;
}

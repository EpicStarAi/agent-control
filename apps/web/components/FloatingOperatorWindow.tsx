"use client";

import { Bot, Check, Grip, Loader2, Maximize2, Minimize2, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type PendingAction = {
  tool?: string;
  accountId?: string;
  chatId?: string;
  chatTitle?: string;
  text?: string;
  actionType?: string;
  auditId?: string;
};

type OperatorMessage = {
  role: "user" | "operator";
  text: string;
  pending?: PendingAction | null;
};

type CursorStep = "idle" | "search" | "chat" | "read" | "compose" | "approve" | "done";

const stepPosition: Record<CursorStep, { left: string; top: string; label: string }> = {
  idle: { left: "72%", top: "18%", label: "AI готов" },
  search: { left: "8%", top: "15%", label: "Ищу чат" },
  chat: { left: "10%", top: "34%", label: "Выбираю чат" },
  read: { left: "48%", top: "42%", label: "Читаю контекст" },
  compose: { left: "54%", top: "82%", label: "Готовлю действие" },
  approve: { left: "78%", top: "52%", label: "Жду Allow" },
  done: { left: "58%", top: "70%", label: "Выполнено" },
};

function useHideLegacyDock() {
  useEffect(() => {
    const hide = () => {
      const candidates = Array.from(document.querySelectorAll("body div, body button"));
      for (const node of candidates) {
        const text = node.textContent?.trim();
        if (!text || !/AI[-‑]Оператор/i.test(text)) continue;
        const el = node as HTMLElement;
        const style = window.getComputedStyle(el);
        if (style.position !== "fixed") continue;
        if (el.dataset.epicFloatingOperator === "true") continue;
        el.style.display = "none";
      }
    };
    hide();
    const timer = window.setInterval(hide, 1000);
    return () => window.clearInterval(timer);
  }, []);
}

export function FloatingOperatorWindow() {
  useHideLegacyDock();
  const [open, setOpen] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<OperatorMessage[]>([
    { role: "operator", text: "Я EPIC💀CLAW AI Operator. Telegram-клиент — моё рабочее пространство. Все действия покажу на экране и запрошу подтверждение перед отправкой." },
  ]);
  const [cursorStep, setCursorStep] = useState<CursorStep>("idle");
  const [position, setPosition] = useState({ x: Math.max(24, window.innerWidth - 510), y: 86 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const pendingIndex = useMemo(() => messages.findIndex((message) => message.pending), [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || maximized) return;
      setPosition({ x: Math.max(0, drag.px + event.clientX - drag.x), y: Math.max(0, drag.py + event.clientY - drag.y) });
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [maximized]);

  async function animatePlan() {
    const sequence: CursorStep[] = ["search", "chat", "read", "compose"];
    for (const step of sequence) {
      setCursorStep(step);
      await new Promise((resolve) => window.setTimeout(resolve, 520));
    }
  }

  async function sendCommand() {
    const command = text.trim();
    if (!command || busy) return;
    setText("");
    setMessages((current) => [...current, { role: "user", text: command }]);
    setBusy(true);
    await animatePlan();

    try {
      const response = await fetch("/api/operator/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: command, command }),
      });
      const data = await response.json().catch(() => null);
      if (data?.kind === "pending" && data?.action) {
        setCursorStep("approve");
        setMessages((current) => [...current, { role: "operator", text: data.reply || "Подтвердите действие", pending: data.action }]);
      } else if (data?.ok && (data?.text || data?.draft)) {
        const proposal = String(data.draft || data.text).trim();
        setCursorStep("approve");
        setMessages((current) => [...current, {
          role: "operator",
          text: proposal || "Действие подготовлено",
          pending: data.action || { tool: "tg_send", text: proposal },
        }]);
      } else {
        setCursorStep("idle");
        setMessages((current) => [...current, { role: "operator", text: data?.text || data?.error || "Оператор не смог сформировать действие." }]);
      }
    } catch {
      setCursorStep("idle");
      setMessages((current) => [...current, { role: "operator", text: "Нет связи с runtime AI Operator." }]);
    } finally {
      setBusy(false);
    }
  }

  async function allow(index: number, action: PendingAction) {
    setBusy(true);
    setCursorStep("compose");
    try {
      let response: Response;
      if (action.tool === "tg_send" && action.chatId && action.text) {
        response = await fetch("/api/telegram/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ accountId: action.accountId, chatId: action.chatId, text: action.text, operatorApproved: true }),
        });
      } else {
        response = await fetch("/api/operator/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
      setCursorStep("done");
      setMessages((current) => current.map((message, messageIndex) => messageIndex === index ? { ...message, pending: null } : message).concat({ role: "operator", text: `✅ Выполнено${data?.messageId ? ` · messageId ${data.messageId}` : ""}` }));
      window.setTimeout(() => setCursorStep("idle"), 1400);
    } catch (error) {
      setCursorStep("approve");
      setMessages((current) => [...current, { role: "operator", text: `⚠ ${error instanceof Error ? error.message : "Действие не выполнено"}` }]);
    } finally {
      setBusy(false);
    }
  }

  function deny(index: number) {
    setMessages((current) => current.map((message, messageIndex) => messageIndex === index ? { ...message, pending: null } : message).concat({ role: "operator", text: "Действие отклонено пользователем." }));
    setCursorStep("idle");
  }

  const cursor = stepPosition[cursorStep];

  return (
    <>
      <div
        className={`pointer-events-none fixed z-[70] transition-all duration-500 ${cursorStep === "idle" ? "opacity-35" : "opacity-90"}`}
        style={{ left: cursor.left, top: cursor.top }}
      >
        <div className="relative">
          <div className={`h-7 w-7 rounded-full border-2 ${cursorStep === "approve" ? "border-amber-300 bg-amber-300/20" : cursorStep === "done" ? "border-emerald-300 bg-emerald-300/20" : "border-cyan-300 bg-cyan-300/20"} shadow-[0_0_24px_currentColor]`} />
          <div className="absolute left-7 top-5 whitespace-nowrap rounded-full border border-white/15 bg-[#08111f]/85 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">◉ {cursor.label}</div>
        </div>
      </div>

      {cursorStep !== "idle" && (
        <div className="pointer-events-none fixed inset-0 z-[60] bg-cyan-400/[0.015] ring-2 ring-inset ring-cyan-300/20" />
      )}

      {!open ? (
        <button data-epic-floating-operator="true" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[80] flex items-center gap-2 rounded-full border border-fuchsia-400/40 bg-[#121a37]/95 px-4 py-3 font-bold text-white shadow-[0_0_28px_rgba(217,70,239,.35)] backdrop-blur">
          <Bot className="h-5 w-5 text-fuchsia-300" /> AI Operator
        </button>
      ) : (
        <section
          data-epic-floating-operator="true"
          className={`fixed z-[80] flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#101629]/95 text-white shadow-[0_24px_90px_rgba(0,0,0,.72),0_0_35px_rgba(217,70,239,.18)] backdrop-blur-xl ${maximized ? "inset-5" : "h-[640px] w-[470px] max-w-[92vw] resize"}`}
          style={maximized ? undefined : { left: position.x, top: position.y }}
        >
          <header
            className="flex cursor-move items-center justify-between border-b border-white/10 bg-gradient-to-r from-fuchsia-950/70 via-[#101629] to-cyan-950/70 px-4 py-3"
            onPointerDown={(event) => {
              if ((event.target as HTMLElement).closest("button")) return;
              dragRef.current = { x: event.clientX, y: event.clientY, px: position.x, py: position.y };
            }}
          >
            <div className="flex items-center gap-2">
              <Grip className="h-4 w-4 text-white/35" />
              <Bot className="h-5 w-5 text-fuchsia-300" />
              <div>
                <div className="font-black tracking-wide">EPIC💀CLAW AI OPERATOR</div>
                <div className="text-[10px] uppercase tracking-[.18em] text-cyan-200/60">live action workspace</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMaximized((value) => !value)} className="rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white" title={maximized ? "Восстановить" : "Развернуть"}>{maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white" title="Свернуть"><X className="h-4 w-4" /></button>
            </div>
          </header>

          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs">
            <span className="text-white/55">Telegram Client · TDLib</span>
            <span className={`rounded-full px-2 py-1 ${cursorStep === "approve" ? "bg-amber-400/15 text-amber-200" : busy ? "bg-cyan-400/15 text-cyan-200" : "bg-emerald-400/15 text-emerald-200"}`}>{cursor.label}</span>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className={`max-w-[90%] rounded-2xl border px-3 py-2 text-sm leading-6 ${message.role === "user" ? "ml-auto border-cyan-300/20 bg-cyan-400/10" : "border-white/10 bg-white/[0.045]"}`}>
                <div className="whitespace-pre-wrap">{message.text}</div>
                {message.pending && (
                  <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3 text-xs">
                    <div><span className="text-white/45">Действие:</span> {message.pending.actionType || message.pending.tool || "Telegram action"}</div>
                    {message.pending.chatTitle && <div><span className="text-white/45">Чат:</span> {message.pending.chatTitle}</div>}
                    {message.pending.text && <div className="mt-1 whitespace-pre-wrap"><span className="text-white/45">Текст:</span> {message.pending.text}</div>}
                    <div className="mt-3 flex gap-2">
                      <button disabled={busy} onClick={() => allow(index, message.pending as PendingAction)} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 font-bold text-[#06150e] disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Allow</button>
                      <button disabled={busy} onClick={() => deny(index)} className="rounded-lg bg-rose-500/90 px-3 py-2 font-bold text-white disabled:opacity-50">Deny</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-sm text-cyan-200/70"><Loader2 className="h-4 w-4 animate-spin" /> AI Operator выполняет шаг…</div>}
          </div>

          <footer className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
              <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendCommand(); } }} rows={2} placeholder="Команда AI Operator…" className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-white/30" />
              <button disabled={busy || !text.trim()} onClick={() => void sendCommand()} className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-fuchsia-400 text-[#071022] disabled:opacity-40"><Send className="h-4 w-4" /></button>
            </div>
            {pendingIndex >= 0 && <div className="mt-2 text-center text-[10px] uppercase tracking-[.16em] text-amber-200/60">Ожидается подтверждение действия</div>}
          </footer>
        </section>
      )}
    </>
  );
}

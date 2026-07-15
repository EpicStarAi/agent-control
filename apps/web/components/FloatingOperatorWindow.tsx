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
type Intent = "conversation" | "analysis" | "planning" | "action";

type TelegramChat = {
  id: string;
  title: string;
  lastMessage?: { content?: string } | null;
};

type TelegramContext = {
  accountId: string;
  accountName: string;
  chatId: string;
  chatTitle: string;
  messages: Array<{ content: string; isOutgoing: boolean }>;
  ready: boolean;
};

const stepPosition: Record<CursorStep, { left: string; top: string; label: string }> = {
  idle: { left: "72%", top: "18%", label: "AI готов" },
  search: { left: "8%", top: "15%", label: "Ищу чат" },
  chat: { left: "10%", top: "34%", label: "Выбираю чат" },
  read: { left: "48%", top: "42%", label: "Читаю контекст" },
  compose: { left: "54%", top: "82%", label: "Формирую ответ" },
  approve: { left: "78%", top: "52%", label: "Жду Allow" },
  done: { left: "58%", top: "70%", label: "Выполнено" },
};

const ACTION_RE = /(отправ|напиш|опублику|перешл|удал|созда(й|ть)|запланир|ответь\s+в\s+чат|поставь|закрепи|измени\s+сообщение)/i;
const ANALYSIS_RE = /(проанализ|прочитай|покажи|найди|сводк|непрочитан|что\s+в\s+чате|последн(ие|их)\s+сообщ)/i;
const PLAN_RE = /(составь\s+план|как\s+лучше|с\s+чего\s+начать|предложи\s+шаг|стратег|план\s+действ)/i;
const GREETING_RE = /^(привет|здравствуй|добрый\s+(день|вечер|утро)|хай|hello|hi|ку|как\s+дела)[!,.\s]*$/i;

function classifyIntent(text: string): Intent {
  if (ACTION_RE.test(text)) return "action";
  if (ANALYSIS_RE.test(text)) return "analysis";
  if (PLAN_RE.test(text)) return "planning";
  return "conversation";
}

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

function findVisibleChatTitle(chats: TelegramChat[]) {
  const activeNodes = Array.from(document.querySelectorAll<HTMLElement>("[class*='bg-tg-active']"));
  for (const node of activeNodes) {
    const text = node.innerText?.trim() ?? "";
    const match = chats.find((chat) => text.includes(chat.title));
    if (match) return match;
  }

  const visibleText = Array.from(document.querySelectorAll<HTMLElement>("header, main section"))
    .filter((node) => node.offsetParent !== null)
    .map((node) => node.innerText || "")
    .join("\n");
  return chats.find((chat) => chat.title.length > 3 && visibleText.includes(chat.title));
}

export function FloatingOperatorWindow() {
  useHideLegacyDock();
  const [open, setOpen] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<OperatorMessage[]>([
    {
      role: "operator",
      text: "Я EPIC💀CLAW AI Operator — самостоятельная AI-сущность внутри EPIC💀GRAM. Могу обсудить цель, предложить лучший первый шаг, проанализировать Telegram-контекст и выполнить действие только после твоего подтверждения.",
    },
  ]);
  const [cursorStep, setCursorStep] = useState<CursorStep>("idle");
  const [position, setPosition] = useState({ x: 24, y: 86 });
  const [context, setContext] = useState<TelegramContext>({
    accountId: "main",
    accountName: "Telegram",
    chatId: "",
    chatTitle: "Чат не выбран",
    messages: [],
    ready: false,
  });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const pendingIndex = useMemo(() => messages.findIndex((message) => message.pending), [messages]);

  useEffect(() => {
    setPosition({ x: Math.max(24, window.innerWidth - 510), y: 86 });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || maximized) return;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 220, drag.px + event.clientX - drag.x)),
        y: Math.max(0, Math.min(window.innerHeight - 120, drag.py + event.clientY - drag.y)),
      });
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [maximized]);

  useEffect(() => {
    let cancelled = false;

    async function syncContext() {
      try {
        const statusResponse = await fetch("/api/telegram/status", { cache: "no-store" });
        const status = await statusResponse.json();
        const accountId = status?.activeAccountId || status?.account?.slotId || "main";
        const accountName = status?.account?.displayName || status?.accounts?.find((item: any) => item.active)?.displayName || "Telegram";
        const ready = status?.runtime === "ready" || status?.authorizationState === "authorizationStateReady";
        const chatsResponse = await fetch(`/api/telegram/chats?accountId=${encodeURIComponent(accountId)}`, { cache: "no-store" });
        const chatsData = await chatsResponse.json();
        const chats: TelegramChat[] = Array.isArray(chatsData?.chats) ? chatsData.chats : [];
        const activeChat = findVisibleChatTitle(chats) || chats[0];

        let contextMessages: Array<{ content: string; isOutgoing: boolean }> = [];
        if (activeChat?.id) {
          const messagesResponse = await fetch(`/api/telegram/messages?accountId=${encodeURIComponent(accountId)}&chatId=${encodeURIComponent(activeChat.id)}`, { cache: "no-store" });
          const messagesData = await messagesResponse.json();
          contextMessages = (Array.isArray(messagesData?.messages) ? messagesData.messages : [])
            .slice(-30)
            .map((item: any) => ({
              content: String(item?.content ?? item?.text ?? item?.message ?? "").trim(),
              isOutgoing: Boolean(item?.isOutgoing ?? item?.outgoing ?? item?.is_outgoing),
            }))
            .filter((item: { content: string }) => item.content.length > 0);
        }

        if (!cancelled) {
          setContext({
            accountId,
            accountName,
            chatId: activeChat?.id ? String(activeChat.id) : "",
            chatTitle: activeChat?.title || "Чат не выбран",
            messages: contextMessages,
            ready,
          });
        }
      } catch {
        if (!cancelled) setContext((current) => ({ ...current, ready: false }));
      }
    }

    void syncContext();
    const timer = window.setInterval(() => void syncContext(), 3500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  async function animatePlan(intent: Intent) {
    const sequence: CursorStep[] = intent === "conversation"
      ? ["read", "compose"]
      : intent === "planning"
        ? ["read", "compose"]
        : ["search", "chat", "read", "compose"];
    for (const step of sequence) {
      setCursorStep(step);
      await new Promise((resolve) => window.setTimeout(resolve, 420));
    }
  }

  function localEntityReply(command: string, intent: Intent) {
    const chatLine = context.chatId
      ? `Сейчас активен чат «${context.chatTitle}», в контексте ${context.messages.length} сообщений.`
      : "Активный чат пока не определён — могу начать с выбора нужного диалога.";

    if (GREETING_RE.test(command)) {
      return `Привет. Я подключён к аккаунту ${context.accountName}. ${chatLine}\n\nПредлагаю начать с одного из вариантов:\n— разобрать последние сообщения;\n— найти важные непрочитанные;\n— подготовить ответ или пост;\n— сформировать план работы;\n— выполнить конкретное действие в Telegram.\n\nЧто сейчас приоритетнее?`;
    }

    if (intent === "planning") {
      return `${chatLine}\n\nЛучший порядок работы:\n1. Уточнить конечный результат.\n2. Проверить релевантный Telegram-контекст.\n3. Подготовить безопасный план и черновики.\n4. Показать действия, требующие подтверждения.\n5. Выполнить разрешённые шаги и зафиксировать результат.\n\nОпиши цель одним предложением — я предложу конкретный первый шаг.`;
    }

    return "";
  }

  async function sendCommand() {
    const command = text.trim();
    if (!command || busy) return;
    const intent = classifyIntent(command);
    setText("");
    setMessages((current) => [...current, { role: "user", text: command }]);
    setBusy(true);
    await animatePlan(intent);

    const localReply = localEntityReply(command, intent);
    if (localReply) {
      setCursorStep("idle");
      setMessages((current) => [...current, { role: "operator", text: localReply }]);
      setBusy(false);
      return;
    }

    try {
      const response = await fetch("/api/operator/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: command,
          command,
          intent,
          conversationMode: intent !== "action",
          accountId: context.accountId,
          chatId: context.chatId,
          conversationId: context.chatId || "epicgram-operator",
          chatTitle: context.chatTitle,
          history: context.messages,
          tgContext: {
            accountId: context.accountId,
            chatId: context.chatId,
            chatTitle: context.chatTitle,
            messages: context.messages,
          },
          operatorProfile: {
            name: "EPICSTAR AI OPERATOR",
            behavior: "analyze-plan-clarify-execute",
            manualApprovalOnly: true,
          },
        }),
      });
      const data = await response.json().catch(() => null);

      if (intent === "action" && data?.kind === "pending" && data?.action) {
        setCursorStep("approve");
        setMessages((current) => [...current, {
          role: "operator",
          text: data.reply || "Я понял задачу и подготовил действие. Проверь параметры перед выполнением.",
          pending: {
            ...data.action,
            accountId: data.action.accountId || context.accountId,
            chatId: data.action.chatId || context.chatId,
            chatTitle: data.action.chatTitle || context.chatTitle,
          },
        }]);
      } else if (intent === "action" && data?.ok && (data?.text || data?.draft)) {
        const proposal = String(data.draft || data.text).trim();
        setCursorStep("approve");
        setMessages((current) => [...current, {
          role: "operator",
          text: "Я подготовил действие. Оно не будет выполнено без Allow.",
          pending: data.action || {
            tool: "tg_send",
            actionType: "send_message",
            accountId: context.accountId,
            chatId: context.chatId,
            chatTitle: context.chatTitle,
            text: proposal,
          },
        }]);
      } else {
        setCursorStep("idle");
        const answer = String(data?.reply || data?.text || data?.draft || data?.error || "").trim();
        setMessages((current) => [...current, {
          role: "operator",
          text: answer || `Я понял запрос как «${intent}». Уточни желаемый результат — после этого предложу лучший следующий шаг.`,
        }]);
      }
    } catch {
      setCursorStep("idle");
      setMessages((current) => [...current, {
        role: "operator",
        text: `Runtime временно недоступен. Но контекст сохранён: аккаунт ${context.accountName}, чат «${context.chatTitle}». Можем продолжить планирование без выполнения действий.`,
      }]);
    } finally {
      setBusy(false);
    }
  }

  async function allow(index: number, action: PendingAction) {
    setBusy(true);
    setCursorStep("compose");
    try {
      const effectiveAction = {
        ...action,
        accountId: action.accountId || context.accountId,
        chatId: action.chatId || context.chatId,
        chatTitle: action.chatTitle || context.chatTitle,
      };
      let response: Response;
      if (effectiveAction.tool === "tg_send" && effectiveAction.chatId && effectiveAction.text) {
        response = await fetch("/api/telegram/send", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            accountId: effectiveAction.accountId,
            chatId: effectiveAction.chatId,
            text: effectiveAction.text,
            operatorApproved: true,
          }),
        });
      } else {
        response = await fetch("/api/operator/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: effectiveAction }),
        });
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
      setCursorStep("done");
      setMessages((current) => current
        .map((message, messageIndex) => messageIndex === index ? { ...message, pending: null } : message)
        .concat({ role: "operator", text: `✅ Действие выполнено${data?.messageId ? ` · messageId ${data.messageId}` : ""}` }));
      window.setTimeout(() => setCursorStep("idle"), 1400);
    } catch (error) {
      setCursorStep("approve");
      setMessages((current) => [...current, { role: "operator", text: `⚠ ${error instanceof Error ? error.message : "Действие не выполнено"}` }]);
    } finally {
      setBusy(false);
    }
  }

  function deny(index: number) {
    setMessages((current) => current
      .map((message, messageIndex) => messageIndex === index ? { ...message, pending: null } : message)
      .concat({ role: "operator", text: "Действие отклонено. Ничего в Telegram не отправлено." }));
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

      {cursorStep !== "idle" && <div className="pointer-events-none fixed inset-0 z-[60] bg-cyan-400/[0.015] ring-2 ring-inset ring-cyan-300/20" />}

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
                <div className="text-[10px] uppercase tracking-[.18em] text-cyan-200/60">conversation · analysis · planning · action</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMaximized((value) => !value)} className="rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white" title={maximized ? "Восстановить" : "Развернуть"}>{maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-white/55 hover:bg-white/10 hover:text-white" title="Свернуть"><X className="h-4 w-4" /></button>
            </div>
          </header>

          <div className="border-b border-white/10 px-4 py-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-white/70">{context.accountName} · {context.chatTitle}</span>
              <span className={`shrink-0 rounded-full px-2 py-1 ${context.ready ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}>{context.ready ? "TDLib ready" : "нет связи"}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-white/35">
              <span>Контекст: {context.messages.length} сообщений</span>
              <span>{cursor.label}</span>
            </div>
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className={`max-w-[90%] rounded-2xl border px-3 py-2 text-sm leading-6 ${message.role === "user" ? "ml-auto border-cyan-300/20 bg-cyan-400/10" : "border-white/10 bg-white/[0.045]"}`}>
                <div className="whitespace-pre-wrap">{message.text}</div>
                {message.pending && (
                  <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3 text-xs">
                    <div><span className="text-white/45">Действие:</span> {message.pending.actionType || message.pending.tool || "Telegram action"}</div>
                    <div><span className="text-white/45">Чат:</span> {message.pending.chatTitle || context.chatTitle}</div>
                    {message.pending.text && <div className="mt-1 whitespace-pre-wrap"><span className="text-white/45">Текст:</span> {message.pending.text}</div>}
                    <div className="mt-3 flex gap-2">
                      <button disabled={busy} onClick={() => allow(index, message.pending as PendingAction)} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 font-bold text-[#06150e] disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Allow</button>
                      <button disabled={busy} onClick={() => deny(index)} className="rounded-lg bg-rose-500/90 px-3 py-2 font-bold text-white disabled:opacity-50">Deny</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-sm text-cyan-200/70"><Loader2 className="h-4 w-4 animate-spin" /> AI Operator думает и проверяет контекст…</div>}
          </div>

          <footer className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
              <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendCommand(); } }} rows={2} placeholder="Поговори со мной или поставь задачу…" className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-white/30" />
              <button disabled={busy || !text.trim()} onClick={() => void sendCommand()} className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 to-fuchsia-400 text-[#071022] disabled:opacity-40"><Send className="h-4 w-4" /></button>
            </div>
            {pendingIndex >= 0 && <div className="mt-2 text-center text-[10px] uppercase tracking-[.16em] text-amber-200/60">Ожидается подтверждение действия</div>}
          </footer>
        </section>
      )}
    </>
  );
}

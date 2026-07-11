// GLOBAL AI OPERATOR SIDEBAR — real AI chat assistant for the EPICGRAM workspace.
// Advisory-only: never sends Telegram messages, never exposes secrets.
// Streams responses from /api/operator/chat (OpenAI via Replit AI proxy).

import { useEffect, useRef, useState, useCallback } from "react";
import { apiUrl } from "@/lib/api";

// ── types ────────────────────────────────────────────────────────────────────
type Role = "user" | "assistant" | "system";
interface Msg { role: Role; content: string; id: string; streaming?: boolean }
type WinState = { x: number; y: number; w: number; h: number; minimized: boolean; maximized: boolean };

// ── persistence helpers ───────────────────────────────────────────────────────
const CHAT_KEY = "epicgram.operator.chat.v2";
const WIN_KEY  = "epicgram.operator.win.v2";
const OPEN_KEY = "epicgram.operator.open.v2";
const DEFAULT_WIN: WinState = { x: -1, y: 16, w: 360, h: 620, minimized: false, maximized: false };

function load<T>(k: string, def: T): T {
  try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? def : v; } catch { return def; }
}
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
let msgCounter = 0;
const uid = () => `m${Date.now()}_${++msgCounter}`;

// ── action tag parser ─────────────────────────────────────────────────────────
function extractAction(text: string): { clean: string; action: { kind: string; target?: string; query?: string } | null } {
  const m = text.match(/<action>(.+?)<\/action>/s);
  if (!m) return { clean: text, action: null };
  try {
    const action = JSON.parse(m[1]);
    return { clean: text.replace(/<action>.+?<\/action>/s, "").trimEnd(), action };
  } catch { return { clean: text, action: null }; }
}

function dispatchNavigate(action: { kind: string; target?: string; query?: string }) {
  if (action.kind === "navigate" && action.target) {
    window.location.hash = "#" + action.target;
    window.dispatchEvent(new CustomEvent("deepinside:navigate", { detail: action.target }));
  } else if (action.kind === "open_chat" && action.query) {
    window.dispatchEvent(new CustomEvent("deepinside:operator-command", {
      detail: { reqId: "opcmd_" + Date.now(), intent: "open_chat_by_name", query: action.query }
    }));
  }
}

// ── quick suggestion chips shown before first message ─────────────────────────
const SUGGESTIONS = [
  "Покажи список чатов",
  "Открой личные сообщения",
  "Как добавить аккаунт?",
  "Какой статус Telegram?",
];

// ─────────────────────────────────────────────────────────────────────────────
export function GlobalAIOperatorSidebar() {
  const [mounted, setMounted]       = useState(false);
  const [open, setOpen]             = useState(true);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [tgReady, setTgReady]       = useState<boolean | null>(null);
  const [win, setWin]               = useState<WinState>(DEFAULT_WIN);
  const [accountCount, setAccountCount] = useState<number>(0);
  const [activeAccount, setActiveAccount] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const dragRef   = useRef<{ mode: "move" | "resize"; sx: number; sy: number; win: WinState } | null>(null);
  const abortRef  = useRef<AbortController | null>(null);

  // ── init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const isMobile = window.innerWidth < 768;
    setOpen(load(OPEN_KEY, !isMobile));
    setMessages(load<Msg[]>(CHAT_KEY, []));
    const saved = load<WinState>(WIN_KEY, DEFAULT_WIN);
    const x = saved.x >= 0 ? saved.x : Math.max(16, window.innerWidth - DEFAULT_WIN.w - 16);
    setWin({ ...saved, x });

    // fetch Telegram status once
    fetch(apiUrl("/telegram/status"), { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!j) { setTgReady(false); return; }
        setTgReady(!(j.ready === false || j.tdlibReady === false || j.systemState === "OFFLINE"));
        const slots: any[] = j.slots ?? [];
        setAccountCount(slots.length);
        const active = slots.find((s: any) => s.active || s.selected);
        if (active) setActiveAccount(active.phone ?? active.alias ?? active.accountId ?? "");
      })
      .catch(() => setTgReady(false));
  }, []);

  // ── auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── persist chat ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mounted) save(CHAT_KEY, messages.filter(m => !m.streaming).slice(-60));
  }, [messages, mounted]);

  // ── window drag / resize ────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
      if (d.mode === "move") {
        setWin(p => ({ ...p,
          x: Math.min(Math.max(0, d.win.x + dx), window.innerWidth - 120),
          y: Math.min(Math.max(0, d.win.y + dy), window.innerHeight - 40),
        }));
      } else {
        setWin(p => ({ ...p,
          w: Math.min(Math.max(300, d.win.w + dx), window.innerWidth - 20),
          h: Math.min(Math.max(280, d.win.h + dy), window.innerHeight - 20),
        }));
      }
    };
    const onUp = () => { if (dragRef.current) { save(WIN_KEY, win); dragRef.current = null; } };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [win]);

  const startDrag = (mode: "move" | "resize") => (e: React.MouseEvent) => {
    e.preventDefault();
    if (win.maximized) {
      const next = { ...win, x: window.innerWidth - 420 - 12, y: 12, w: 420, h: window.innerHeight - 24, maximized: false };
      setWin(next); save(WIN_KEY, next);
      dragRef.current = { mode, sx: e.clientX, sy: e.clientY, win: next };
    } else {
      dragRef.current = { mode, sx: e.clientX, sy: e.clientY, win };
    }
  };

  const persistWin = (patch: Partial<WinState>) =>
    setWin(p => { const next = { ...p, ...patch }; save(WIN_KEY, next); return next; });
  const toggleOpen = () => { const v = !open; setOpen(v); save(OPEN_KEY, v); };
  const closeWin   = () => { setOpen(false); save(OPEN_KEY, false); };

  // ── send message ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: trimmed, id: uid() };
    const assistantId = uid();
    const assistantMsg: Msg = { role: "assistant", content: "", id: assistantId, streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    // build history for API (exclude currently streaming placeholder)
    const history = [...messages.filter(m => !m.streaming), userMsg]
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(apiUrl("/operator/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          messages: history,
          context: {
            tgReady,
            accountCount,
            activeAccount: activeAccount || undefined,
            currentSection: window.location.hash.replace("#", "") || window.location.pathname,
          },
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.content) {
              fullText += payload.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: fullText, streaming: true } : m
              ));
            }
            if (payload.done) {
              const { clean, action } = extractAction(fullText);
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: clean, streaming: false } : m
              ));
              if (action) dispatchNavigate(action);
            }
            if (payload.error) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: `⚠️ ${payload.error}`, streaming: false } : m
              ));
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: "⚠️ Не удалось получить ответ. Проверь подключение.", streaming: false } : m
        ));
      }
    } finally {
      setLoading(false);
    }
  }, [loading, messages, tgReady, accountCount, activeAccount]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const clearChat = () => { setMessages([]); save(CHAT_KEY, []); };

  if (!mounted) return null;

  // ── collapsed button ─────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={toggleOpen}
        aria-label="AI Оператор"
        style={{ background: "linear-gradient(135deg,rgba(14,165,233,.85),rgba(168,85,247,.75))" }}
        className="fixed bottom-4 right-4 z-[130] flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white shadow-xl backdrop-blur hover:brightness-110 transition-all"
      >
        <span className="text-base">✦</span> AI Оператор
        {tgReady === false && <span className="h-2 w-2 rounded-full bg-red-400" />}
      </button>
    );
  }

  const winStyle: React.CSSProperties = win.maximized
    ? { right: 12, top: 12, bottom: 12, width: 400 }
    : { left: win.x, top: win.y, width: win.w, height: win.minimized ? "auto" : win.h };

  const tgDot = tgReady === true ? "#4ade80" : tgReady === false ? "#f87171" : "#9ca3af";

  return (
    <div
      className="fixed z-[130] flex flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      style={{ ...winStyle, background: "linear-gradient(160deg,#0a0a16 0%,#0e0e1f 100%)" }}
    >
      {/* ── title bar ── */}
      <div
        onMouseDown={startDrag("move")}
        className="flex shrink-0 cursor-move select-none items-center gap-2 border-b border-white/10 px-3 py-2"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        {/* macOS traffic lights */}
        <div className="flex items-center gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); closeWin(); }}
            className="h-3 w-3 rounded-full bg-[#ff5f57] hover:brightness-125 transition-all" title="Закрыть" />
          <button onClick={(e) => { e.stopPropagation(); persistWin({ minimized: !win.minimized, maximized: false }); }}
            className="h-3 w-3 rounded-full bg-[#febc2e] hover:brightness-125 transition-all" title="Свернуть" />
          <button onClick={(e) => { e.stopPropagation(); persistWin({ maximized: !win.maximized, minimized: false }); }}
            className="h-3 w-3 rounded-full bg-[#28c840] hover:brightness-125 transition-all" title="Развернуть" />
        </div>
        {/* title */}
        <span className="mx-auto flex items-center gap-1.5 text-[12px] font-semibold text-white/80">
          <span className="text-sm">✦</span> AI Оператор
        </span>
        {/* TG status dot */}
        <span title={tgReady === true ? "Telegram готов" : tgReady === false ? "Telegram не готов" : "Статус неизвестен"}
          className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: tgDot }} />
        {/* clear */}
        <button onClick={clearChat} title="Очистить чат"
          className="rounded px-1.5 py-0.5 text-[10px] text-white/30 hover:text-white/60 hover:bg-white/10 transition-all">
          ✕ очистить
        </button>
      </div>

      {/* ── minimized: show only title bar ── */}
      {win.minimized ? null : (
        <>
          {/* ── messages area ── */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">

            {/* empty state with suggestions */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                  style={{ background: "linear-gradient(135deg,rgba(14,165,233,.3),rgba(168,85,247,.25))", border: "1px solid rgba(255,255,255,0.1)" }}>
                  ✦
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-semibold text-white/80">AI Оператор</p>
                  <p className="mt-1 text-[11px] text-white/40">Спроси что угодно про EPICGRAM</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 px-2">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white/90 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* message bubbles */}
            {messages.map(msg => (
              <div key={msg.id}
                className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {/* avatar */}
                {msg.role === "assistant" && (
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]"
                    style={{ background: "linear-gradient(135deg,rgba(14,165,233,.4),rgba(168,85,247,.35))", border: "1px solid rgba(255,255,255,0.1)" }}>
                    ✦
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-[12.5px] leading-[1.55] ${
                  msg.role === "user"
                    ? "rounded-tr-sm bg-sky-500/20 text-white/90"
                    : "rounded-tl-sm bg-white/6 text-white/85"
                }`}
                  style={msg.role === "user"
                    ? { background: "rgba(14,165,233,0.18)", border: "1px solid rgba(14,165,233,0.2)" }
                    : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <MessageContent content={msg.content} streaming={msg.streaming} />
                </div>
              </div>
            ))}
          </div>

          {/* ── input area ── */}
          <div className="shrink-0 border-t border-white/8 px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading}
                placeholder="Сообщение… (Enter — отправить, Shift+Enter — новая строка)"
                rows={1}
                className="min-h-[36px] max-h-[120px] flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12.5px] text-white/90 placeholder-white/25 outline-none transition-all focus:border-sky-500/50 focus:bg-white/8 disabled:opacity-50"
                style={{ lineHeight: "1.5", fieldSizing: "content" } as any}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/80 transition-all disabled:opacity-30 hover:text-white"
                style={{ background: loading || !input.trim() ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,rgba(14,165,233,.7),rgba(168,85,247,.6))" }}
                aria-label="Отправить"
              >
                {loading
                  ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                  : <SendIcon />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[9px] text-white/20">MANUAL_ONLY · Advisory · Отправка только с подтверждением</p>
          </div>

          {/* ── resize handle ── */}
          {!win.maximized && (
            <div
              onMouseDown={startDrag("resize")}
              className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
              style={{ background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.15) 50%)" }}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function MessageContent({ content, streaming }: { content: string; streaming?: boolean }) {
  if (!content && streaming) {
    return <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-white/20" />;
  }
  // Basic markdown: **bold**, `code`, newlines
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`|\n)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold text-white/95">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="rounded bg-white/10 px-1 font-mono text-[11px] text-sky-300">{part.slice(1, -1)}</code>;
        if (part === "\n") return <br key={i} />;
        return <span key={i}>{part}</span>;
      })}
      {streaming && <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-sky-400/70 align-middle" />}
    </span>
  );
}

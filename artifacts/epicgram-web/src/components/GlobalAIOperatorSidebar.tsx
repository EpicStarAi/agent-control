// GLOBAL AI OPERATOR SIDEBAR — real AI chat assistant for the EPICGRAM workspace.
// Advisory-only: never sends Telegram messages, never exposes secrets.
// Streams responses from /api/operator/chat (OpenAI via Replit AI proxy).

import { useEffect, useRef, useState, useCallback } from "react";
import { apiUrl } from "@/lib/api";
import { emitGlowState } from "@/hooks/useAIGlowSettings";

// ── types ────────────────────────────────────────────────────────────────────
type Role = "user" | "assistant" | "system" | "tool_call";
type ActionStatus = "executing" | "completed" | "error";
interface ApprovalCard { type: string; tool: string; payload: Record<string, any>; warning: string }
interface InlineImage { dataUrl: string; prompt: string }
interface Msg { role: Role; content: string; id: string; streaming?: boolean; toolName?: string; approvalCards?: ApprovalCard[]; status?: ActionStatus; images?: InlineImage[] }
type WinState = { x: number; y: number; w: number; h: number; minimized: boolean; maximized: boolean };
interface Attachment { name: string; type: string; dataUrl: string; size: number }
interface OperatorSettings { model: string; temperature: number; customSystemPrompt: string }
interface PendingApproval { id: string; text: string; attachments: Attachment[] }

// ── persistence helpers ───────────────────────────────────────────────────────
const CHAT_KEY     = "epicgram.operator.chat.v2";
const WIN_KEY      = "epicgram.operator.win.v2";
const OPEN_KEY     = "epicgram.operator.open.v2";
const SETTINGS_KEY = "epicgram.operator.settings.v1";
const DEFAULT_WIN: WinState = { x: -1, y: 16, w: 360, h: 620, minimized: false, maximized: false };
const DEFAULT_SETTINGS: OperatorSettings = { model: "gpt-4o-mini", temperature: 0.7, customSystemPrompt: "" };

function load<T>(k: string, def: T): T {
  try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? def : v; } catch { return def; }
}
function save(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
let msgCounter = 0;
const uid = () => `m${Date.now()}_${++msgCounter}`;

// ── intent classifier ─────────────────────────────────────────────────────────
function classifyIntent(text: string): "question" | "action" {
  const t = text.toLowerCase().trim();
  if (t.includes("?")) return "question";
  const questionStarts = [
    "что ", "как ", "почему ", "какой ", "какая ", "какие ", "какое ",
    "зачем ", "где ", "кто ", "чем ", "когда ", "объясни ", "расскажи мне",
    "сколько ", "есть ли ", "можно ли ", "правда ли ",
  ];
  if (questionStarts.some(q => t.startsWith(q))) return "question";
  return "action";
}

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

// ── tool call human-readable labels ──────────────────────────────────────────
const TOOL_LABELS: Record<string, string> = {
  get_status:                 "🔍 Получаю статус Telegram…",
  list_accounts:              "👤 Загружаю список аккаунтов…",
  list_chats:                 "💬 Загружаю чаты…",
  get_chat_history:           "📜 Читаю историю чата…",
  get_audit_log:              "📋 Читаю audit log…",
  search_chats:               "🔍 Ищу чаты…",
  get_workspace_stats:        "📊 Собираю статистику…",
  find_unanswered_messages:   "📬 Ищу неотвеченные сообщения…",
  analyse_chat:               "🔎 Анализирую переписку…",
  extract_tasks:              "📋 Извлекаю задачи из чата…",
  get_daily_summary:          "📅 Собираю ежедневный дайджест…",
  generate_image:             "🎨 Генерирую изображение…",
  propose_send_message:       "📨 Формирую запрос на отправку…",
  propose_forward_message:    "↩️ Формирую запрос на пересылку…",
  propose_set_reaction:       "😊 Формирую запрос на реакцию…",
  propose_pin_message:        "📌 Формирую запрос на закрепление…",
  propose_edit_message:       "✏️ Формирую запрос на редактирование…",
  propose_delete_message:     "🗑️ Формирую запрос на удаление…",
  propose_create_chat:        "🆕 Готовлю создание чата…",
  start_bot_setup:            "🤖 Запускаю мастер создания бота…",
  register_bot_token:         "🔑 Регистрирую бота…",
};

// ── quick suggestion chips shown before first message ─────────────────────────
const SUGGESTIONS = [
  "Покажи список чатов",
  "Открой личные сообщения",
  "Как добавить аккаунт?",
  "Какой статус Telegram?",
];

// ── available models ──────────────────────────────────────────────────────────
const MODELS = [
  { value: "gpt-4o-mini",  label: "GPT-4o Mini  · Быстрый" },
  { value: "gpt-4o",       label: "GPT-4o  · Умный" },
  { value: "gpt-4-turbo",  label: "GPT-4 Turbo  · Мощный" },
  { value: "gpt-4.1",      label: "GPT-4.1  · Новейший" },
];

// ── file size formatter ───────────────────────────────────────────────────────
function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

// ─────────────────────────────────────────────────────────────────────────────
export function GlobalAIOperatorSidebar() {
  const [mounted, setMounted]           = useState(false);
  const [open, setOpen]                 = useState(true);
  const [messages, setMessages]         = useState<Msg[]>([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [tgReady, setTgReady]           = useState<boolean | null>(null);
  const [win, setWin]                   = useState<WinState>(DEFAULT_WIN);
  const [accountCount, setAccountCount] = useState<number>(0);
  const [activeAccount, setActiveAccount] = useState<string>("");
  const [activeAccountId, setActiveAccountId] = useState<string>(""); // slotId for tool calls

  // new state
  const [settings, setSettings]         = useState<OperatorSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [attachments, setAttachments]   = useState<Attachment[]>([]);
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
  const [cardStates, setCardStates]     = useState<Record<string, "idle" | "executing" | "done" | "error">>({});
  const [cardErrors, setCardErrors]     = useState<Record<string, string>>({});

  const scrollRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef     = useRef<{ mode: "move" | "resize"; sx: number; sy: number; win: WinState } | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // ── init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const isMobile = window.innerWidth < 768;
    setOpen(load(OPEN_KEY, !isMobile));
    setMessages(load<Msg[]>(CHAT_KEY, []));
    setSettings(load<OperatorSettings>(SETTINGS_KEY, DEFAULT_SETTINGS));
    const saved = load<WinState>(WIN_KEY, DEFAULT_WIN);
    const x = saved.x >= 0 ? saved.x : Math.max(16, window.innerWidth - DEFAULT_WIN.w - 16);
    setWin({ ...saved, x });

    fetch(apiUrl("/telegram/status"), { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!j) { setTgReady(false); return; }
        setTgReady(!(j.ready === false || j.tdlibReady === false || j.systemState === "OFFLINE"));
        const slots: any[] = j.slots ?? j.accounts ?? [];
        setAccountCount(slots.length);
        const active = slots.find((s: any) => s.active || s.selected);
        if (active) {
          setActiveAccount(active.displayName ?? active.phone ?? active.alias ?? active.label ?? active.slotId ?? "");
          setActiveAccountId(active.slotId ?? active.accountId ?? active.id ?? "");
        }
      })
      .catch(() => setTgReady(false));

    // Sync account selection from TelegramWorkspace
    const onAccChange = (e: Event) => {
      const id = (e as CustomEvent<{ accountId: string }>).detail?.accountId;
      if (id) setActiveAccountId(id);
    };
    window.addEventListener("deepinside:account-changed", onAccChange);
    return () => window.removeEventListener("deepinside:account-changed", onAccChange);
  }, []);

  // ── auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── persist chat + settings ──────────────────────────────────────────────────
  useEffect(() => {
    if (mounted) save(CHAT_KEY, messages.filter(m => !m.streaming).slice(-60));
  }, [messages, mounted]);

  useEffect(() => {
    if (mounted) save(SETTINGS_KEY, settings);
  }, [settings, mounted]);

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

  // ── file attachment handling ─────────────────────────────────────────────────
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      if (file.size > 20 * 1024 * 1024) return; // 20MB max
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          dataUrl: reader.result as string,
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (e.target) e.target.value = "";
  };

  const removeAttachment = (idx: number) =>
    setAttachments(prev => prev.filter((_, i) => i !== idx));

  // ── core send to API ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string, atts: Attachment[] = []) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Msg = { role: "user", content: trimmed, id: uid() };
    const assistantId = uid();
    const assistantMsg: Msg = { role: "assistant", content: "", id: assistantId, streaming: true };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setLoading(true);
    setAttachments([]);
    emitGlowState("thinking");

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
          conversationId: "ai_operator_main",
          context: {
            tgReady,
            accountCount,
            activeAccount: activeAccount || undefined,
            activeAccountId: activeAccountId || undefined,
            currentSection: window.location.hash.replace("#", "") || window.location.pathname,
          },
          settings: {
            model: settings.model,
            temperature: settings.temperature,
            customSystemPrompt: settings.customSystemPrompt || undefined,
          },
          attachments: atts.length > 0 ? atts : undefined,
        }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      const pendingToolMsgIds: string[] = [];

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

            if (payload.toolCall) {
              const toolId = uid();
              pendingToolMsgIds.push(toolId);
              const label = TOOL_LABELS[payload.toolCall.name] ?? payload.toolCall.name;
              setMessages(prev => [...prev, {
                role: "tool_call", content: label, id: toolId, streaming: true,
                toolName: payload.toolCall.name,
              }]);
              emitGlowState("tool_call");
            }

            if (payload.status) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, status: payload.status as ActionStatus } : m
              ));
            }

            if (payload.image) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, images: [...(m.images ?? []), payload.image as InlineImage] }
                  : m
              ));
            }

            if (payload.content) {
              fullText += payload.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: fullText, streaming: true } : m
              ));
            }
            if (payload.done) {
              setMessages(prev => prev.map(m =>
                pendingToolMsgIds.includes(m.id) ? { ...m, streaming: false } : m
              ));
              const { clean, action } = extractAction(fullText);
              const cards: any[] = payload.approvalCards ?? [];
              setMessages(prev => prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: clean, streaming: false, approvalCards: cards }
                  : m
              ));
              if (action) {
                emitGlowState("tool_call");
                dispatchNavigate(action);
                setTimeout(() => emitGlowState("success"), 400);
              } else if (cards.length > 0) {
                emitGlowState("approval_required");
              } else {
                emitGlowState("success");
              }
            }
            if (payload.error) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: `⚠️ ${payload.error}`, streaming: false, status: "error" } : m
              ));
              emitGlowState("error");
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: "⚠️ Не удалось получить ответ. Проверь подключение.", streaming: false } : m
        ));
        emitGlowState("error");
      } else {
        emitGlowState("idle");
      }
    } finally {
      setLoading(false);
    }
  }, [loading, messages, tgReady, accountCount, activeAccount, settings]);

  // ── handle send with intent classification ───────────────────────────────────
  const handleSend = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");

    const intent = classifyIntent(trimmed);
    if (intent === "question") {
      // Question: send directly without approval gate
      sendMessage(trimmed, attachments);
    } else {
      // Action: gate behind APPROVE / NOT APPROVE
      const pendingId = uid();
      setPendingApproval({ id: pendingId, text: trimmed, attachments: [...attachments] });
      setAttachments([]);
    }
  }, [loading, sendMessage, attachments]);

  const handleApprove = useCallback(() => {
    if (!pendingApproval) return;
    const { text, attachments: atts } = pendingApproval;
    setPendingApproval(null);
    sendMessage(text, atts);
  }, [pendingApproval, sendMessage]);

  const handleReject = useCallback(() => {
    setPendingApproval(null);
  }, []);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); }
  };

  // ── Ctrl+V / paste handler ───────────────────────────────────────────────────
  // Images (screenshots) → attachment; large text (>1500 chars) → .txt attachment
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);

    // 1. Image in clipboard (screenshot, copied image)
    const imgItem = items.find(it => it.type.startsWith("image/"));
    if (imgItem) {
      e.preventDefault();
      const file = imgItem.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: `screenshot-${Date.now()}.png`,
          type: file.type || "image/png",
          dataUrl: reader.result as string,
          size: file.size,
        }]);
      };
      reader.readAsDataURL(file);
      return;
    }

    // 2. Large text → convert to .txt file attachment
    const text = e.clipboardData.getData("text/plain");
    if (text.length > 1500) {
      e.preventDefault();
      const blob = new Blob([text], { type: "text/plain" });
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: `text-${Date.now()}.txt`,
          type: "text/plain",
          dataUrl: reader.result as string,
          size: blob.size,
        }]);
      };
      reader.readAsDataURL(blob);
    }
    // Short text → normal textarea paste (no interception)
  };

  const clearChat = () => { setMessages([]); save(CHAT_KEY, []); };

  // ── approval card execution ──────────────────────────────────────────────────
  const executeApprovalCard = useCallback(async (cardKey: string, card: ApprovalCard) => {
    setCardStates(prev => ({ ...prev, [cardKey]: "executing" }));
    try {
      const routeMap: Record<string, string> = {
        forward_message: "/telegram/forward",
        set_reaction:    "/telegram/react",
        pin_message:     "/telegram/pin",
        edit_message:    "/telegram/edit",
        delete_message:  "/telegram/delete",
        create_chat:     "/telegram/create-chat",
      };
      const route = routeMap[card.tool];
      if (!route) throw new Error(`Unknown action type: ${card.tool}`);
      const res = await fetch(apiUrl(route), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card.payload),
      });
      const data = await res.json() as any;
      if (!res.ok || data.ok === false) throw new Error(data.message || `HTTP ${res.status}`);
      setCardStates(prev => ({ ...prev, [cardKey]: "done" }));
    } catch (err: any) {
      setCardStates(prev => ({ ...prev, [cardKey]: "error" }));
      setCardErrors(prev => ({ ...prev, [cardKey]: err.message ?? "Ошибка выполнения" }));
    }
  }, []);

  if (!mounted) return null;

  // ── collapsed button ─────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={toggleOpen}
        aria-label="AI Оператор"
        style={{ background: "linear-gradient(135deg,rgba(14,165,233,.85),rgba(168,85,247,.75))", bottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}
        className="fixed right-4 z-[130] flex items-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-sm font-semibold text-white shadow-xl backdrop-blur hover:brightness-110 transition-all"
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
        {/* settings gear */}
        <button
          onClick={(e) => { e.stopPropagation(); setSettingsOpen(v => !v); }}
          title="Настройки"
          className={`rounded px-1 py-0.5 text-[12px] transition-all hover:text-white/80 ${settingsOpen ? "text-sky-400" : "text-white/30"}`}
        >
          ⚙
        </button>
        {/* clear */}
        <button onClick={clearChat} title="Очистить чат"
          className="rounded px-1.5 py-0.5 text-[10px] text-white/30 hover:text-white/60 hover:bg-white/10 transition-all">
          ✕
        </button>
      </div>

      {/* ── minimized: show only title bar ── */}
      {win.minimized ? null : (
        <>
          {/* ── settings panel ── */}
          {settingsOpen && (
            <div className="shrink-0 border-b border-white/10 px-4 py-3 space-y-3 overflow-y-auto"
              style={{ background: "rgba(0,0,0,0.25)", maxHeight: "55%" }}>
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">Настройки AI</p>

              {/* Model */}
              <div className="space-y-1">
                <label className="text-[10px] text-white/40">Модель</label>
                <select
                  value={settings.model}
                  onChange={e => setSettings(s => ({ ...s, model: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/80 outline-none focus:border-sky-500/50"
                >
                  {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {/* Temperature */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-white/40">Температура (креативность)</label>
                  <span className="text-[10px] font-mono text-sky-400">{settings.temperature.toFixed(1)}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={settings.temperature}
                  onChange={e => setSettings(s => ({ ...s, temperature: parseFloat(e.target.value) }))}
                  className="w-full accent-sky-500"
                />
                <div className="flex justify-between text-[9px] text-white/20">
                  <span>Точный</span><span>Сбалансированный</span><span>Творческий</span>
                </div>
              </div>

              {/* System prompt */}
              <div className="space-y-1">
                <label className="text-[10px] text-white/40">Дополнительный системный промпт</label>
                <textarea
                  value={settings.customSystemPrompt}
                  onChange={e => setSettings(s => ({ ...s, customSystemPrompt: e.target.value }))}
                  placeholder="Например: Отвечай максимально кратко. Используй только факты из инструментов."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/80 placeholder-white/20 outline-none focus:border-sky-500/50"
                />
              </div>

              {/* Reset */}
              <button
                onClick={() => setSettings(DEFAULT_SETTINGS)}
                className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
              >
                ↺ Сбросить по умолчанию
              </button>
            </div>
          )}

          {/* ── messages area ── */}
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3">

            {/* empty state with suggestions */}
            {messages.length === 0 && !pendingApproval && (
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
                    <button key={s} onClick={() => handleSend(s)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/60 hover:bg-white/10 hover:text-white/90 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* message bubbles */}
            {messages.map(msg => {
              if (msg.role === "tool_call") return (
                <div key={msg.id} className="flex items-center gap-1.5 px-1">
                  {msg.streaming
                    ? <span className="h-3 w-3 animate-spin rounded-full border border-sky-500/40 border-t-sky-400" />
                    : <span className="text-[10px] text-emerald-400">✓</span>}
                  <span className="text-[10px] text-white/35 italic">{msg.content}</span>
                </div>
              );

              return (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {msg.role === "assistant" && (
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px]"
                      style={{ background: "linear-gradient(135deg,rgba(14,165,233,.4),rgba(168,85,247,.35))", border: "1px solid rgba(255,255,255,0.1)" }}>
                      ✦
                    </div>
                  )}
                  <div className="flex max-w-[82%] flex-col gap-2">
                    <div className={`rounded-2xl px-3 py-2 text-[12.5px] leading-[1.55] ${
                      msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                    }`}
                      style={msg.role === "user"
                        ? { background: "rgba(14,165,233,0.18)", border: "1px solid rgba(14,165,233,0.2)" }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <MessageContent content={msg.content} streaming={msg.streaming} />
                    </div>
                    {/* Inline generated images */}
                    {msg.role === "assistant" && msg.images && msg.images.length > 0 && (
                      <div className="flex flex-col gap-2 pt-0.5">
                        {msg.images.map((img, i) => (
                          <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-white/4">
                            <img
                              src={img.dataUrl}
                              alt={img.prompt}
                              className="max-h-[240px] w-full object-contain"
                              style={{ background: "rgba(0,0,0,0.3)" }}
                            />
                            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                              <p className="flex-1 truncate text-[9px] text-white/30 italic">{img.prompt.slice(0, 60)}</p>
                              <a
                                href={img.dataUrl}
                                download={`epicgram-img-${i + 1}.png`}
                                className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
                              >
                                ↓ Сохранить
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Action status chip — only shown for multi-step operations */}
                    {msg.role === "assistant" && msg.status && (
                      <div className="flex items-center gap-1.5 pl-1">
                        {msg.status === "executing" && (
                          <span className="flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-400">
                            <span className="h-2 w-2 animate-spin rounded-full border border-sky-500/30 border-t-sky-400" />
                            Выполняется…
                          </span>
                        )}
                        {msg.status === "completed" && (
                          <span className="flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                            ✓ Завершено
                          </span>
                        )}
                        {msg.status === "error" && (
                          <span className="flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">
                            ✗ Ошибка
                          </span>
                        )}
                      </div>
                    )}
                    {/* Approval cards */}
                    {msg.approvalCards?.map((card, i) => {
                      const cardKey = `${msg.id}_${i}`;
                      const cState = cardStates[cardKey] ?? "idle";
                      const cError = cardErrors[cardKey];
                      const isSendCard = card.tool === "send_message";

                      const ACTION_ICONS: Record<string, string> = {
                        send_message:    "📨",
                        forward_message: "↩️",
                        set_reaction:    "😊",
                        pin_message:     "📌",
                        edit_message:    "✏️",
                        delete_message:  "🗑️",
                        create_chat:     "🆕",
                      };
                      const ACTION_LABELS: Record<string, string> = {
                        send_message:    "Отправка сообщения",
                        forward_message: "Пересылка сообщения",
                        set_reaction:    "Добавление реакции",
                        pin_message:     "Закрепление сообщения",
                        edit_message:    "Редактирование сообщения",
                        delete_message:  "Удаление сообщений",
                        create_chat:     "Создание чата",
                      };

                      // ── create_chat card — special layout ──────────────────
                      if (card.tool === "create_chat") {
                        const typeLabel = card.payload.type === "channel" ? "Канал" : card.payload.type === "supergroup" ? "Супергруппа" : "Группа";
                        const typeBadgeColor = card.payload.type === "channel"
                          ? "bg-purple-500/15 border-purple-500/30 text-purple-300"
                          : card.payload.type === "supergroup"
                          ? "bg-sky-500/15 border-sky-500/30 text-sky-300"
                          : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300";
                        return (
                          <div key={i} className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 text-[11px]">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-[13px]">🆕</span>
                              <span className="font-semibold text-amber-400">Создание чата</span>
                              <span className={`ml-auto rounded-full border px-2 py-0.5 text-[9px] font-semibold ${typeBadgeColor}`}>
                                {typeLabel}
                              </span>
                            </div>
                            <div className="space-y-1 text-white/60">
                              <div><span className="text-white/40">Название:</span> <span className="font-medium text-white/80">{card.payload.title}</span></div>
                              {card.payload.username && (
                                <div><span className="text-white/40">Username:</span> @{card.payload.username}</div>
                              )}
                              {card.payload.description && (
                                <div><span className="text-white/40">Описание:</span> <span className="text-white/50">{String(card.payload.description).slice(0, 100)}</span></div>
                              )}
                            </div>
                            <p className="mt-2 text-[10px] text-amber-400/70">{card.warning}</p>
                            {cState === "idle" && (
                              <div className="mt-2.5 flex gap-2">
                                <button
                                  onClick={() => executeApprovalCard(cardKey, card)}
                                  className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-white transition-all hover:brightness-110"
                                  style={{ background: "linear-gradient(135deg,rgba(168,85,247,.7),rgba(14,165,233,.5))" }}
                                >
                                  ✓ Создать
                                </button>
                              </div>
                            )}
                            {cState === "executing" && (
                              <div className="mt-2.5 flex items-center gap-2 text-[10px] text-white/50">
                                <span className="h-3 w-3 animate-spin rounded-full border border-sky-500/40 border-t-sky-400" />
                                Создаётся…
                              </div>
                            )}
                            {cState === "done" && (
                              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                                <span>✓</span> {typeLabel} создан
                              </div>
                            )}
                            {cState === "error" && (
                              <div className="mt-2 space-y-1.5">
                                <div className="text-[10px] text-red-400">⚠️ Ошибка: {cError}</div>
                                <button
                                  onClick={() => executeApprovalCard(cardKey, card)}
                                  className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
                                >↺ Повторить</button>
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div key={i} className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 text-[11px]">
                          <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-amber-400">
                            <span>{ACTION_ICONS[card.tool] ?? "⚠️"}</span>
                            {ACTION_LABELS[card.tool] ?? "Требуется подтверждение"}
                          </div>
                          <div className="space-y-1 text-white/60">
                            {(card.payload.chatTitle || card.payload.toChatTitle) && (
                              <div><span className="text-white/40">Чат:</span> {card.payload.chatTitle || card.payload.toChatTitle}</div>
                            )}
                            {card.payload.emoji && (
                              <div><span className="text-white/40">Реакция:</span> <span className="text-base">{card.payload.emoji}</span></div>
                            )}
                            {card.payload.messageId && (
                              <div><span className="text-white/40">Сообщение:</span> <span className="font-mono text-[10px] text-white/40">#{card.payload.messageId}</span></div>
                            )}
                            {card.payload.messageIds && (
                              <div><span className="text-white/40">Сообщений:</span> {(card.payload.messageIds as string[]).length} шт.</div>
                            )}
                            {card.payload.text && (
                              <div><span className="text-white/40">Текст:</span>
                                <span className="ml-1 rounded bg-white/5 px-1">{card.payload.text.slice(0, 80)}{card.payload.text.length > 80 ? "…" : ""}</span>
                              </div>
                            )}
                            {card.payload.revoke === false && (
                              <div className="text-[10px] text-white/30">Только для себя</div>
                            )}
                          </div>
                          <p className="mt-2 text-[10px] text-amber-400/70">{card.warning}</p>

                          {/* send_message: use workspace button */}
                          {isSendCard && (
                            <p className="mt-1.5 text-[10px] text-white/25">Используй кнопку «Approve & Send» в рабочей области</p>
                          )}

                          {/* other write actions: inline confirm/cancel */}
                          {!isSendCard && cState === "idle" && (
                            <div className="mt-2.5 flex gap-2">
                              <button
                                onClick={() => executeApprovalCard(cardKey, card)}
                                className="flex-1 rounded-lg py-1.5 text-[11px] font-semibold text-white transition-all hover:brightness-110"
                                style={{ background: "linear-gradient(135deg,rgba(14,165,233,.7),rgba(34,197,94,.5))" }}
                              >
                                ✓ Подтвердить
                              </button>
                            </div>
                          )}
                          {!isSendCard && cState === "executing" && (
                            <div className="mt-2.5 flex items-center gap-2 text-[10px] text-white/50">
                              <span className="h-3 w-3 animate-spin rounded-full border border-sky-500/40 border-t-sky-400" />
                              Выполняется…
                            </div>
                          )}
                          {!isSendCard && cState === "done" && (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                              <span>✓</span> Выполнено
                            </div>
                          )}
                          {!isSendCard && cState === "error" && (
                            <div className="mt-2 space-y-1.5">
                              <div className="text-[10px] text-red-400">⚠️ Ошибка: {cError}</div>
                              <button
                                onClick={() => executeApprovalCard(cardKey, card)}
                                className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:text-white/80 hover:bg-white/10 transition-all"
                              >
                                ↺ Повторить
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* ── pending approval gate ── */}
            {pendingApproval && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/8 p-3 text-[11px] space-y-2.5">
                <div className="flex items-center gap-2 font-semibold text-sky-300 text-[11px]">
                  <span className="text-[13px]">⚡</span>
                  <span>Обнаружено действие</span>
                </div>
                <div className="rounded-lg bg-white/5 px-3 py-2 text-white/70 text-[12px] leading-relaxed">
                  {pendingApproval.text}
                </div>
                {pendingApproval.attachments.length > 0 && (
                  <div className="text-[10px] text-white/40">
                    + {pendingApproval.attachments.length} файл(ов)
                  </div>
                )}
                <p className="text-[10px] text-white/35">
                  Это запрос на выполнение действия. Подтверди или отклони.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleApprove}
                    className="flex-1 rounded-lg py-2 text-[11px] font-semibold text-white transition-all hover:brightness-110"
                    style={{ background: "linear-gradient(135deg,rgba(14,165,233,.7),rgba(34,197,94,.5))" }}
                  >
                    ✓ APPROVE
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 rounded-lg border border-white/10 py-2 text-[11px] font-semibold text-white/50 transition-all hover:bg-white/10 hover:text-white/80"
                  >
                    ✗ NOT APPROVE
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── input area ── */}
          <div className="shrink-0 border-t border-white/8 px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.03)" }}>

            {/* attachment previews */}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachments.map((att, idx) => (
                  <div key={idx} className="relative flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                    {att.type.startsWith("image/") ? (
                      <img src={att.dataUrl} alt={att.name}
                        className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <span className="text-[16px]">{att.type.startsWith("video/") ? "🎬" : att.type === "application/pdf" ? "📄" : "📎"}</span>
                    )}
                    <div className="max-w-[80px]">
                      <p className="truncate text-[9px] text-white/60">{att.name}</p>
                      <p className="text-[8px] text-white/30">{fmtSize(att.size)}</p>
                    </div>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="ml-0.5 text-[10px] text-white/25 hover:text-white/70"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-1.5">
              {/* paperclip */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || !!pendingApproval}
                title="Прикрепить файл"
                className="flex h-9 w-8 shrink-0 items-center justify-center rounded-xl text-white/30 transition-all hover:text-white/70 hover:bg-white/8 disabled:opacity-30"
              >
                <PaperclipIcon />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.csv,.xlsx"
                className="hidden"
                onChange={handleFilePick}
              />

              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                onPaste={handlePaste}
                disabled={loading || !!pendingApproval}
                placeholder={pendingApproval ? "Ожидается подтверждение действия…" : "Сообщение… (Enter — отправить, Shift+Enter — строка)"}
                rows={1}
                className="min-h-[36px] max-h-[120px] flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12.5px] text-white/90 placeholder-white/25 outline-none transition-all focus:border-sky-500/50 focus:bg-white/8 disabled:opacity-50"
                style={{ lineHeight: "1.5", fieldSizing: "content" } as any}
              />
              <button
                onClick={() => handleSend(input)}
                disabled={loading || !input.trim() || !!pendingApproval}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/80 transition-all disabled:opacity-30 hover:text-white"
                style={{ background: (loading || !input.trim() || !!pendingApproval) ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg,rgba(14,165,233,.7),rgba(168,85,247,.6))" }}
                aria-label="Отправить"
              >
                {loading
                  ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                  : <SendIcon />}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[9px] text-white/20">
              MANUAL_ONLY · Advisory · {settings.model}
            </p>
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

function PaperclipIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function MessageContent({ content, streaming }: { content: string; streaming?: boolean }) {
  if (!content && streaming) {
    return <span className="inline-block h-4 w-4 animate-pulse rounded-full bg-white/20" />;
  }
  // Basic markdown: **bold**, `code`, ### headings, newlines
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`|^#{1,3} .+$|\n)/gm);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="font-semibold text-white/95">{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <code key={i} className="rounded bg-white/10 px-1 font-mono text-[11px] text-sky-300">{part.slice(1, -1)}</code>;
        if (/^#{1,3} /.test(part))
          return <strong key={i} className="block font-bold text-white/90 mt-1">{part.replace(/^#{1,3} /, "")}</strong>;
        if (part === "\n") return <br key={i} />;
        return <span key={i}>{part}</span>;
      })}
      {streaming && <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-sky-400/70 align-middle" />}
    </span>
  );
}

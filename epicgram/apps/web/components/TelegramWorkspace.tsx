"use client";

// TelegramWorkspace — Enterprise Telegram client UI inside EPIC☠STAR CONTROL.
// Category: COMMUNICATION · Status: ACTIVE
// READ-ONLY: real data from the existing Telegram Layer (/api/telegram/status, /api/telegram/chats).
// No sending / deleting / editing / automation. No backend / TDLib / auth changes. No routes changed.

import { useEffect, useMemo, useRef, useState } from "react";

export type OperatorCommand = {
  reqId: string;
  intent: "open_private_chats" | "open_chat_list" | "open_current_chat" | "open_chat_by_name" | "show_chat_context";
  query?: string;
};

type Ctx = {
  agents: any[]; missions: any[]; exec: any[]; devices: any[]; slots: any[];
  bind: Record<string, string>; counts: Record<string, any>; activeId: string;
};
type Chat = {
  id: any; title?: string; username?: string | null;
  category?: "private" | "group" | "channel" | "bot" | "chat"; isChannel?: boolean; isBot?: boolean;
  isMarkedAsUnread?: boolean; unreadCount?: number; isMuted?: boolean; memberCount?: number;
  lastMessage?: { content?: string; text?: string } | null;
};

const LS = "epic_tg_workspace_v1";
const SECTIONS = [
  ["accounts", "👤 Accounts"], ["folders", "🗂 Folders"], ["dialogs", "💬 Dialogs"], ["groups", "👥 Groups"],
  ["channels", "📢 Channels"], ["bots", "🤖 Bots"], ["contacts", "📇 Contacts"], ["saved", "🔖 Saved"],
  ["media", "🖼 Media"], ["files", "📁 Files"], ["calls", "📞 Calls"], ["sessions", "🔐 Sessions"],
  ["analytics", "📊 Analytics"], ["archive", "🗄 Archive"], ["settings", "⚙ Settings"],
] as const;
const FILTERS = ["All", "Unread", "Muted", "Bots", "Channels", "Groups", "Private"];

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
const av = (s: string) => "#" + ((hash(s) & 0xffffff) | 0x404040).toString(16).padStart(6, "0");
const ini = (s: string) => (s || "•").replace(/[^0-9A-Za-zÀ-ɏЀ-ӿ ]/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "•";
const cat = (c: Chat): "channel" | "group" | "bot" | "private" => c.category === "channel" || c.isChannel ? "channel" : c.category === "bot" || c.isBot ? "bot" : c.category === "group" ? "group" : "private";
const preview = (c: Chat) => c.lastMessage?.content || c.lastMessage?.text || "";

export function TelegramWorkspace({ ctx, slotId, focusKind, focusId, command, onClose, onOpenAgent }: {
  ctx: Ctx; slotId?: string; focusKind?: string; focusId?: string; command?: OperatorCommand | null; onClose: () => void; onOpenAgent?: (id: string) => void;
}) {
  const accounts = useMemo(() => (ctx.slots || []).map((s: any) => {
    const ownerId = ctx.bind?.[s.slotId || s.label]; const owner = ctx.agents?.find((a) => a.id === ownerId);
    return { id: s.slotId || s.label || "acc", name: s.displayName || s.slotId || "Telegram", phone: s.phoneMasked || "—", status: s.status || s.authorizationState || "—", authState: s.authorizationState, username: s.username || null, owner, device: ctx.devices?.find((d) => d.id === owner?.deviceId)?.name || "—", raw: s };
  }), [ctx]);

  const [section, setSection] = useState<string>("dialogs");
  const [acc, setAcc] = useState<string>(slotId || ctx.activeId || accounts[0]?.id || "");
  const [filter, setFilter] = useState("All");
  const [chat, setChat] = useState<string>("");
  const [q, setQ] = useState("");
  const [palette, setPalette] = useState(false);
  const [pq, setPq] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [conn, setConn] = useState<"connected" | "syncing" | "offline">("offline");
  const [loading, setLoading] = useState(false);
  const [fetchedAcc, setFetchedAcc] = useState("");
  const [mode, setMode] = useState<"client" | "command">("client");
  const [cc, setCc] = useState<string>("overview");
  const [gv, setGv] = useState({ tx: 40, ty: 20, s: 0.8 });
  const [gpos, setGpos] = useState<Record<string, { x: number; y: number }>>({});
  const [gsel, setGsel] = useState<string>("");
  const [gfocus, setGfocus] = useState<string>("");
  const [feed, setFeed] = useState<{ t: string; kind: string; text: string }[]>([]);
  const gdrag = useRef<{ mode: "pan" | "node" | null; id?: string; sx: number; sy: number; ox: number; oy: number }>({ mode: null, sx: 0, sy: 0, ox: 0, oy: 0 });
  const [discStatus, setDiscStatus] = useState<"idle" | "discovering" | "indexing" | "building" | "completed" | "error">("idle");
  const [discLog, setDiscLog] = useState<{ t: string; text: string }[]>([]);
  const [index, setIndex] = useState<any>(null);

  useEffect(() => { try { const d = JSON.parse(localStorage.getItem(LS) || "{}"); if (d.section) setSection(d.section); if (!slotId && d.acc) setAcc(d.acc); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ section, acc })); } catch {} }, [section, acc]);
  useEffect(() => { if (focusKind === "channel") setSection("channels"); else if (focusKind === "group") setSection("groups"); else if (focusKind === "bot") setSection("bots"); }, [focusKind]);
  useEffect(() => { function onKey(e: KeyboardEvent) { if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setPalette((v) => !v); setPq(""); } if (e.key === "Escape") setPalette(false); } window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);

  // ---- READ-ONLY DATA FETCH from existing Telegram Layer ----
  useEffect(() => {
    let alive = true;
    async function load() {
      setConn("syncing"); setLoading(true);
      try {
        const s = await fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
        const active = (s?.accounts || []).find((a: any) => (a.slotId || a.label) === acc) || (s?.accounts || [])[0];
        const ready = active && (active.authorizationState === "authorizationStateReady" || active.status === "ready" || active.status === "authorized");
        if (!alive) return;
        if (!s || !active) { setConn("offline"); setChats([]); setLoading(false); setFetchedAcc(acc); return; }
        const cj = await fetch("/api/telegram/chats?accountId=" + encodeURIComponent(acc || active.slotId || ""), { cache: "no-store" }).then((r) => r.json()).catch(() => null);
        if (!alive) return;
        const list: Chat[] = cj?.chats || (cj?.body && cj.body.chats) || [];
        setChats(Array.isArray(list) ? list : []);
        setConn(ready ? "connected" : list.length ? "connected" : "offline");
      } catch { if (alive) { setConn("offline"); setChats([]); } }
      if (alive) { setLoading(false); setFetchedAcc(acc); }
    }
    load();
    return () => { alive = false; };
  }, [acc]);

  const account = accounts.find((a) => a.id === acc) || accounts[0];
  const lastCommandRef = useRef<string>("");

  // ---- OPERATOR NATURAL-LANGUAGE COMMANDS (UI navigation only) ----
  // Executes intents forwarded by GlobalAIOperatorSidebar via the `command` prop and reports
  // back over a CustomEvent so the sidebar can render the result. No send, no TDLib, no
  // account/session changes — this only moves `section`/`filter`/`chat` UI state.
  useEffect(() => {
    if (!command || !command.reqId || lastCommandRef.current === command.reqId) return;
    if (loading) return; // wait for the read-only chat list fetch to settle before acting
    lastCommandRef.current = command.reqId;

    const report = (success: boolean, message: string) => {
      try {
        window.dispatchEvent(new CustomEvent("deepinside:operator-result", {
          detail: { reqId: command.reqId, intent: command.intent, success, message },
        }));
      } catch {}
    };

    const privateCount = chats.filter((c) => cat(c) === "private").length;

    if (command.intent === "open_private_chats") {
      setSection("dialogs"); setFilter("Private");
      report(true, privateCount > 0
        ? `Открыл «Личные сообщения» (${privateCount} чат${privateCount === 1 ? "" : "ов"}).`
        : "Открыл фильтр «Личные сообщения». Пока в списке нет личных чатов.");
      return;
    }
    if (command.intent === "open_chat_list") {
      setSection("dialogs"); setFilter("All");
      report(true, `Открыл список чатов (${chats.length}).`);
      return;
    }
    if (command.intent === "open_current_chat") {
      const cur = chats.find((c) => c.id === chat);
      if (cur) { setSection("dialogs"); report(true, `Текущий чат уже открыт: «${cur.title || "chat"}».`); }
      else report(false, "Чат не открыт. Выбери чат из списка или напиши точное имя.");
      return;
    }
    if (command.intent === "open_chat_by_name") {
      const query = (command.query || "").trim().toLowerCase();
      const found = chats.find((c) => (c.title || "").toLowerCase() === query || (c.username || "").toLowerCase() === query)
        || chats.find((c) => (c.title || "").toLowerCase().includes(query) || (c.username || "").toLowerCase().includes(query));
      if (found) { setSection("dialogs"); setFilter("All"); setChat(found.id); report(true, `Открыл чат «${found.title || found.username || query}».`); }
      else report(false, "Не нашёл чат. Выбери его вручную или напиши точное имя.");
      return;
    }
    if (command.intent === "show_chat_context") {
      const cur = chats.find((c) => c.id === chat);
      if (cur) {
        const kind = cat(cur);
        const unread = cur.unreadCount ? `, непрочитано: ${cur.unreadCount}` : "";
        const last = preview(cur) ? ` · последнее: «${preview(cur)}»` : "";
        report(true, `Контекст чата: «${cur.title || cur.username || "chat"}» (тип: ${kind}${unread})${last}.`);
      } else {
        report(false, "Чат не открыт. Выбери чат из списка или напиши точное имя, чтобы я показал контекст.");
      }
      return;
    }
  }, [command, loading, chats, chat]);

  // ---- DERIVE REAL OBJECTS (read-only) ----
  const dialogs = chats;
  const groups = useMemo(() => chats.filter((c) => cat(c) === "group"), [chats]);
  const channels = useMemo(() => chats.filter((c) => cat(c) === "channel"), [chats]);
  const bots = useMemo(() => chats.filter((c) => cat(c) === "bot"), [chats]);
  const contacts = useMemo(() => chats.filter((c) => cat(c) === "private"), [chats]);
  const stats = {
    dialogs: chats.length, groups: groups.length, channels: channels.length, bots: bots.length,
    contacts: contacts.length, media: 0, files: 0, unread: chats.reduce((s, c) => s + (c.unreadCount || 0), 0),
  };

  const fDialogs = useMemo(() => dialogs.filter((d) => {
    if (filter === "Unread" && !(d.unreadCount || d.isMarkedAsUnread)) return false;
    if (filter === "Muted" && !d.isMuted) return false;
    if (filter === "Channels" && cat(d) !== "channel") return false;
    if (filter === "Groups" && cat(d) !== "group") return false;
    if (filter === "Bots" && cat(d) !== "bot") return false;
    if (filter === "Private" && cat(d) !== "private") return false;
    if (q && !((d.title || "") + " " + (d.username || "") + " " + preview(d)).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [dialogs, filter, q]);

  const Avatar = ({ name, size = 36 }: { name: string; size?: number }) => (
    <div className="flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, background: av(name), fontSize: size / 2.6 }}>{ini(name)}</div>
  );
  const Row = ({ children, active, onClick }: any) => (
    <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left ${active ? "bg-tg-active/30 ring-1 ring-tg-accent" : "hover:bg-tg-bg/50"}`}>{children}</button>
  );
  const Empty = ({ text }: { text: string }) => (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-tg-muted">
      <div className="text-3xl opacity-40">📭</div>
      <div className="text-sm">{loading ? "Синхронизация…" : text}</div>
      {!loading && conn === "offline" && <div className="text-[11px]">Нет авторизованной сессии Telegram. Подключите аккаунт в разделе авторизации.</div>}
    </div>
  );

  function Center() {
    if (section === "accounts") return accounts.length ? (
      <div className="space-y-1.5 p-2">{accounts.map((a) => (
        <Row key={a.id} active={acc === a.id} onClick={() => { setAcc(a.id); setSection("dialogs"); }}>
          <Avatar name={a.name} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{a.name}</div><div className="truncate text-[11px] text-tg-muted">{a.phone} · {a.status}</div></div>
          <span className="rounded bg-tg-bg px-1.5 py-0.5 text-[10px] text-tg-muted">{a.owner?.name || "no agent"}</span>
        </Row>))}</div>
    ) : <Empty text="Нет аккаунтов Telegram." />;
    if (section === "groups") return groups.length ? (
      <div className="space-y-1.5 p-2">{groups.map((g) => (
        <Row key={g.id} active={chat === g.id} onClick={() => setChat(g.id)}><Avatar name={g.title || "group"} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{g.title || "group"}</div><div className="truncate text-[11px] text-tg-muted">{g.memberCount ? g.memberCount + " members · " : ""}{preview(g)}</div></div>
          {g.isMuted && <span className="text-[10px] text-tg-muted">🔕</span>}</Row>))}</div>
    ) : <Empty text="Групп нет." />;
    if (section === "channels") return channels.length ? (
      <div className="space-y-1.5 p-2">{channels.map((c) => { const owner = ctx.bind?.[acc]; const ag = ctx.agents?.find((a) => a.id === owner); return (
        <Row key={c.id} active={chat === c.id} onClick={() => setChat(c.id)}><Avatar name={c.title || "channel"} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{c.title || "channel"}</div><div className="truncate text-[11px] text-tg-muted">{c.memberCount ? c.memberCount.toLocaleString() + " subs · " : ""}{preview(c)}</div></div>
          {ag && <span className="rounded bg-tg-bg px-1.5 py-0.5 text-[10px] text-tg-accent">{ag.name}</span>}</Row>); })}</div>
    ) : <Empty text="Каналов нет." />;
    if (section === "bots") return bots.length ? (
      <div className="space-y-1.5 p-2">{bots.map((b) => (
        <Row key={b.id} active={chat === b.id} onClick={() => setChat(b.id)}><Avatar name={b.title || "bot"} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{b.title || "bot"}</div><div className="truncate text-[11px] text-tg-muted">{b.username || ""} {preview(b)}</div></div></Row>))}</div>
    ) : <Empty text="Ботов нет." />;
    if (section === "contacts") return contacts.length ? (
      <div className="space-y-1 p-2">{contacts.filter((c) => !q || (c.title || "").toLowerCase().includes(q.toLowerCase())).map((c) => (
        <Row key={c.id} active={chat === c.id} onClick={() => setChat(c.id)}><Avatar name={c.title || "user"} size={32} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{c.title || "user"}</div><div className="text-[11px] text-tg-muted">{c.username || ""}</div></div></Row>))}</div>
    ) : <Empty text="Контактов нет." />;
    if (section === "saved") { const self = chats.find((c) => /saved/i.test(c.title || "")); return self ? <div className="p-2"><Row active onClick={() => setChat(self.id)}><Avatar name="Saved" /><span className="text-sm font-semibold">{self.title}</span></Row></div> : <Empty text="Saved Messages недоступны (read-only)." />; }
    if (section === "media") return <Empty text="Медиа недоступно в read-only режиме (Telegram Layer не отдаёт медиа-историю)." />;
    if (section === "files") return <Empty text="Файлы недоступны в read-only режиме." />;
    if (section === "calls") return <Empty text="История звонков недоступна в read-only режиме." />;
    if (section === "sessions") return accounts.length ? (
      <div className="space-y-1.5 p-2">{accounts.map((a) => (
        <div key={a.id} className="rounded-lg bg-tg-bg/50 px-3 py-2 text-xs"><div className="text-sm font-semibold">{a.name}</div>
          <div className="text-tg-muted">Device: {a.device} · Status: {a.status}</div><div className="text-tg-muted">Owner: {a.owner?.name || "—"} · Auth: {a.authState || "—"}</div></div>))}</div>
    ) : <Empty text="Сессий нет." />;
    if (section === "analytics") return (
      <div className="grid grid-cols-2 gap-2 p-3">{([["Dialogs", stats.dialogs], ["Groups", stats.groups], ["Channels", stats.channels], ["Bots", stats.bots], ["Contacts", stats.contacts], ["Media", stats.media], ["Files", stats.files], ["Unread", stats.unread]] as const).map(([l, v]) => (
        <div key={l} className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-2xl font-extrabold text-tg-accent">{v}</div></div>))}</div>
    );
    if (section === "archive") return <Empty text="Архив недоступен в read-only режиме." />;
    if (section === "settings") return <div className="space-y-2 p-3 text-sm text-tg-muted">Read-only visual workspace. Источник данных: существующий Telegram Layer (TDLib через /api/telegram). Реальные Telegram-действия отключены. Backend/авторизация/маршруты не затрагиваются.</div>;
    if (section === "folders") return (
      <div className="space-y-1 p-2">{(["All", "Unread", "Channels", "Groups", "Bots", "Private"]).map((f) => <Row key={f} active={filter === f} onClick={() => { setFilter(f); setSection("dialogs"); }}><span className="text-lg">🗂</span><span className="text-sm font-semibold">{f}</span></Row>)}</div>
    );
    // dialogs default
    return fDialogs.length ? (
      <div className="space-y-0.5 p-2">{fDialogs.map((d) => (
        <Row key={d.id} active={chat === d.id} onClick={() => setChat(d.id)}><Avatar name={d.title || "chat"} />
          <div className="min-w-0 flex-1"><div className="flex items-center"><span className="truncate text-sm font-semibold">{d.title || "chat"}</span><span className="ml-auto text-[10px] text-tg-muted">{cat(d)}</span></div>
            <div className="flex items-center"><span className="truncate text-[12px] text-tg-muted">{preview(d)}</span>{(d.unreadCount || 0) > 0 && <span className="ml-auto rounded-full bg-tg-accent px-1.5 text-[10px] font-bold text-white">{d.unreadCount}</span>}</div></div>
          {d.isMuted && <span className="text-[10px] text-tg-muted">🔕</span>}</Row>))}</div>
    ) : <Empty text="Чатов нет." />;
  }

  const selChat = chats.find((c) => c.id === chat);
  const ownerAgent = account?.owner;
  const ownerMissions = ctx.missions?.filter((m) => m.agentId === ownerAgent?.id) || [];
  const connClr = conn === "connected" ? "#4ade80" : conn === "syncing" ? "#fbbf24" : "#f87171";
  const connLbl = conn === "connected" ? "Connected" : conn === "syncing" ? "Syncing" : "Offline";

  const cmd = (tab: string) => { setMode("command"); setCc(tab); };
  const palCommands = [
    { id: "p_sessions", label: "Open Sessions", run: () => cmd("sessions") },
    { id: "p_dialogs", label: "Open Dialogs", run: () => cmd("dialogs") },
    { id: "p_channels", label: "Open Channels", run: () => cmd("channels") },
    { id: "p_groups", label: "Open Groups", run: () => cmd("groups") },
    { id: "p_bots", label: "Open Bots", run: () => cmd("bots") },
    { id: "p_analytics", label: "Open Analytics", run: () => cmd("analytics") },
    { id: "p_graph", label: "Open Graph", run: () => cmd("graph") },
    { id: "p_focus_unread", label: "Focus Unread", run: () => { setMode("client"); setSection("dialogs"); setFilter("Unread"); } },
    { id: "p_focus_channels", label: "Focus Channels", run: () => cmd("channels") },
    { id: "p_focus_groups", label: "Focus Groups", run: () => cmd("groups") },
    { id: "p_focus_missions", label: "Focus Missions", run: () => { setMode("command"); setCc("graph"); } },
    { id: "p_run_disc", label: "Run Discovery", run: () => { cmd("discovery"); setTimeout(runDiscovery, 50); } },
    { id: "p_rebuild_idx", label: "Rebuild Index", run: () => { cmd("discovery"); setTimeout(runDiscovery, 50); } },
    { id: "p_rebuild_rel", label: "Rebuild Relationships", run: () => { cmd("discovery"); } },
    { id: "p_refresh_graph", label: "Refresh Graph", run: () => cmd("graph") },
    { id: "p_show_new", label: "Show New Objects", run: () => cmd("dialogs") },
    { id: "p_focus_contacts", label: "Focus Contacts", run: () => { setMode("client"); setSection("contacts"); } },
    { id: "p_agent", label: "Open Owner Agent", run: () => ownerAgent && onOpenAgent?.(ownerAgent.id) },
  ].filter((c) => !pq || c.label.toLowerCase().includes(pq.toLowerCase()));
  const palNodes = pq ? chats.filter((x) => (x.title || "").toLowerCase().includes(pq.toLowerCase())).slice(0, 12) : [];

  // ---------- TELEGRAM GRAPH (real data) ----------
  const GCLR: Record<string, string> = { agent: "#ff2d6b", session: "#e879f9", dialog: "#9ca3af", channel: "#3ea6ff", group: "#34d399", bot: "#f59e0b", mission: "#22c55e" };
  const graph = useMemo(() => {
    const nodes: { id: string; type: string; label: string; ref?: string }[] = [];
    const edges: [string, string][] = [];
    accounts.forEach((a) => {
      if (a.owner) { nodes.push({ id: "ag_" + a.owner.id, type: "agent", label: a.owner.name, ref: a.owner.id }); }
      nodes.push({ id: "ses_" + a.id, type: "session", label: a.name, ref: a.id });
      if (a.owner) edges.push(["ag_" + a.owner.id, "ses_" + a.id]);
    });
    const cur = "ses_" + acc;
    chats.slice(0, 24).forEach((c) => { const k = cat(c); nodes.push({ id: "c_" + c.id, type: k, label: (c.title || k).slice(0, 16), ref: String(c.id) }); edges.push([cur, "c_" + c.id]); });
    (ctx.missions || []).filter((m) => m.agentId === account?.owner?.id).forEach((m) => { nodes.push({ id: "mis_" + m.id, type: "mission", label: m.title.slice(0, 16), ref: m.id }); if (account?.owner) edges.push(["ag_" + account.owner.id, "mis_" + m.id]); });
    return { nodes, edges };
  }, [accounts, chats, acc, ctx]);
  const gDefault = useMemo(() => {
    const cols: Record<string, number> = { agent: 60, mission: 60, session: 320, dialog: 600, channel: 600, group: 820, bot: 1020 };
    const idx: Record<string, number> = {}; const p: Record<string, { x: number; y: number }> = {};
    graph.nodes.forEach((n) => { const c = idx[n.type] = (idx[n.type] ?? -1) + 1; p[n.id] = { x: cols[n.type] ?? 700, y: 60 + c * 80 }; });
    return p;
  }, [graph]);
  const GP = (id: string) => gpos[id] || gDefault[id] || { x: 700, y: 300 };
  useEffect(() => {
    function mv(e: MouseEvent) { const d = gdrag.current; if (!d.mode) return; if (d.mode === "node" && d.id) { const dx = (e.clientX - d.sx) / gv.s, dy = (e.clientY - d.sy) / gv.s; setGpos((p) => ({ ...p, [d.id as string]: { x: d.ox + dx, y: d.oy + dy } })); } else if (d.mode === "pan") setGv((v) => ({ ...v, tx: d.ox + (e.clientX - d.sx), ty: d.oy + (e.clientY - d.sy) })); }
    function up() { gdrag.current.mode = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [gv.s]);
  function gdown(e: React.MouseEvent, id?: string) { const d = gdrag.current; d.sx = e.clientX; d.sy = e.clientY; if (id) { d.mode = "node"; d.id = id; const p = GP(id); d.ox = p.x; d.oy = p.y; setGsel(id); } else { d.mode = "pan"; d.ox = gv.tx; d.oy = gv.ty; } e.stopPropagation(); }
  const gNeighbors = (id: string) => graph.edges.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));

  // ---------- TELEGRAM ACTIVITY FEED (read-only, derived) ----------
  useEffect(() => {
    const ev: { t: string; kind: string; text: string }[] = [];
    const now = new Date().toISOString().slice(11, 19);
    if (conn === "connected") ev.push({ t: now, kind: "sync", text: "Sync Completed · " + (account?.name || "") });
    if (conn === "offline") ev.push({ t: now, kind: "conn", text: "Connection Lost" });
    if (conn === "syncing") ev.push({ t: now, kind: "conn", text: "Syncing…" });
    channels.slice(0, 2).forEach((c) => ev.push({ t: now, kind: "channel", text: "Channel: " + (c.title || "") }));
    groups.slice(0, 2).forEach((g) => ev.push({ t: now, kind: "group", text: "Group: " + (g.title || "") }));
    chats.slice(0, 3).forEach((c) => ev.push({ t: now, kind: "dialog", text: "Dialog: " + (c.title || "") }));
    setFeed(ev.slice(0, 10));
  }, [conn, chats, account]);

  const health = { connected: conn === "connected" ? accounts.length : 0, offline: conn === "offline" ? Math.max(1, accounts.length) : 0, syncing: conn === "syncing" ? 1 : 0, error: 0, sessions: accounts.length, channels: channels.length, groups: groups.length, bots: bots.length };

  // ---------- TELEGRAM DISCOVERY ENGINE (read-only) ----------
  const IDX_KEY = "epic_telegram_index_v1";
  useEffect(() => { try { const i = JSON.parse(localStorage.getItem(IDX_KEY) || "null"); if (i) setIndex(i); } catch {} }, []);
  function dlog(text: string) { setDiscLog((l) => [{ t: new Date().toISOString().slice(11, 19), text }, ...l].slice(0, 16)); }
  function buildRelations(accs: any[], list: Chat[]) {
    const rel: { from: string; to: string; kind: string }[] = [];
    accs.forEach((a) => { if (a.owner) rel.push({ from: "ag_" + a.owner.id, to: "ses_" + a.id, kind: "agent→session" });
      (ctx.missions || []).filter((m) => m.agentId === a.owner?.id).forEach((m) => { rel.push({ from: "ag_" + a.owner.id, to: "mis_" + m.id, kind: "agent→mission" }); }); });
    list.forEach((c) => { const k = cat(c); rel.push({ from: "ses_" + acc, to: "c_" + c.id, kind: "session→" + k }); if (k === "private") rel.push({ from: "c_" + c.id, to: "ct_" + c.id, kind: "dialog→contact" }); });
    return rel;
  }
  async function runDiscovery() {
    setDiscStatus("discovering"); setDiscLog([]); dlog("Discovery Started");
    try {
      const s = await fetch("/api/telegram/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      const accs = (s?.accounts || []).map((x: any) => { const ownerId = ctx.bind?.[x.slotId || x.label]; return { id: x.slotId || x.label, name: x.displayName || x.slotId, owner: ctx.agents?.find((a) => a.id === ownerId) }; });
      dlog("Sessions discovered: " + accs.length);
      const active = (s?.accounts || []).find((a: any) => (a.slotId || a.label) === acc) || (s?.accounts || [])[0];
      const cj = active ? await fetch("/api/telegram/chats?accountId=" + encodeURIComponent(acc || active.slotId || ""), { cache: "no-store" }).then((r) => r.json()).catch(() => null) : null;
      const list: Chat[] = cj?.chats || (cj?.body && cj.body.chats) || [];
      setChats(Array.isArray(list) ? list : []);
      const dlg = list.filter((c) => cat(c) === "private"), ch = list.filter((c) => cat(c) === "channel"), gr = list.filter((c) => cat(c) === "group"), bt = list.filter((c) => cat(c) === "bot");
      setDiscStatus("indexing");
      dlog("Dialogs Indexed: " + list.length); dlog("Channels Indexed: " + ch.length); dlog("Groups Indexed: " + gr.length); dlog("Bots Indexed: " + bt.length);
      setDiscStatus("building");
      const rel = buildRelations(accs, list);
      dlog("Relationships Built: " + rel.length);
      const idx = {
        schema: IDX_KEY, timestamp: new Date().toISOString(),
        sessions: accs.map((a: any) => ({ id: a.id, name: a.name, owner: a.owner?.name || null })),
        dialogs: dlg.map((c) => ({ id: c.id, title: c.title, unread: c.unreadCount || 0 })),
        channels: ch.map((c) => ({ id: c.id, title: c.title, members: c.memberCount || null })),
        groups: gr.map((c) => ({ id: c.id, title: c.title, members: c.memberCount || null })),
        bots: bt.map((c) => ({ id: c.id, title: c.title, username: c.username || null })),
        contacts: dlg.map((c) => ({ id: c.id, title: c.title })),
        relationships: rel,
        metadata: { source: "telegram-layer", account: acc, readOnly: true },
      };
      try { localStorage.setItem(IDX_KEY, JSON.stringify(idx)); } catch {}
      setIndex(idx); dlog("Graph Updated"); dlog("Discovery Finished");
      setDiscStatus("completed");
    } catch { setDiscStatus("error"); dlog("Discovery Error"); }
  }
  const discMetrics = index ? {
    sessions: index.sessions?.length || 0, dialogs: index.dialogs?.length || 0, channels: index.channels?.length || 0,
    groups: index.groups?.length || 0, bots: index.bots?.length || 0, contacts: index.contacts?.length || 0,
    media: 0, files: 0, relationships: index.relationships?.length || 0,
  } : { sessions: 0, dialogs: 0, channels: 0, groups: 0, bots: 0, contacts: 0, media: 0, files: 0, relationships: 0 };
  const indexSize = index ? new Blob([JSON.stringify(index)]).size : 0;
  const DISC_LABEL: Record<string, string> = { idle: "Idle", discovering: "Discovering", indexing: "Indexing", building: "Building Graph", completed: "Completed", error: "Error" };
  const DISC_CLR: Record<string, string> = { idle: "#9ca3af", discovering: "#fbbf24", indexing: "#38bdf8", building: "#a78bfa", completed: "#4ade80", error: "#f87171" };

  const CC_TABS = ["overview", "discovery", "sessions", "dialogs", "channels", "groups", "bots", "media", "files", "analytics", "graph", "search"];
  const Bar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => (
    <div className="flex items-center gap-2 text-[11px]"><span className="w-20 text-tg-muted">{label}</span><div className="h-2 flex-1 overflow-hidden rounded bg-tg-bg"><div className="h-full" style={{ width: (max ? Math.round((value / max) * 100) : 0) + "%", background: color }} /></div><span className="w-8 text-right font-bold">{value}</span></div>
  );

  function CommandCenter() {
    const maxStat = Math.max(1, stats.dialogs, stats.channels, stats.groups, stats.bots, stats.contacts, stats.unread);
    if (cc === "overview") return (
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">{([["Accounts", accounts.length], ["Dialogs", stats.dialogs], ["Channels", stats.channels], ["Groups", stats.groups], ["Bots", stats.bots], ["Unread", stats.unread], ["Media", stats.media], ["Files", stats.files], ["Sessions", accounts.length], ["Contacts", stats.contacts]] as const).map(([l, v]) => (
          <div key={l} className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-2xl font-extrabold text-tg-accent">{v}</div></div>))}</div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-tg-accent">Telegram Health</div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">{([["Connected", health.connected, "#4ade80"], ["Offline", health.offline, "#f87171"], ["Syncing", health.syncing, "#fbbf24"], ["Error", health.error, "#f97316"], ["Sessions", health.sessions, "#e879f9"], ["Channels", health.channels, "#3ea6ff"], ["Groups", health.groups, "#34d399"], ["Bots", health.bots, "#f59e0b"]] as const).map(([l, v, c]) => <div key={l} className="flex items-center gap-1.5 rounded bg-tg-bg px-2 py-1"><span className="h-2 w-2 rounded-full" style={{ background: c }} /><span className="text-tg-muted">{l}</span><b className="ml-auto">{v}</b></div>)}</div>
            <div className="mt-2 text-[11px] text-tg-muted">Connection: <b style={{ color: connClr }}>{connLbl}</b> · Last Sync: <b className="text-tg-text">{new Date().toLocaleTimeString()}</b></div>
          </div>
          <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-tg-accent">Activity Feed (read-only)</div>
            <div className="mt-2 space-y-0.5 text-[11px]">{feed.length ? feed.map((e, i) => <div key={i} className="flex gap-1.5"><span className="text-tg-muted">{e.t}</span><span className="rounded bg-tg-bg px-1 text-[9px] uppercase text-cyan-300">{e.kind}</span><span className="truncate text-tg-text">{e.text}</span></div>) : <div className="text-tg-muted">Событий нет.</div>}</div>
          </div>
        </div>
      </div>
    );
    if (cc === "discovery") return (
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-tg-line bg-tg-bg/40 p-3">
          <div className="text-sm font-black tracking-wide">🛰 TELEGRAM DISCOVERY ENGINE</div>
          <span className="flex items-center gap-1.5 rounded-full border border-tg-line bg-tg-bg px-2 py-0.5 text-[10px] font-bold"><span className="h-2 w-2 rounded-full" style={{ background: DISC_CLR[discStatus] }} />{DISC_LABEL[discStatus]}</span>
          <button onClick={runDiscovery} disabled={["discovering", "indexing", "building"].includes(discStatus)} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">▶ Run Discovery</button>
          <button onClick={runDiscovery} className="rounded-lg bg-tg-bg px-3 py-1.5 text-xs ring-1 ring-tg-line">Rebuild Index</button>
          <button onClick={() => { if (index) { setIndex({ ...index, relationships: buildRelations(accounts, chats), timestamp: new Date().toISOString() }); dlog("Relationships rebuilt"); } }} className="rounded-lg bg-tg-bg px-3 py-1.5 text-xs ring-1 ring-tg-line">Rebuild Relationships</button>
          <div className="ml-auto text-[11px] text-tg-muted">Last Discovery: <b className="text-tg-text">{index?.timestamp ? new Date(index.timestamp).toLocaleString() : "—"}</b> · Index: <b className="text-tg-text">{(indexSize / 1024).toFixed(1)} KB</b></div>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-5">{([["Sessions Found", discMetrics.sessions], ["Dialogs Found", discMetrics.dialogs], ["Channels Found", discMetrics.channels], ["Groups Found", discMetrics.groups], ["Bots Found", discMetrics.bots], ["Contacts Found", discMetrics.contacts], ["Media Found", discMetrics.media], ["Files Found", discMetrics.files], ["Relationships Built", discMetrics.relationships], ["Index Size (KB)", +(indexSize / 1024).toFixed(1)]] as const).map(([l, v]) => (
          <div key={l} className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] uppercase tracking-wide text-tg-muted">{l}</div><div className="text-2xl font-extrabold text-tg-accent">{v}</div></div>))}</div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-tg-accent">Discovery Log</div>
            <div className="mt-2 max-h-48 space-y-0.5 overflow-auto text-[11px]">{discLog.length ? discLog.map((e, i) => <div key={i} className="flex gap-1.5"><span className="text-tg-muted">{e.t}</span><span className="text-tg-text">{e.text}</span></div>) : <div className="text-tg-muted">Лог пуст. Нажмите Run Discovery.</div>}</div>
          </div>
          <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-tg-accent">Pipeline</div>
            <div className="mt-2 space-y-1 text-[11px]">{["Telegram Session", "Dialogs Discovery", "Channels Discovery", "Groups Discovery", "Bots Discovery", "Contacts Discovery", "Relationship Builder", "WORLD Graph"].map((s, i) => <div key={i} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: discStatus === "completed" ? "#4ade80" : DISC_CLR[discStatus] }} />{s}</div>)}</div>
            {!index && <div className="mt-2 rounded-lg bg-tg-bg/60 p-2 text-[11px] text-tg-muted">Индекс пуст. Выполните Discovery для построения карты Telegram-экосистемы.</div>}
          </div>
        </div>
      </div>
    );
    if (cc === "sessions") return (
      <div className="p-3"><table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["", "Account", "Phone", "Status", "Dialogs", "Channels", "Groups", "Owner Agent", "Connected"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
        <tbody>{accounts.length ? accounts.map((a) => (<tr key={a.id} className="border-t border-tg-line"><td className="px-2 py-1.5"><div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: av(a.name) }}>{ini(a.name)}</div></td><td className="px-2 font-semibold">{a.name}</td><td className="px-2 text-tg-muted">{a.phone}</td><td className="px-2">{a.status}</td><td className="px-2">{a.id === acc ? stats.dialogs : "—"}</td><td className="px-2">{a.id === acc ? stats.channels : "—"}</td><td className="px-2">{a.id === acc ? stats.groups : "—"}</td><td className="px-2 text-tg-accent">{a.owner?.name || "—"}</td><td className="px-2"><span style={{ color: a.id === acc ? connClr : "#9ca3af" }}>{a.id === acc ? connLbl : "—"}</span></td></tr>)) : <tr><td colSpan={9} className="px-2 py-4 text-tg-muted">Нет сессий.</td></tr>}</tbody></table></div>
    );
    if (cc === "dialogs" || cc === "channels" || cc === "groups" || cc === "bots") {
      const data = cc === "channels" ? channels : cc === "groups" ? groups : cc === "bots" ? bots : dialogs;
      const filtered = data.filter((d) => !q || ((d.title || "") + (d.username || "")).toLowerCase().includes(q.toLowerCase()));
      return (
        <div className="p-3"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск / фильтр…" className="mb-2 w-full max-w-sm rounded-lg bg-tg-bg px-3 py-1.5 text-sm outline-none" />
          {filtered.length ? <table className="w-full text-left text-xs"><thead className="text-tg-muted"><tr>{["", "Title", "Type", "Last / User", "Unread", "Owner Agent", "Session"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}</tr></thead>
            <tbody>{filtered.map((d) => (<tr key={d.id} className="border-t border-tg-line hover:bg-tg-bg/40"><td className="px-2 py-1.5"><div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: av(d.title || "x") }}>{ini(d.title || "x")}</div></td><td className="px-2 font-semibold">{d.title || "—"}</td><td className="px-2 text-tg-muted">{cat(d)}</td><td className="px-2 text-tg-muted">{preview(d) || d.username || "—"}</td><td className="px-2">{d.unreadCount || 0}</td><td className="px-2 text-tg-accent">{account?.owner?.name || "—"}</td><td className="px-2 text-tg-muted">{account?.name || "—"}</td></tr>))}</tbody></table>
            : <div className="py-8 text-center text-sm text-tg-muted">{loading ? "Синхронизация…" : "Нет данных (read-only Telegram Layer)."}</div>}
        </div>
      );
    }
    if (cc === "media") return <div className="grid grid-cols-3 gap-2 p-4 lg:grid-cols-7">{["Images", "Videos", "Voice", "Documents", "Links", "Files", "Storage"].map((l) => <div key={l} className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] uppercase text-tg-muted">{l}</div><div className="text-xl font-extrabold text-tg-accent">0</div></div>)}<div className="col-span-full text-[11px] text-tg-muted">Медиа-статистика недоступна в read-only режиме Telegram Layer.</div></div>;
    if (cc === "files") return <div className="p-4 text-sm text-tg-muted">Файловая статистика недоступна в read-only режиме (Telegram Layer не отдаёт файловую историю).</div>;
    if (cc === "analytics") return (
      <div className="space-y-2 p-4"><div className="text-[10px] font-black uppercase tracking-wide text-tg-accent">Telegram Analytics</div>
        <div className="space-y-1.5">{([["Dialogs", stats.dialogs, "#9ca3af"], ["Channels", stats.channels, "#3ea6ff"], ["Groups", stats.groups, "#34d399"], ["Bots", stats.bots, "#f59e0b"], ["Contacts", stats.contacts, "#e879f9"], ["Unread", stats.unread, "#ff2d6b"], ["Media", stats.media, "#a78bfa"], ["Files", stats.files, "#22c55e"]] as const).map(([l, v, c]) => <Bar key={l} label={l} value={v} max={maxStat} color={c} />)}</div>
        <div className="mt-2 text-[11px] text-tg-muted">Sessions: <b className="text-tg-text">{accounts.length}</b> · Last Activity: <b className="text-tg-text">{new Date().toLocaleTimeString()}</b></div>
      </div>
    );
    if (cc === "search") return (
      <div className="p-4"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Глобальный поиск: dialogs, channels, groups, bots, sessions, agents, missions…" className="w-full rounded-lg bg-tg-bg px-3 py-2 text-sm outline-none" />
        <div className="mt-3 space-y-1 text-sm">
          {[...chats.map((c) => ({ id: "c" + c.id, label: c.title || "chat", kind: cat(c) })), ...accounts.map((a) => ({ id: "a" + a.id, label: a.name, kind: "session" })), ...(ctx.agents || []).map((a) => ({ id: "ag" + a.id, label: a.name, kind: "agent" })), ...(ctx.missions || []).map((m) => ({ id: "m" + m.id, label: m.title, kind: "mission" }))]
            .filter((x) => q && x.label.toLowerCase().includes(q.toLowerCase())).slice(0, 30)
            .map((x) => <div key={x.id} className="flex items-center gap-2 rounded-lg bg-tg-bg/50 px-3 py-1.5"><span className="h-2 w-2 rounded-full" style={{ background: GCLR[x.kind] || "#888" }} /><span className="font-semibold">{x.label}</span><span className="ml-auto text-[11px] text-tg-muted">{x.kind}</span></div>)}
          {!q && <div className="text-tg-muted">Введите запрос для глобального поиска.</div>}
        </div>
      </div>
    );
    // graph
    const gsn = graph.nodes.find((n) => n.id === gsel);
    const focusSet = gfocus ? new Set([gfocus, ...gNeighbors(gfocus)]) : null;
    return (
      <div className="grid h-full grid-cols-[1fr_260px]">
        <div className="relative overflow-hidden bg-[#0a0f17]" style={{ backgroundImage: "linear-gradient(rgba(62,166,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(62,166,255,.06) 1px,transparent 1px)", backgroundSize: "28px 28px" }}>
          <div className="absolute left-3 top-3 z-10 flex gap-1"><button onClick={() => setGv((v) => ({ ...v, s: Math.min(2, +(v.s + 0.15).toFixed(2)) }))} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">+</button><button onClick={() => setGv((v) => ({ ...v, s: Math.max(0.3, +(v.s - 0.15).toFixed(2)) }))} className="h-8 w-8 rounded-lg bg-tg-panel text-lg ring-1 ring-tg-line">−</button><button onClick={() => { setGv({ tx: 40, ty: 20, s: 0.8 }); setGpos({}); setGfocus(""); }} className="rounded-lg bg-tg-panel px-2 text-xs ring-1 ring-tg-line">reset</button></div>
          <div className="absolute inset-0 cursor-grab active:cursor-grabbing" onMouseDown={(e) => gdown(e)}>
            <div style={{ transform: `translate(${gv.tx}px,${gv.ty}px) scale(${gv.s})`, transformOrigin: "0 0", position: "absolute", inset: 0 }}>
              <svg className="pointer-events-none absolute" style={{ overflow: "visible", left: 0, top: 0 }} width="1" height="1">{graph.edges.map(([a, b], i) => { const pa = GP(a), pb = GP(b); const on = gfocus && (a === gfocus || b === gfocus); return <line key={i} x1={pa.x + 50} y1={pa.y + 16} x2={pb.x + 50} y2={pb.y + 16} stroke={on ? "#3ea6ff" : "rgba(62,166,255,.25)"} strokeWidth={on ? 2 : 1.2} opacity={focusSet && !on ? 0.12 : 1} />; })}</svg>
              {graph.nodes.map((n) => { const p = GP(n.id); const dim = focusSet ? !focusSet.has(n.id) : false; return (
                <div key={n.id} onMouseDown={(e) => gdown(e, n.id)} onDoubleClick={() => { if (n.type === "agent" && n.ref) onOpenAgent?.(n.ref); else { setGsel(n.id); } }} className={`absolute w-[104px] cursor-grab rounded-lg border bg-tg-panel px-2 py-1 text-center text-[10px] active:cursor-grabbing ${gsel === n.id ? "ring-2 ring-white" : ""}`} style={{ left: p.x, top: p.y, borderColor: GCLR[n.type], opacity: dim ? 0.2 : 1 }}>
                  <div className="truncate font-bold" style={{ color: GCLR[n.type] }}>{n.label}</div><div className="text-tg-muted">{n.type}</div></div>); })}
            </div>
          </div>
          <div className="absolute bottom-3 right-3 h-24 w-40 overflow-hidden rounded-lg border border-tg-line bg-tg-panel/90"><svg width="160" height="96" viewBox="0 0 1200 700">{graph.edges.map(([a, b], i) => { const pa = GP(a), pb = GP(b); return <line key={i} x1={pa.x + 50} y1={pa.y + 16} x2={pb.x + 50} y2={pb.y + 16} stroke="rgba(62,166,255,.3)" strokeWidth={3} />; })}{graph.nodes.map((n) => { const p = GP(n.id); return <circle key={n.id} cx={p.x + 50} cy={p.y + 16} r={11} fill={GCLR[n.type]} />; })}</svg></div>
        </div>
        <aside className="overflow-auto border-l border-tg-line bg-[#17212b] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Node Inspector</div>
          {gsn ? (<div className="mt-2 space-y-1 text-xs"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: GCLR[gsn.type] }} /><b>{gsn.label}</b></div>
            <div className="text-tg-muted">Type: <b className="text-tg-text">{gsn.type}</b></div>
            <div className="text-tg-muted">Session: <b className="text-tg-text">{account?.name || "—"}</b></div>
            <div className="text-tg-muted">Owner Agent: <b className="text-tg-text">{account?.owner?.name || "—"}</b></div>
            <div className="text-tg-muted">Connected: <b className="text-tg-text">{gNeighbors(gsn.id).length}</b></div>
            <button onClick={() => setGfocus(gsn.id === gfocus ? "" : gsn.id)} className="mt-1 w-full rounded-lg bg-tg-bg px-3 py-1.5 text-[11px] ring-1 ring-tg-line">{gfocus === gsn.id ? "Clear Focus" : "Focus Connected"}</button>
            {gsn.type === "agent" && gsn.ref && onOpenAgent && <button onClick={() => onOpenAgent(gsn.ref!)} className="w-full rounded-lg bg-tg-active px-3 py-1.5 text-[11px] font-semibold text-white">Open Agent Workspace →</button>}
            <div className="mt-2 text-[10px] uppercase text-tg-accent">Connected ({gNeighbors(gsn.id).length})</div>
            <div className="flex flex-wrap gap-1 text-[11px]">{gNeighbors(gsn.id).slice(0, 12).map((id) => { const c = graph.nodes.find((x) => x.id === id); return <span key={id} className="rounded bg-tg-bg px-1.5 py-0.5" style={{ color: c ? GCLR[c.type] : "#888" }}>{c?.label || id}</span>; })}</div>
          </div>) : <div className="mt-2 text-tg-muted">Клик по узлу графа.</div>}
        </aside>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-[#0e1621] text-tg-text">
      <header className="flex items-center gap-3 border-b border-tg-line bg-[#17212b] px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Назад</button>
        <div className="font-black tracking-wide">📨 TELEGRAM WORKSPACE</div>
        <span className="flex items-center gap-1.5 rounded-full border border-tg-line bg-tg-bg px-2 py-0.5 text-[10px] font-bold"><span className="h-2 w-2 rounded-full" style={{ background: connClr }} />{connLbl}</span>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">READ-ONLY</span>
        {accounts.length > 0 && <select value={acc} onChange={(e) => setAcc(e.target.value)} className="ml-2 rounded-lg border border-tg-line bg-[#0e1621] px-2 py-1 text-xs">{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
        {/* stats strip */}
        <div className="ml-2 hidden flex-wrap gap-1 text-[10px] md:flex">{([["D", stats.dialogs], ["G", stats.groups], ["C", stats.channels], ["B", stats.bots], ["Ct", stats.contacts]] as const).map(([l, v]) => <span key={l} className="rounded bg-tg-bg px-1.5 py-0.5 text-tg-muted">{l} <b className="text-tg-text">{v}</b></span>)}</div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex overflow-hidden rounded-lg ring-1 ring-tg-line">
            <button onClick={() => setMode("client")} className={`px-3 py-1.5 text-xs font-semibold ${mode === "client" ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>Client</button>
            <button onClick={() => setMode("command")} className={`px-3 py-1.5 text-xs font-semibold ${mode === "command" ? "bg-cyan-600 text-white" : "bg-tg-bg text-tg-muted"}`}>🛰 Command Center</button>
          </div>
          <button onClick={() => { setPalette(true); setPq(""); }} className="rounded-lg border border-cyan-500/40 bg-cyan-600/15 px-3 py-1.5 text-xs font-semibold text-cyan-200">⌘K</button>
        </div>
      </header>

      {mode === "command" ? (
        <div className="grid min-h-0 flex-1 grid-cols-[180px_1fr]">
          <nav className="min-h-0 overflow-auto border-r border-tg-line bg-[#17212b] p-2">
            <div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Command Center</div>
            {CC_TABS.map((t) => (
              <button key={t} onClick={() => setCc(t)} className={`mb-0.5 w-full rounded-lg px-2.5 py-1.5 text-left text-sm capitalize ${cc === t ? "bg-cyan-600/30 text-white ring-1 ring-cyan-500/50" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>{t}</button>
            ))}
          </nav>
          <main className="min-h-0 overflow-auto bg-[#0e1621]"><CommandCenter /></main>
        </div>
      ) : (

      <div className="grid min-h-0 flex-1 grid-cols-[210px_320px_1fr_280px]">
        <nav className="min-h-0 overflow-auto border-r border-tg-line bg-[#17212b] p-2">
          {SECTIONS.map(([id, label]) => (
            <button key={id} onClick={() => setSection(id)} className={`mb-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm ${section === id ? "bg-tg-active/30 text-white ring-1 ring-tg-accent" : "text-tg-muted hover:bg-tg-bg/40 hover:text-white"}`}>
              <span>{label}</span>
              {id === "dialogs" && <span className="rounded-full bg-tg-bg px-1.5 text-[10px]">{stats.dialogs}</span>}
              {id === "groups" && <span className="rounded-full bg-tg-bg px-1.5 text-[10px]">{stats.groups}</span>}
              {id === "channels" && <span className="rounded-full bg-tg-bg px-1.5 text-[10px]">{stats.channels}</span>}
              {id === "bots" && <span className="rounded-full bg-tg-bg px-1.5 text-[10px]">{stats.bots}</span>}
              {id === "contacts" && <span className="rounded-full bg-tg-bg px-1.5 text-[10px]">{stats.contacts}</span>}
              {id === "sessions" && <span className="rounded-full bg-tg-bg px-1.5 text-[10px]">{accounts.length}</span>}
            </button>
          ))}
        </nav>

        <section className="flex min-h-0 flex-col border-r border-tg-line bg-[#0e1621]">
          <div className="border-b border-tg-line p-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск…" className="w-full rounded-lg bg-[#17212b] px-3 py-1.5 text-sm outline-none" />
            {(section === "dialogs") && <div className="mt-1.5 flex flex-wrap gap-1">{FILTERS.map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-2 py-0.5 text-[10px] ${filter === f ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted"}`}>{f}</button>)}</div>}
          </div>
          <div className="min-h-0 flex-1 overflow-auto"><Center /></div>
        </section>

        <section className="flex min-h-0 flex-col bg-[#0e1621]" style={{ backgroundImage: "radial-gradient(circle at 50% 0,rgba(34,46,61,.6),transparent 60%)" }}>
          {selChat ? (
            <>
              <div className="flex items-center gap-2.5 border-b border-tg-line bg-[#17212b] px-4 py-2"><Avatar name={selChat.title || "chat"} size={38} />
                <div><div className="text-sm font-semibold">{selChat.title || "chat"}</div><div className="text-[11px] text-tg-muted">{cat(selChat)}{selChat.memberCount ? " · " + selChat.memberCount : ""} · read-only</div></div>
                <div className="ml-auto flex gap-2 text-tg-muted"><span>🔍</span><span>📌</span><span>🖼</span></div>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-auto p-4">
                {preview(selChat) ? (
                  <div className="flex justify-start"><div className="max-w-[70%] rounded-2xl bg-[#182533] px-3 py-1.5 text-sm">{preview(selChat)}<div className="mt-0.5 text-[10px] text-tg-muted">последнее сообщение</div></div></div>
                ) : <div className="mx-auto mt-8 text-sm text-tg-muted">История сообщений недоступна в read-only режиме.</div>}
                <div className="mx-auto w-fit rounded-full bg-tg-bg/60 px-3 py-0.5 text-[10px] text-tg-muted">Read-only · полная история не загружается</div>
              </div>
              <div className="flex items-center gap-2 border-t border-tg-line bg-[#17212b] px-3 py-2">
                <span className="text-tg-muted">📎</span>
                <input disabled placeholder="Отправка отключена — read-only workspace" className="flex-1 rounded-lg bg-[#0e1621] px-3 py-1.5 text-sm text-tg-muted outline-none" />
                <span className="text-tg-muted">🎤</span>
              </div>
            </>
          ) : <div className="flex flex-1 items-center justify-center text-tg-muted">{loading ? "Синхронизация…" : "Выбери чат · группу · канал · бота"}</div>}
        </section>

        <aside className="min-h-0 overflow-auto border-l border-tg-line bg-[#17212b] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Agent Integration</div>
          {ownerAgent ? (
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center gap-2"><Avatar name={ownerAgent.name} size={34} /><div><div className="text-sm font-bold">{ownerAgent.name}</div><div className="text-[11px] text-tg-muted">{ownerAgent.role}</div></div></div>
              <div className="text-tg-muted">Mission: <b className="text-tg-text">{ownerMissions[0]?.title || "—"}</b></div>
              <div className="text-tg-muted">Goals: <b className="text-tg-text">{ownerAgent.goals?.length || 0}</b> · Tasks: <b className="text-tg-text">{ownerAgent.tasks?.length || ctx.exec?.filter((e) => e.agentId === ownerAgent.id).length || 0}</b></div>
              <div className="text-tg-muted">Models: <b className="text-tg-text">{ownerAgent.model || "—"}</b></div>
              <div className="text-tg-muted">Services: <b className="text-tg-text">{(ownerAgent.integrations || []).join(", ") || "—"}</b></div>
              <div className="text-tg-muted">Memory: <b className="text-tg-text">{(ownerAgent.shortMem?.length || 0) + (ownerAgent.longMem?.length || 0)}</b> · Knowledge: <b className="text-tg-text">{ownerAgent.knowledge?.length || 0}</b></div>
              {onOpenAgent && <button onClick={() => onOpenAgent(ownerAgent.id)} className="mt-1 w-full rounded-lg bg-tg-active px-3 py-2 text-xs font-semibold text-white">Open Agent Workspace →</button>}
            </div>
          ) : <div className="mt-2 text-xs text-tg-muted">Аккаунт не привязан к агенту.</div>}
          <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Session</div>
          {account ? (
            <div className="mt-1 space-y-0.5 text-xs text-tg-muted">
              <div>Account: <b className="text-tg-text">{account.name}</b></div>
              <div>Phone: <b className="text-tg-text">{account.phone}</b></div>
              <div>Connection: <b style={{ color: connClr }}>{connLbl}</b></div>
              <div>Device: <b className="text-tg-text">{account.device}</b></div>
            </div>
          ) : <div className="mt-1 text-xs text-tg-muted">Нет активной сессии.</div>}
          <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Stats</div>
          <div className="mt-1 grid grid-cols-3 gap-1 text-[11px]">{([["Dialogs", stats.dialogs], ["Groups", stats.groups], ["Channels", stats.channels], ["Bots", stats.bots], ["Contacts", stats.contacts], ["Unread", stats.unread]] as const).map(([l, v]) => <div key={l} className="rounded bg-tg-bg/50 px-1.5 py-1"><div className="text-tg-muted">{l}</div><b>{v}</b></div>)}</div>
        </aside>
      </div>
      )}

      {palette && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 pt-24" onMouseDown={() => setPalette(false)}>
          <div className="w-[540px] max-w-[92vw] overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#17212b] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <input autoFocus value={pq} onChange={(e) => setPq(e.target.value)} placeholder="Команда или поиск по чатам…" className="w-full border-b border-tg-line bg-[#0e1621] px-4 py-3 text-sm outline-none" />
            <div className="max-h-[52vh] overflow-auto p-2">
              {palCommands.length > 0 && <div className="px-2 py-1 text-[10px] font-bold uppercase text-tg-muted">Commands</div>}
              {palCommands.map((c) => <button key={c.id} onClick={() => { c.run(); setPalette(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-tg-bg/60"><span className="text-cyan-300">⌁</span>{c.label}</button>)}
              {palNodes.length > 0 && <div className="px-2 py-1 pt-2 text-[10px] font-bold uppercase text-tg-muted">Chats ({palNodes.length})</div>}
              {palNodes.map((n) => <button key={n.id} onClick={() => { setChat(n.id); setPalette(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-tg-bg/60"><Avatar name={n.title || "chat"} size={22} />{n.title || "chat"}</button>)}
              {pq && palCommands.length === 0 && palNodes.length === 0 && <div className="px-3 py-3 text-sm text-tg-muted">Ничего не найдено.</div>}
            </div>
            <div className="border-t border-tg-line px-3 py-1.5 text-[10px] text-tg-muted">Esc — закрыть · ⌘K — переключить</div>
          </div>
        </div>
      )}
    </div>
  );
}

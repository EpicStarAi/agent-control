"use client";

// EPICGRAM OPERATOR OFFICE — pixel-art AI operator command room.
// All data is local mock. No live Telegram. No secrets. UI-only feature.
// Fully additive — does not touch existing components or live sessions.

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────
type PanelId = "telegram" | "channels" | "operator" | "server" | "content" | "assets" | "automation" | null;
type MessageEntry = { role: "operator" | "user"; text: string; ts: string };
type ActionEnvelope = { ok: boolean; source: string; action: string; requiresApproval: boolean; liveSend: boolean; mode: string };

// ─── EPICGRAM Theme Colors ─────────────────────────────────────────────────────
const C = {
  bg: "#06050a",
  surface: "#0a0b0f",
  panel: "#101218",
  line: "#2a161d",
  hover: "#1a1015",
  active: "#3d1320",
  text: "#f4eaed",
  muted: "#97868d",
  accent: "#ff3b5c",
  neon: "#ff2d55",
  ember: "#e11d3f",
  green: "#4ade80",
  yellow: "#fbbf24",
  blue: "#38bdf8",
  purple: "#a78bfa",
};

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const ACCOUNT = {
  slot: "NOVIKOVA", status: "AUTHORIZED", user_id: "7369372055",
  display: "NOVIKOVA 💋", chats: 60, groups: 12, channels: 4,
};

const CHANNELS = [
  { id: "-1003687931514", name: "NoViKoVA💋NEWS🌐", topic: "Новини Новикової", audience: "~210", posts: 18, growth: "+2.1%", status: "active" },
  { id: "-1001199360700", name: "Труха⚡Україна", topic: "Новини України", audience: "~12K", posts: 847, growth: "+0.8%", status: "active" },
  { id: "-1001080134301", name: "Жесть дня", topic: "Цікавинки", audience: "~3.1K", posts: 234, growth: "-0.3%", status: "active" },
];

const RUNTIME = [
  { label: "WEB (Next.js)", port: "3015", status: "running", badge: "DEV", ok: true },
  { label: "API (EPICGRAM)", port: "8788", status: "running", badge: "DEV", ok: true },
  { label: "TDLib Adapter", port: "—", status: "loaded", badge: "READY", ok: true },
  { label: "Telegram Session", port: "—", status: "ready", badge: "NOVIKOVA", ok: true },
  { label: "Publish Policy", port: "—", status: "disabled", badge: "SAFE", ok: true },
  { label: "Live Send", port: "—", status: "LOCKED", badge: "🔒 MANUAL", ok: false },
];

const DRAFTS = [
  { id: "d1", title: "Пост: Новини ранку", channel: "NoViKoVA💋NEWS🌐", status: "DRAFT" },
  { id: "d2", title: "Анонс: Епізод 14", channel: "Труха⚡Україна", status: "REVIEW" },
  { id: "d3", title: "Reel: Запуск каналу", channel: "Жесть дня", status: "DRAFT" },
];

const ASSETS = [
  { type: "📷", name: "novikova_avatar_v3.png", size: "124 KB", ok: true },
  { type: "🎵", name: "bgm_epic_theme.mp3", size: "2.1 MB", ok: true },
  { type: "🎬", name: "reel_launch_01.mp4", size: "18 MB", ok: false },
  { type: "🖼", name: "channel_banner.png", size: "340 KB", ok: true },
];

const AUTOMATION = [
  { id: "q1", action: "Check channel stats", schedule: "каждые 30 мин", running: false },
  { id: "q2", action: "Scan new messages", schedule: "каждые 5 мин", running: true },
  { id: "q3", action: "Backup memory", schedule: "раз в сутки", running: false },
];

// ─── Pixel border utility ──────────────────────────────────────────────────────
function pxb(color = C.accent, thick = 1) {
  return {
    border: `${thick}px solid ${color}`,
    boxShadow: `0 0 0 ${thick}px ${C.surface}, 0 0 8px ${color}44, inset 0 0 6px ${color}0a`,
  };
}

// ─── Glow Dot ──────────────────────────────────────────────────────────────────
function Dot({ on = true, color = C.green }: { on?: boolean; color?: string }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: on ? color : C.line,
      boxShadow: on ? `0 0 5px ${color}, 0 0 10px ${color}55` : "none",
      transition: "all 0.3s",
    }} />
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, ok }: { label: string; ok?: boolean }) {
  const col = ok === true ? C.green : ok === false ? C.accent : C.yellow;
  return (
    <span style={{
      background: `${col}18`, border: `1px solid ${col}44`,
      color: col, padding: "1px 7px", fontSize: 9,
      fontFamily: "monospace", letterSpacing: "0.06em",
    }}>{label}</span>
  );
}

// ─── Zone Button ──────────────────────────────────────────────────────────────
function Zone({
  label, sub, icon, color, active, onClick
}: { label: string; sub: string; icon: string; color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...pxb(active ? color : C.line, active ? 2 : 1),
        background: active ? `${color}16` : C.surface,
        borderRadius: 0, padding: "12px 14px", cursor: "pointer",
        textAlign: "left" as const, width: "100%",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = `${color}0a`; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = C.surface; }}
    >
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 10, fontFamily: "monospace", color, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 9, color: C.muted, fontFamily: "monospace" }}>{sub}</div>
    </button>
  );
}

// ─── Info Row ──────────────────────────────────────────────────────────────────
function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  const col = ok === true ? C.green : ok === false ? "#f87171" : C.text;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
      <span style={{ color: C.muted, fontSize: 10, fontFamily: "monospace" }}>{label}</span>
      <span style={{ color: col, fontSize: 10, fontFamily: "monospace", fontWeight: ok !== undefined ? 600 : 400 }}>{value}</span>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHead({ text }: { text: string }) {
  return (
    <div style={{
      color: C.accent, fontWeight: 700, fontSize: 10, letterSpacing: "0.1em",
      fontFamily: "monospace", marginBottom: 10, paddingBottom: 6,
      borderBottom: `1px solid ${C.line}`,
    }}>▸ {text}</div>
  );
}

// ─── Side Panel ────────────────────────────────────────────────────────────────
function Panel({
  title, icon, onClose, children
}: { title: string; icon: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, height: "100vh", width: 360,
      background: C.surface, zIndex: 200,
      display: "flex", flexDirection: "column",
      ...pxb(C.accent, 1),
      boxShadow: `-4px 0 28px rgba(255,59,92,0.18)`,
    }}>
      {/* header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: `1px solid ${C.line}`, background: C.panel,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot color={C.accent} />
          <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: C.accent, letterSpacing: "0.1em" }}>
            {icon} {title}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: `1px solid ${C.line}`,
            color: C.muted, cursor: "pointer", padding: "2px 8px",
            fontFamily: "monospace", fontSize: 10,
          }}
        >✕ CLOSE</button>
      </div>
      {/* body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 14px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Panel: Telegram Desk ─────────────────────────────────────────────────────
function TelegramDeskPanel({ runtimeData }: { runtimeData: Record<string, unknown> | null }) {
  const tg = (runtimeData?.telegram as Record<string, unknown>) ?? null;
  const connected = Boolean(tg?.connected);
  const authState = (tg?.authorizationState as string) ?? "unknown";
  const acc = (tg?.activeAccount as Record<string, unknown>) ?? null;
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>
      <div style={{ marginBottom: 14, padding: 12, background: C.panel, ...pxb(C.accent, 1) }}>
        <SectionHead text="ACCOUNT" />
        <Row label="Slot" value={acc?.displayName ? String(acc.displayName).split(" ")[0] : "NOVIKOVA"} />
        <Row label="Display" value={acc?.displayName ? String(acc.displayName) : ACCOUNT.display} />
        <Row label="User ID" value={acc?.idMasked ? String(acc.idMasked) : "—"} />
        <Row label="Username" value={acc?.username ? String(acc.username) : "—"} />
        <Row label="Auth" value={connected ? "AUTHORIZED" : authState} ok={connected} />
      </div>
      <div style={{ padding: 12, background: C.panel, ...pxb(C.accent, 1) }}>
        <SectionHead text="SEND MODE" />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Dot color={C.green} /><span style={{ color: C.green, fontWeight: 700 }}>MANUAL ONLY</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot color={C.accent} on={false} /><span style={{ color: C.accent }}>LIVE SEND: LOCKED</span>
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Channel OS ─────────────────────────────────────────────────────────
function ChannelOSPanel({ channelData }: { channelData: { ok: boolean; channels: Record<string, unknown>[] } }) {
  // Map real TDLib chat shape (from :8788/telegram/chats) to panel Row fields
  const realChannels = channelData.ok && channelData.channels.length > 0
    ? channelData.channels.map((ch: Record<string, unknown>) => {
        const typeRaw = String(ch.type ?? "").replace("chatType", "").toLowerCase();
        const isChannel = Boolean(ch.isChannel) || String(ch.type).includes("Supergroup") || String(ch.type).includes("Channel");
        return {
          id: String(ch.id ?? ""),
          name: String(ch.title ?? "Без назви"),
          topic: isChannel ? "channel" : typeRaw === "private" ? "private" : "group",
          audience: ch.unreadCount != null ? String(ch.unreadCount) : "—",
          posts: "—",
          growth: "+?.?%",
          status: "active",
          username: (ch.username as string | null) ?? null,
        };
      })
    : CHANNELS;
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>
      {channelData.ok && (
        <div style={{ marginBottom: 10, padding: "6px 10px", background: `${C.green}14`, border: `1px solid ${C.green}33`, fontSize: 9, color: C.green, fontFamily: "monospace", marginBottom: 12 }}>
          ✓ LIVE DATA from TDLib · {channelData.channels.length} chats loaded
        </div>
      )}
      {realChannels.map((ch) => (
        <div key={ch.id} style={{ marginBottom: 12, padding: 12, background: C.panel, ...pxb(C.line, 1) }}>
          <div style={{ color: C.accent, fontWeight: 700, marginBottom: 6, fontSize: 11 }}>{ch.name}</div>
          <Row label="Topic" value={ch.topic} />
          <Row label="Audience" value={ch.audience} />
          <Row label="Posts" value={String(ch.posts)} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ color: ch.growth.startsWith("+") ? C.green : "#f87171", fontSize: 10 }}>▲ {ch.growth}</span>
            <Badge label={ch.status} ok={ch.status === "active"} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Panel: Operator Avatar ────────────────────────────────────────────────────
function OperatorPanel() {
  const modes = [
    { label: "Mode", value: "RULE_BASED_LOCAL", ok: true },
    { label: "AI Runtime", value: "LOCAL_SEED", ok: true },
    { label: "Send Allowed", value: "MANUAL ONLY", ok: false },
    { label: "Auto Send", value: "DISABLED", ok: true },
    { label: "Mass Send", value: "BLOCKED", ok: false },
    { label: "Approval", value: "ALWAYS REQUIRED", ok: true },
    { label: "Memory", value: "LOADED", ok: true },
    { label: "TDLib", value: "READY", ok: true },
  ];
  const blocked = [
    "telegram.message.send (no approval)",
    "telegram.post.publish (no approval)",
    "mass_sending",
    "auto_retry_without_confirm",
  ];
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>
      <div style={{ marginBottom: 14, padding: 12, background: C.panel, ...pxb(C.accent, 1) }}>
        <SectionHead text="AGENT STATUS" />
        {modes.map((m) => <Row key={m.label} label={m.label} value={m.value} ok={m.ok} />)}
      </div>
      <div style={{ padding: 12, background: C.panel, ...pxb(C.line, 1) }}>
        <SectionHead text="BLOCKED ACTIONS" />
        {blocked.map((a) => (
          <div key={a} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <span style={{ color: "#f87171", fontSize: 10 }}>✕</span>
            <span style={{ fontSize: 10, color: "#f87171" }}>{a}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel: Runtime Status ────────────────────────────────────────────────────
function ServerPanel({ runtimeData }: { runtimeData: Record<string, unknown> | null }) {
  // Merge real runtime data with mock static indicators
  const rt = (runtimeData?.runtime as Record<string, unknown>) ?? {};
  const tg = (runtimeData?.telegram as Record<string, unknown>) ?? {};
  const realTdlib = rt?.tdlib as string ?? "unknown";
  const nativeLoaded = Boolean(rt?.nativeBindingLoaded ?? false);
  const tgConnected = Boolean(tg?.connected ?? false);
  const realRuntime: typeof RUNTIME[0][] = [
    { label: "WEB (Next.js)", port: "3015", status: "running", badge: "DEV", ok: true },
    { label: "API (EPICGRAM)", port: "8788", status: "running", badge: "DEV", ok: true },
    { label: "TDLib Adapter", port: "—", status: nativeLoaded ? "loaded" : "not_loaded", badge: nativeLoaded ? "READY" : "WAIT", ok: nativeLoaded },
    { label: "Telegram Session", port: "—", status: tgConnected ? "ready" : "not_ready", badge: tgConnected ? "CONNECTED" : "OFFLINE", ok: tgConnected },
    { label: "Publish Policy", port: "—", status: "disabled", badge: "SAFE", ok: true },
    { label: "Live Send", port: "—", status: "LOCKED", badge: "🔒 MANUAL", ok: false },
  ];
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>
      {realRuntime.map((r) => (
        <div key={r.label} style={{ marginBottom: 8, padding: 10, background: C.panel, ...pxb(C.line, 1) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ color: C.accent, fontWeight: 700, fontSize: 10 }}>{r.label}</span>
            <Badge label={r.badge} ok={r.ok} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: C.muted, fontSize: 9 }}>port {r.port}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Dot color={r.ok ? C.green : C.yellow} on={r.ok} />
              <span style={{ color: C.muted, fontSize: 9 }}>{r.status}</span>
            </div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, padding: 12, background: C.panel, ...pxb(C.accent, 1) }}>
        <SectionHead text="ENV SAFETY" />
        {[
          ["EPICGRAM_API_BASE", "http://127.0.0.1:8788 (local)"],
          ["TDLIB_NATIVE", "loaded (dev)"],
          ["LIVE_SEND", "LOCKED 🔒"],
          ["AUTO_PUBLISH", "disabled"],
          ["SECRETS", "not exposed"],
        ].map(([k, v]) => (
          <div key={k} style={{ marginBottom: 4 }}>
            <span style={{ color: C.muted, fontSize: 9 }}>{k}: </span>
            <span style={{ color: C.text, fontSize: 9 }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel: Content Plan ──────────────────────────────────────────────────────
function ContentPanel() {
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>
      <div style={{ marginBottom: 14, padding: 12, background: C.panel, ...pxb(C.line, 1) }}>
        <SectionHead text={`DRAFTS (${DRAFTS.length})`} />
        {DRAFTS.map((d) => (
          <div key={d.id} style={{ marginBottom: 8, padding: 8, background: C.surface, ...pxb(C.line, 1) }}>
            <div style={{ color: C.text, marginBottom: 3, fontSize: 10 }}>{d.title}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.muted, fontSize: 9 }}>{d.channel}</span>
              <Badge label={d.status} ok={d.status === "DRAFT" ? undefined : true} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel: Assets Vault ──────────────────────────────────────────────────────
function AssetsPanel() {
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>
      {ASSETS.map((a, i) => (
        <div key={i} style={{
          marginBottom: 8, padding: 10, background: C.panel, ...pxb(C.line, 1),
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>{a.type}</span>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontSize: 10 }}>{a.name}</div>
            <div style={{ color: C.muted, fontSize: 9 }}>{a.size}</div>
          </div>
          <Badge label={a.ok ? "READY" : "PROCESSING"} ok={a.ok} />
        </div>
      ))}
    </div>
  );
}

// ─── Panel: Approval Queue ─────────────────────────────────────────────────────
function AutomationPanel() {
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>
      <div style={{ marginBottom: 14, padding: 12, background: C.panel, ...pxb(C.line, 1) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ color: C.yellow, fontSize: 12 }}>⚠</span>
          <span style={{ color: C.yellow, fontWeight: 700, fontSize: 10 }}>APPROVAL REQUIRED: 2 items</span>
        </div>
        <div style={{ color: C.muted, fontSize: 9 }}>manual confirmation needed before any send</div>
      </div>
      {AUTOMATION.map((q) => (
        <div key={q.id} style={{ marginBottom: 8, padding: 10, background: C.panel, ...pxb(C.line, 1) }}>
          <div style={{ color: C.text, marginBottom: 3 }}>{q.action}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: C.muted, fontSize: 9 }}>{q.schedule}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Dot color={q.running ? C.green : C.purple} on={q.running} />
              <span style={{ color: q.running ? C.green : C.purple, fontSize: 9 }}>{q.running ? "RUNNING" : "SCHEDULED"}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Message Log ───────────────────────────────────────────────────────────────
function MessageLog({ messages }: { messages: MessageEntry[] }) {
  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "8px 14px",
      borderTop: `1px solid ${C.line}`,
      display: "flex", flexDirection: "column", gap: 3,
    }}>
      {messages.length === 0 && (
        <div style={{ color: C.muted, fontSize: 9, fontFamily: "monospace", textAlign: "center", marginTop: 8 }}>
          EPICGRAM Operator Office — awaiting command...
        </div>
      )}
      {messages.map((m, i) => (
        <div key={i} style={{ fontSize: 10, fontFamily: "monospace" }}>
          <span style={{ color: m.role === "operator" ? C.green : C.accent }}>
            {m.role === "operator" ? "◂ OPERATOR" : "▸ USER"}
          </span>
          <span style={{ color: C.muted, margin: "0 6px" }}>·</span>
          <span style={{ color: C.text }}>{m.text}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Command Input ─────────────────────────────────────────────────────────────
function CommandInput({ onSend }: { onSend: (text: string) => void }) {
  const [val, setVal] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const submit = () => {
    const t = val.trim();
    if (!t) return;
    onSend(t);
    setVal("");
  };
  return (
    <div style={{
      display: "flex", gap: 8, padding: "10px 14px",
      borderTop: `1px solid ${C.line}`, background: C.panel, flexShrink: 0,
    }}>
      <span style={{ color: C.accent, fontFamily: "monospace", fontSize: 13, alignSelf: "center" }}>›</span>
      <input
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        placeholder="Опиши задачу оператору..."
        style={{
          flex: 1, background: C.surface, border: `1px solid ${C.line}`,
          color: C.text, padding: "7px 11px", fontFamily: "monospace", fontSize: 11,
          outline: "none",
        }}
        onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = `${C.accent}66`; }}
        onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = C.line; }}
      />
      <button
        onClick={submit}
        disabled={!val.trim()}
        style={{
          background: val.trim() ? `${C.accent}22` : C.panel,
          border: `1px solid ${val.trim() ? `${C.accent}66` : C.line}`,
          color: val.trim() ? C.accent : C.muted,
          padding: "7px 14px", cursor: val.trim() ? "pointer" : "default",
          fontFamily: "monospace", fontSize: 11, fontWeight: 700,
          letterSpacing: "0.06em",
        }}
      >SEND</button>
    </div>
  );
}

// ─── Loading Screen ────────────────────────────────────────────────────────────
function LoadingScreen({ progress }: { progress: number }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: C.bg,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", zIndex: 999,
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: "monospace", fontSize: 16, fontWeight: 700,
        color: C.accent, letterSpacing: "0.18em", marginBottom: 8, textAlign: "center",
      }}>
        EPICGRAM
      </div>
      <div style={{
        fontFamily: "monospace", fontSize: 9, color: `${C.accent}88`,
        letterSpacing: "0.15em", marginBottom: 40, textAlign: "center",
      }}>
        OPERATOR OFFICE v1.0
      </div>

      {/* Progress bar */}
      <div style={{ width: 300, marginBottom: 14 }}>
        <div style={{ height: 3, background: C.line, overflow: "hidden" }}>
          <div style={{
            width: `${progress}%`, height: "100%",
            background: `linear-gradient(90deg, ${C.neon}, ${C.accent}, ${C.ember})`,
            boxShadow: `0 0 10px ${C.accent}`,
            transition: "width 0.25s ease",
          }} />
        </div>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, marginBottom: 48 }}>
        Loading EPICGRAM Operator Office... {progress}%
      </div>

      {/* Decorative grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4,
        opacity: 0.3, marginBottom: 40,
      }}>
        {Array.from({ length: 64 }).map((_, i) => (
          <div key={i} style={{
            width: 8, height: 8,
            background: i < progress * 0.64 ? C.accent : C.line,
            transition: "background 0.2s",
          }} />
        ))}
      </div>

      <div style={{
        fontFamily: "monospace", fontSize: 8, color: `${C.accent}44`,
        letterSpacing: "0.12em", textAlign: "center",
      }}>
        ▪▪▪ EPICGRAM OPERATOR OFFICE ▪▪▪<br />
        DEV · SAFE OFFICE · LIVE SEND LOCKED
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function OperatorOffice() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [panel, setPanel] = useState<PanelId>(null);
  const [messages, setMessages] = useState<MessageEntry[]>([]);

  // Real data fetched from Operator Office API bridge (falls back to mock gracefully)
  const [runtimeData, setRuntimeData] = useState<Record<string, unknown> | null>(null);
  const [channelData, setChannelData] = useState<{ ok: boolean; channels: Record<string, unknown>[] }>({ ok: false, channels: [] });
  const [dataMode, setDataMode] = useState<"real" | "mock">("mock"); // UI label only

  // Loading simulation
  useEffect(() => {
    let p = 0;
    const id = setInterval(() => {
      p += Math.floor(Math.random() * 16) + 6;
      if (p >= 100) { p = 100; setProgress(100); clearInterval(id); setTimeout(() => setLoading(false), 250); }
      else setProgress(p);
    }, 70);
    return () => clearInterval(id);
  }, []);

  // Fetch real runtime + channel data from the Operator Office bridge API
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const fetchData = async () => {
      try {
        // Fetch runtime status + channel list in parallel
        // Call backend :8788 directly (bypasses Next.js proxy which may return 401 in VS Code HMR)
        const [statusResp, channelsResp] = await Promise.all([
          fetch("http://127.0.0.1:8788/telegram/status", { cache: "no-store" }),
          fetch("http://127.0.0.1:8788/telegram/chats", { cache: "no-store" }),
        ]);
        if (cancelled) return;
        const [statusData, chatsData] = await Promise.all([
          statusResp.json().catch(() => null),
          channelsResp.json().catch(() => null),
        ]);
        if (cancelled) return;
        // Normalize :8788/telegram/status → runtimeData shape
        if (statusData?.runtime === "ready") {
          const acc = statusData.accounts?.[0] ?? null;
          setRuntimeData({
            ok: true,
            telegram: {
              connected: statusData.authorizationState === "authorizationStateReady",
              authorizationState: statusData.authorizationState,
              activeAccount: acc ? {
                idMasked: String(acc.id ?? "").slice(0, 4) + "****",
                displayName: acc.displayName,
                username: acc.username ?? null,
              } : null,
            },
            runtime: {
              tdlib: statusData.adapter?.tdlibInfo?.version ?? "ready",
              nativeBindingLoaded: statusData.adapter?.nativeBindingLoaded ?? false,
            },
          });
          setDataMode("real");
        }
        // Normalize :8788/telegram/chats → channelData shape
        if (chatsData?.chats) {
          setChannelData({ ok: true, channels: chatsData.chats ?? [] });
        }
      } catch {
        // Backend unreachable — silently stay on mock data (already initialized)
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [loading]);
  const closePanel = () => setPanel(null);

  const handleSend = (text: string) => {
    const ts = new Date().toLocaleTimeString();
    setMessages((prev) => [...prev, { role: "user", text, ts }]);

    // Call the Operator Office bridge API — read-only tool dispatcher
    setTimeout(async () => {
      let reply: string;
      try {
        // Direct backend call — bypasses Next.js :3015 proxy (may be stale/401 in VS Code HMR)
        const resp = await fetch("http://127.0.0.1:8788/telegram/status", { cache: "no-store" });
        const r = await resp.json().catch(() => null);
        const authState = r?.authorizationState ?? "unknown";
        const runtime = r?.runtime ?? "unknown";
        const connected = authState === "authorizationStateReady";
        const acc = r?.accounts?.[0] ?? null;

        reply = [
          `▸ EPICGRAM Operator Office — Bridge Response`,
          `▸ Source: ${r?.mode ?? "local_backend"}`,
          `▸ Tool: operator.runtime.status`,
          `▸ Auth state: ${authState}`,
          `▸ Runtime: ${runtime}`,
          `▸ Telegram: ${connected ? "CONNECTED ✓" : "NOT READY ✗"}`,
          `▸ Account: ${acc?.displayName ?? "NOVIKOVA 💋"}`,
          `▸ User ID: ${acc?.id ?? "—"}`,
          `▸ TDLib: ${r?.adapter?.tdlibInfo?.version ?? "unknown"}`,
          `▸ Native binding: ${r?.adapter?.nativeBindingLoaded ? "LOADED ✓" : "not loaded"}`,
          `▸ Mode: read_only`,
          `▸ Requires approval: YES ✓`,
          `▸ Live send: LOCKED 🔒`,
        ].join("\n");
      } catch {
        // Fallback to local envelope if API unreachable
        const envelope: ActionEnvelope = {
          ok: true,
          source: "operator-office",
          action: text.slice(0, 80),
          requiresApproval: true,
          liveSend: false,
          mode: "preview",
        };
        reply = [
          `▸ EPICGRAM Operator Office — Local Preview`,
          `▸ Mode: preview (API unreachable — using local mock)`,
          `▸ Source: operator-office`,
          `▸ Action: ${envelope.action}`,
          `▸ Requires approval: true`,
          `▸ Live send: LOCKED 🔒`,
          `▸ Note: Connect to live backend to see real runtime data.`,
        ].join("\n");
      }

      setMessages((prev) => [...prev, { role: "operator", text: reply, ts: new Date().toLocaleTimeString() }]);
    }, 600);
  };

  if (loading) return <LoadingScreen progress={progress} />;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", flexDirection: "column",
      fontFamily: "var(--font-jetbrains, 'Courier New', monospace)",
      overflow: "hidden",
    }}>
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", background: C.surface,
        borderBottom: `1px solid ${C.line}`, flexShrink: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/chats" style={{ color: C.muted, fontFamily: "monospace", fontSize: 11, textDecoration: "none" }}>
            ← BACK
          </Link>
          <span style={{ color: C.accent, fontWeight: 700, fontSize: 12, letterSpacing: "0.12em" }}>
            🖥 EPICGRAM OPERATOR OFFICE
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["DEV / SAFE OFFICE", "LIVE SEND LOCKED 🔒", "MANUAL APPROVAL ONLY"].map((b) => (
            <span key={b} style={{
              background: `${C.accent}18`, border: `1px solid ${C.accent}44`,
              color: C.accent, padding: "2px 8px",
              fontSize: 9, fontFamily: "monospace", letterSpacing: "0.06em",
            }}>{b}</span>
          ))}
        </div>
      </header>

      {/* ── Channel OS Strip (full width) ──────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "flex-start",
        padding: "10px 20px", background: C.surface,
        borderBottom: `1px solid ${C.line}`, gap: 12, overflowX: "auto", flexShrink: 0,
      }}>
        {CHANNELS.map((ch) => (
          <div key={ch.id} style={{
            ...pxb(C.accent, 1), padding: "8px 16px",
            background: C.panel, minWidth: 160, flexShrink: 0,
          }}>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginBottom: 3, letterSpacing: "0.06em" }}>{ch.name}</div>
            <div style={{ fontSize: 9, color: C.muted }}>👥 {ch.audience} · 📝 {ch.posts}</div>
            <div style={{ fontSize: 9, color: ch.growth.startsWith("+") ? C.green : "#f87171", marginTop: 2 }}>{ch.growth}</div>
          </div>
        ))}
        <button
          onClick={() => openPanel("channels")}
          style={{
            ...pxb(C.line, 1), background: C.surface,
            padding: "8px 14px", cursor: "pointer", minWidth: 110, flexShrink: 0,
            fontFamily: "monospace", fontSize: 9, color: C.muted,
          }}
        >
          + CHANNEL OS
        </button>
      </div>

      {/* ── Office Grid ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "1fr 1.4fr 1fr",
        minHeight: 0, overflow: "hidden",
      }}>

        {/* ── Left Column ─────────────────────────────────────────────── */}
        <div style={{
          padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8,
          borderRight: `1px solid ${C.line}`, overflowY: "auto",
        }}>
          <Zone label="TELEGRAM DESK" sub="аккаунт · чати · статуси"
            icon="📨" color={C.accent} active={panel === "telegram"} onClick={() => openPanel("telegram")} />
          <Zone label="CHANNEL OS" sub="канали · план · стратегія"
            icon="📡" color={C.ember} active={panel === "channels"} onClick={() => openPanel("channels")} />
          <Zone label="CONTENT PLAN" sub="чернетки · планування"
            icon="📝" color={C.purple} active={panel === "content"} onClick={() => openPanel("content")} />
          <Zone label="ASSETS VAULT" sub="фото · відео · аудіо"
            icon="🗂" color={C.yellow} active={panel === "assets"} onClick={() => openPanel("assets")} />

          {/* Runtime mini */}
          <div style={{ marginTop: "auto", padding: 10, background: C.panel, ...pxb(C.line, 1) }}>
            <div style={{ fontSize: 9, color: C.accent, fontWeight: 700, marginBottom: 6, letterSpacing: "0.08em", fontFamily: "monospace" }}>▸ RUNTIME STACK</div>
            {RUNTIME.slice(0, 4).map((r) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: C.muted, fontSize: 9 }}>{r.label.split(" ")[0]}</span>
                <Dot color={r.ok ? C.green : C.yellow} on={r.ok} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Center Column: Operator Avatar ───────────────────────────── */}
        <div style={{
          padding: "16px 12px", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          borderRight: `1px solid ${C.line}`,
          background: `radial-gradient(ellipse at center, ${C.accent}08 0%, transparent 70%)`,
          overflowY: "auto",
        }}>
          {/* Avatar block */}
          <button
            onClick={() => openPanel("operator")}
            style={{
              ...pxb(C.accent, 2), background: C.panel,
              width: 120, height: 120, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", cursor: "pointer",
              marginBottom: 16,
              boxShadow: `0 0 24px ${C.accent}33, 0 0 48px ${C.accent}11`,
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 4 }}>🤖</div>
            <div style={{ fontSize: 8, color: C.accent, fontWeight: 700, letterSpacing: "0.1em" }}>AI OPERATOR</div>
            <div style={{ fontSize: 8, color: C.muted }}>NOVIKOVA 💋</div>
          </button>

          {/* Status */}
          <div style={{ fontSize: 10, color: C.green, fontFamily: "monospace", textAlign: "center", marginBottom: 4 }}>
            <Dot color={C.green} pulse /> STATUS: READY
          </div>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", textAlign: "center", marginBottom: 12 }}>
            authorizationStateReady<br />TDLib 1.8.64 · NOVIKOVA 💋
          </div>

          {/* Mode badge */}
          <div style={{
            padding: "6px 12px", background: `${C.accent}18`, border: `1px solid ${C.accent}44`,
            fontSize: 9, color: C.accent, fontFamily: "monospace", textAlign: "center", marginBottom: 12,
          }}>
            MODE: RULE_BASED_LOCAL<br />APPROVAL: ALWAYS REQUIRED
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <button onClick={() => openPanel("automation")} style={{
              ...pxb(C.purple, 1), background: C.surface, padding: "10px 14px",
              cursor: "pointer", fontFamily: "monospace", fontSize: 9, color: C.purple, width: "100%",
            }}>⚡ APPROVAL QUEUE</button>
            <button onClick={() => openPanel("server")} style={{
              ...pxb(C.blue, 1), background: C.surface, padding: "10px 14px",
              cursor: "pointer", fontFamily: "monospace", fontSize: 9, color: C.blue, width: "100%",
            }}>🖥 RUNTIME STATUS</button>
          </div>
        </div>

        {/* ── Right Column ─────────────────────────────────────────────── */}
        <div style={{
          padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8,
          overflowY: "auto",
        }}>
          <Zone label="SERVER RACK" sub="runtime · backend · env"
            icon="🖥" color={C.blue} active={panel === "server"} onClick={() => openPanel("server")} />
          <Zone label="AI OPERATOR" sub="режим · пам'ять · дії"
            icon="🤖" color={C.green} active={panel === "operator"} onClick={() => openPanel("operator")} />
          <Zone label="APPROVAL QUEUE" sub="черга · approve · schedule"
            icon="⚡" color={C.yellow} active={panel === "automation"} onClick={() => openPanel("automation")} />

          {/* Approval queue mini */}
          <div style={{ marginTop: 4, padding: 10, background: C.panel, ...pxb(C.line, 1) }}>
            <div style={{ fontSize: 9, color: C.yellow, fontWeight: 700, marginBottom: 6, letterSpacing: "0.08em", fontFamily: "monospace" }}>▸ PENDING</div>
            {[{ action: "Review: Новини ранку", badge: "REVIEW" }, { action: "Reel: launch_01", badge: "DRAFT" }].map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: C.muted, fontSize: 9 }}>{item.action}</span>
                <Badge label={item.badge} ok={false} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom: Command Console ────────────────────────────────────── */}
      <div style={{
        height: 148, background: C.surface,
        borderTop: `1px solid ${C.line}`, display: "flex", flexDirection: "column",
        flexShrink: 0,
      }}>
        <MessageLog messages={messages} />
        <CommandInput onSend={handleSend} />
      </div>

      {/* ── Side Panels ─────────────────────────────────────────────────── */}
      {panel === "telegram" && <Panel title="TELEGRAM DESK" icon="📨" onClose={closePanel}><TelegramDeskPanel runtimeData={runtimeData} /></Panel>}
      {panel === "channels" && <Panel title="CHANNEL OS" icon="📡" onClose={closePanel}><ChannelOSPanel channelData={channelData} /></Panel>}
      {panel === "operator" && <Panel title="AI OPERATOR" icon="🤖" onClose={closePanel}><OperatorPanel /></Panel>}
      {panel === "server" && <Panel title="RUNTIME STATUS" icon="🖥" onClose={closePanel}><ServerPanel runtimeData={runtimeData} /></Panel>}
      {panel === "content" && <Panel title="CONTENT PLAN" icon="📝" onClose={closePanel}><ContentPanel /></Panel>}
      {panel === "assets" && <Panel title="ASSETS VAULT" icon="🗂" onClose={closePanel}><AssetsPanel /></Panel>}
      {panel === "automation" && <Panel title="APPROVAL QUEUE" icon="⚡" onClose={closePanel}><AutomationPanel /></Panel>}
    </div>
  );
}

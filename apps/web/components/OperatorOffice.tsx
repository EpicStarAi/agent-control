"use client";

// EPICGRAM OPERATOR OFFICE — real-data operator command room.
// Production path must not render demo Telegram accounts/chats/messages.

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

const DRAFTS: Array<{ id: string; title: string; channel: string; status: string }> = [];
const ASSETS: Array<{ type: string; name: string; size: string; ok: boolean }> = [];
const AUTOMATION: Array<{ id: string; action: string; schedule: string; running: boolean }> = [];

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
        >✕ Закрыть</button>
      </div>
      {/* body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 14px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Panel: Telegram Desk ─────────────────────────────────────────────────────
function TelegramDeskPanel({ runtimeData, dataMode, lastSync }: {
  runtimeData: Record<string, unknown> | null;
  dataMode: "real" | "offline";
  lastSync: string | null;
}) {
  const tg = (runtimeData?.telegram as Record<string, unknown>) ?? null;
  const connected = Boolean(tg?.connected);
  const authState = (tg?.authorizationState as string) ?? "unknown";
  const acc = (tg?.activeAccount as Record<string, unknown>) ?? null;
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>
      <div style={{ marginBottom: 14, padding: 12, background: C.panel, ...pxb(C.accent, 1) }}>
        <SectionHead text="Аккаунт" />
        <Row label="Слот" value={acc?.displayName ? String(acc.displayName).split(" ")[0] : "—"} />
        <Row label="Имя" value={acc?.displayName ? String(acc.displayName) : "Аккаунт не подключён"} />
        <Row label="ID пользователя" value={acc?.idMasked ? String(acc.idMasked) : "—"} />
        <Row label="Логин" value={acc?.username ? String(acc.username) : "—"} />
        <Row label="Авторизация" value={connected ? "Авторизован" : authState} ok={connected} />
        <Row
          label="Режим данных"
          value={dataMode === "real" ? "Онлайн" : "Недоступно"}
          ok={dataMode === "real"}
        />
        {lastSync && (
          <Row label="Синхронизация" value={new Date(lastSync).toLocaleTimeString()} />
        )}
      </div>
      <div style={{ padding: 12, background: C.panel, ...pxb(C.accent, 1) }}>
        <SectionHead text="Режим отправки" />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Dot color={C.green} /><span style={{ color: C.green, fontWeight: 700 }}>Только вручную</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dot color={C.accent} on={false} /><span style={{ color: C.accent }}>Отправка: заблокирована</span>
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
          topic: isChannel ? "канал" : typeRaw === "private" ? "личный" : "группа",
          audience: ch.unreadCount != null ? String(ch.unreadCount) : "—",
          posts: "—",
          growth: "+?.?%",
          status: "active",
          username: (ch.username as string | null) ?? null,
        };
      })
    : [];
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>
      {channelData.ok ? (
        <div style={{ padding: "6px 10px", background: `${C.green}14`, border: `1px solid ${C.green}33`, fontSize: 9, color: C.green, fontFamily: "monospace", marginBottom: 12 }}>
          ✓ Данные из TDLib · загружено чатов: {channelData.channels.length}
        </div>
      ) : (
        <div style={{ padding: "10px 12px", background: `${C.yellow}14`, border: `1px solid ${C.yellow}33`, fontSize: 10, color: C.yellow, fontFamily: "monospace", marginBottom: 12 }}>
          Нет реальных данных TDLib. Подключите Telegram-аккаунт или проверьте backend.
        </div>
      )}
      {realChannels.map((ch) => (
        <div key={ch.id} style={{ marginBottom: 12, padding: 12, background: C.panel, ...pxb(C.line, 1) }}>
          <div style={{ color: C.accent, fontWeight: 700, marginBottom: 6, fontSize: 11 }}>{ch.name}</div>
          <Row label="Тема" value={ch.topic} />
          <Row label="Аудитория" value={ch.audience} />
          <Row label="Постов" value={String(ch.posts)} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ color: ch.growth.startsWith("+") ? C.green : "#f87171", fontSize: 10 }}>▲ {ch.growth}</span>
            <Badge label={ch.status === "active" ? "активен" : ch.status} ok={ch.status === "active"} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Panel: Operator Avatar ────────────────────────────────────────────────────
function OperatorPanel() {
  const modes = [
    { label: "Режим", value: "RULE_BASED_LOCAL", ok: true },
    { label: "ИИ-среда", value: "LOCAL_SEED", ok: true },
    { label: "Отправка", value: "Только вручную", ok: false },
    { label: "Автоотправка", value: "Отключена", ok: true },
    { label: "Массовая отправка", value: "Заблокирована", ok: false },
    { label: "Подтверждение", value: "Всегда требуется", ok: true },
    { label: "Память", value: "Загружена", ok: true },
    { label: "TDLib", value: "Готов", ok: true },
  ];
  const blocked = [
    "telegram.message.send (без подтверждения)",
    "telegram.post.publish (без подтверждения)",
    "mass_sending",
    "auto_retry_without_confirm",
  ];
  return (
    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text }}>
      <div style={{ marginBottom: 14, padding: 12, background: C.panel, ...pxb(C.accent, 1) }}>
        <SectionHead text="Состояние агента" />
        {modes.map((m) => <Row key={m.label} label={m.label} value={m.value} ok={m.ok} />)}
      </div>
      <div style={{ padding: 12, background: C.panel, ...pxb(C.line, 1) }}>
        <SectionHead text="Заблокированные действия" />
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
function ServerPanel({ runtimeData, dataMode, lastSync }: {
  runtimeData: Record<string, unknown> | null;
  dataMode: "real" | "offline";
  lastSync: string | null;
}) {
  const rt = (runtimeData?.runtime as Record<string, unknown>) ?? {};
  const tg = (runtimeData?.telegram as Record<string, unknown>) ?? {};
  const realTdlib = rt?.tdlib as string ?? "unknown";
  const nativeLoaded = Boolean(rt?.nativeBindingLoaded ?? false);
  const tgConnected = Boolean(tg?.connected ?? false);
  const realRuntime = [
    { label: "WEB (Next.js)", port: "3015", status: "работает", badge: "ТЕСТ", ok: true },
    { label: "API (EPICGRAM)", port: "8788", status: "работает", badge: "ТЕСТ", ok: true },
    { label: "Адаптер TDLib", port: "—", status: nativeLoaded ? "загружен" : "не загружен", badge: nativeLoaded ? "ГОТОВ" : "ОЖИДАНИЕ", ok: nativeLoaded },
    { label: "Сессия Telegram", port: "—", status: tgConnected ? "готова" : "не готова", badge: tgConnected ? "ПОДКЛЮЧЕНО" : "НЕ В СЕТИ", ok: tgConnected },
    { label: "Политика публикаций", port: "—", status: "отключена", badge: "БЕЗОПАСНО", ok: true },
    { label: "Отправка", port: "—", status: "ЗАБЛОКИРОВАНА", badge: "🔒 ВРУЧНУЮ", ok: false },
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
            <span style={{ color: C.muted, fontSize: 9 }}>порт {r.port}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Dot color={r.ok ? C.green : C.yellow} on={r.ok} />
              <span style={{ color: C.muted, fontSize: 9 }}>{r.status}</span>
            </div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 12, padding: 12, background: C.panel, ...pxb(C.accent, 1) }}>
        <SectionHead text="Безопасность окружения" />
        {[
          ["EPICGRAM_API_BASE", "http://127.0.0.1:8788 (локально)"],
          ["TDLIB_NATIVE", "загружено (dev)"],
          ["LIVE_SEND", "ЗАБЛОКИРОВАНА 🔒"],
          ["AUTO_PUBLISH", "отключена"],
          ["Режим данных", dataMode === "real" ? "Онлайн ✓" : "Недоступно"],
          ["Синхронизация", lastSync ? new Date(lastSync).toLocaleTimeString() : "никогда"],
          ["SECRETS", "не раскрыты"],
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
        <SectionHead text={`Черновики (${DRAFTS.length})`} />
        {DRAFTS.map((d) => (
          <div key={d.id} style={{ marginBottom: 8, padding: 8, background: C.surface, ...pxb(C.line, 1) }}>
            <div style={{ color: C.text, marginBottom: 3, fontSize: 10 }}>{d.title}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: C.muted, fontSize: 9 }}>{d.channel}</span>
              <Badge label={d.status === "DRAFT" ? "Черновик" : d.status === "REVIEW" ? "Проверить" : d.status} ok={d.status === "DRAFT" ? undefined : true} />
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
          <Badge label={a.ok ? "Готово" : "Обработка"} ok={a.ok} />
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
          <span style={{ color: C.yellow, fontWeight: 700, fontSize: 10 }}>Требуется подтверждение: 2 действия</span>
        </div>
        <div style={{ color: C.muted, fontSize: 9 }}>перед любой отправкой нужно ручное подтверждение</div>
      </div>
      {AUTOMATION.map((q) => (
        <div key={q.id} style={{ marginBottom: 8, padding: 10, background: C.panel, ...pxb(C.line, 1) }}>
          <div style={{ color: C.text, marginBottom: 3 }}>{q.action}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: C.muted, fontSize: 9 }}>{q.schedule}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Dot color={q.running ? C.green : C.purple} on={q.running} />
              <span style={{ color: q.running ? C.green : C.purple, fontSize: 9 }}>{q.running ? "Выполняется" : "Запланировано"}</span>
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
          Операторская EPICGRAM — ожидаю задачу...
        </div>
      )}
      {messages.map((m, i) => (
        <div key={i} style={{ fontSize: 10, fontFamily: "monospace" }}>
          <span style={{ color: m.role === "operator" ? C.green : C.accent }}>
            {m.role === "operator" ? "◂ ОПЕРАТОР" : "▸ ВЫ"}
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
      >Отправить</button>
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
        ОПЕРАТОРСКАЯ v1.0
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
        Загрузка операторской EPICGRAM... {progress}%
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
        ▪▪▪ ОПЕРАТОРСКАЯ EPICGRAM ▪▪▪<br />
        ТЕСТ · БЕЗОПАСНЫЙ РЕЖИМ · ОТПРАВКА ЗАБЛОКИРОВАНА
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function OperatorOffice() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [panel, setPanel] = useState<PanelId>(null);
  const openPanel = (p: PanelId) => setPanel(p);
  const [messages, setMessages] = useState<MessageEntry[]>([]);

  // Real data fetched from Operator Office API bridge. No demo fallback.
  const [runtimeData, setRuntimeData] = useState<Record<string, unknown> | null>(null);
  const [channelData, setChannelData] = useState<{ ok: boolean; channels: Record<string, unknown>[] }>({ ok: false, channels: [] });
  const [dataMode, setDataMode] = useState<"real" | "offline">("offline");
  const [lastSync, setLastSync] = useState<string | null>(null); // ISO timestamp of last successful fetch

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
        // Fetch via Next.js operator bridge proxy — /api/operator/* routes
        // proxy to backend :8788 server-side (no CORS, no auth leakage)
        const [statusResp, channelsResp] = await Promise.all([
          fetch("/api/operator/qclaw/status", { cache: "no-store", credentials: "include" }),
          fetch("/api/operator/publish/channels", { cache: "no-store", credentials: "include" }),
        ]);
        if (cancelled) return;
        const [statusData, channelsData] = await Promise.all([
          statusResp.json().catch(() => null),
          channelsResp.json().catch(() => null),
        ]);
        if (cancelled) return;

        // Normalize Next.js /api/operator/qclaw/status → runtimeData shape
        // Next.js route returns: { ok, telegram: { connected, authorizationState,
        //   activeAccount: { idMasked, displayName, username } }, runtime: { tdlib, nativeBindingLoaded } }
        if (statusData?.ok && statusData?.telegram) {
          const tg = statusData.telegram;
          setRuntimeData({
            ok: true,
            telegram: {
              connected: Boolean(tg.connected),
              authorizationState: String(tg.authorizationState ?? ""),
              activeAccount: tg.activeAccount ?? null,
            },
            runtime: {
              tdlib: statusData.runtime?.tdlib ?? "unknown",
              nativeBindingLoaded: Boolean(statusData.runtime?.nativeBindingLoaded),
            },
          });
          setDataMode("real");
          setLastSync(new Date().toISOString());
        }

        // Normalize Next.js /api/operator/publish/channels → channelData shape
        // Next.js route returns: { ok, channels: [{ id, title, type, isChannel, isGroup,
        //   canPublish, reason, username, memberCount }] }
        if (channelsData?.ok && Array.isArray(channelsData.channels)) {
          setChannelData({ ok: true, channels: channelsData.channels });
        }
      } catch {
        setRuntimeData(null);
        setChannelData({ ok: false, channels: [] });
        setDataMode("offline");
        setLastSync(null);
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
        // Call via Next.js operator bridge proxy — routes to :8788 server-side
        const ENDPOINT = "/api/operator/qclaw/status";

        const resp = await fetch(ENDPOINT, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!resp.ok) {
          reply = [
            `\u25b8 \u041e\u0448\u0438\u0431\u043a\u0430 \u043c\u043e\u0441\u0442\u0430`,
            `\u25b8 \u0422\u043e\u0447\u043a\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0430: ${ENDPOINT}`,
            `\u25b8 HTTP: ${resp.status}`,
            `\u25b8 \u0421\u043e\u0441\u0442\u043e\u044f\u043d\u0438\u0435 \u0441\u0438\u0441\u0442\u0435\u043c\u044b: \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e`,
            `\u25b8 \u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u0447\u0430\u0442: \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e`,
            `\u25b8 \u0420\u0435\u0436\u0438\u043c: \u0422\u041e\u041b\u042c\u041a\u041e \u0427\u0422\u0415\u041d\u0418\u0415`,
            `\u25b8 \u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435: \u0414\u0410`,
            `\u25b8 \u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430: \u0417\u0410\u0411\u041b\u041e\u041a\u0418\u0420\u041e\u0412\u0410\u041d\u0410 \ud83d\udd12`,
          ].join("\n");
        } else {
          type RuntimeStatusResponse = {
            ok?: boolean;
            telegram?: {
            connected?: boolean;
            authorizationState?: string;
            activeAccount?: {
              displayName?: string | null;
              username?: string | null;
            } | null;
            };
            runtime?: {
            tdlib?: string | {
              version?: string;
            };
            nativeBindingLoaded?: boolean;
            };
          };

          const raw: unknown = await resp.json().catch(() => null);

          const data: RuntimeStatusResponse | null =
            raw && typeof raw === "object"
              ? (raw as RuntimeStatusResponse)
              : null;

          const accountName =
            data?.telegram?.activeAccount?.displayName ??
            "недоступно";

          const authorizationState =
            data?.telegram?.authorizationState ??
            "недоступно";

          const connected =
            data?.telegram?.connected === true;

          const tdlibRaw = data?.runtime?.tdlib;

          const tdlibVersion =
            typeof tdlibRaw === "string"
              ? tdlibRaw
              : tdlibRaw && typeof tdlibRaw === "object" &&
                typeof (tdlibRaw as Record<string, unknown>).version === "string"
                ? String((tdlibRaw as Record<string, unknown>).version)
                : "недоступно";

          const telegramStatus =
            connected
              ? "\u041f\u041e\u0414\u041a\u041b\u042e\u0427\u0415\u041d\u041e \u2713"
              : authorizationState === "\u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e"
              ? "\u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e"
              : "\u041d\u0415 \u0413\u041e\u0422\u041e\u0412 \u2717";

          reply = [
            `\u25b8 \u041e\u043f\u0435\u0440\u0430\u0442\u043e\u0440\u0441\u043a\u0430\u044f EPICGRAM \u2014 \u0436\u0438\u0432\u043e\u0439 \u0441\u0442\u0430\u0442\u0443\u0441`,
            `\u25b8 \u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a: ${ENDPOINT}`,
            `\u25b8 \u0410\u043a\u043a\u0430\u0443\u043d\u0442: ${accountName}`,
            `\u25b8 \u0410\u0432\u0442\u043e\u0440\u0438\u0437\u0430\u0446\u0438\u044f: ${authorizationState}`,
            `\u25b8 Telegram: ${telegramStatus}`,
            `\u25b8 TDLib: ${tdlibVersion}`,
            `\u25b8 \u0412\u044b\u0431\u0440\u0430\u043d\u043d\u044b\u0439 \u0447\u0430\u0442: \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e \u0438\u0437 \u0441\u0442\u0430\u0442\u0443\u0441\u0430`,
            `\u25b8 \u0420\u0435\u0436\u0438\u043c: \u0422\u041e\u041b\u042c\u041a\u041e \u0427\u0422\u0415\u041d\u0418\u0415`,
            `\u25b8 \u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435: \u0414\u0410`,
            `\u25b8 \u041e\u0442\u043f\u0440\u0430\u0432\u043a\u0430: \u0417\u0410\u0411\u041b\u041e\u041a\u0418\u0420\u041e\u0412\u0410\u041d\u0410 \ud83d\udd12`,
          ].join("\n");
        }

      } catch {
        // Fail-closed: bridge unreachable → never assume live state.
        reply = [
          `▸ Ошибка моста`,
          `▸ Точка доступа: /api/operator/qclaw/status`,
          `▸ Состояние системы: недоступно`,
          `▸ Выбранный чат: недоступно`,
          `▸ Режим: ТОЛЬКО ЧТЕНИЕ`,
          `▸ Подтверждение: ДА`,
          `▸ Отправка: ЗАБЛОКИРОВАНА 🔒`,
        ].join("\n");
      }

      setMessages((prev) => [...prev, { role: "operator", text: reply, ts: new Date().toLocaleTimeString() }]);
    }, 600);
  };

  if (loading) return <LoadingScreen progress={progress} />;

  // Honest operator identity/state — derived ONLY from live qclaw/status data.
  // No binding -> "not connected"; never a fictional NOVIKOVA / ready session.
  const _tgMain = (runtimeData?.telegram as Record<string, unknown>) ?? null;
  const operatorConnected = Boolean(_tgMain?.connected);
  const _accMain = (_tgMain?.activeAccount as Record<string, unknown>) ?? null;
  const operatorAccountLabel =
    operatorConnected && _accMain?.displayName ? String(_accMain.displayName) : "Аккаунт не подключён";
  const operatorStatusLine = operatorConnected
    ? `${String(_tgMain?.authorizationState ?? "unknown")} · ${operatorAccountLabel}`
    : "Нет привязанного Telegram-аккаунта";
  const channelStrip = channelData.ok
    ? channelData.channels.map((ch) => ({
        id: String(ch.id ?? ""),
        name: String(ch.title ?? "Без названия"),
        unread: ch.unreadCount != null ? String(ch.unreadCount) : "0",
        category: String(ch.category ?? ch.type ?? "chat"),
      }))
    : [];
  const runtimeMini = [
    { label: "WEB", ok: true },
    { label: "API", ok: dataMode === "real" },
    { label: "TDLib", ok: Boolean((runtimeData?.runtime as Record<string, unknown> | undefined)?.nativeBindingLoaded) },
    { label: "TG", ok: operatorConnected },
  ];

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
            ← Назад
          </Link>
          <span style={{ color: C.accent, fontWeight: 700, fontSize: 12, letterSpacing: "0.12em" }}>
            🖥 Операторская EPICGRAM
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            dataMode === "real" ? "Данные: онлайн ✅" : "Данные: недоступны",
            "Тестовый безопасный режим",
            "Отправка заблокирована 🔒",
            "Только ручное подтверждение",
          ].map((b) => (
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
        {channelStrip.length === 0 && (
          <div style={{ ...pxb(C.line, 1), padding: "8px 16px", background: C.panel, minWidth: 220, flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: C.yellow, fontWeight: 700, marginBottom: 3, letterSpacing: "0.06em" }}>Нет реальных TDLib-чатов</div>
            <div style={{ fontSize: 9, color: C.muted }}>Подключите аккаунт или проверьте backend</div>
          </div>
        )}
        {channelStrip.map((ch) => (
          <div key={ch.id} style={{
            ...pxb(C.accent, 1), padding: "8px 16px",
            background: C.panel, minWidth: 160, flexShrink: 0,
          }}>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginBottom: 3, letterSpacing: "0.06em" }}>{ch.name}</div>
            <div style={{ fontSize: 9, color: C.muted }}>тип {ch.category} · непрочитано {ch.unread}</div>
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
          + Управление каналами
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
          <Zone label="Telegram" sub="аккаунт · чати · статуси"
            icon="📨" color={C.accent} active={panel === "telegram"} onClick={() => openPanel("telegram")} />
          <Zone label="Управление каналами" sub="канали · план · стратегія"
            icon="📡" color={C.ember} active={panel === "channels"} onClick={() => openPanel("channels")} />
          <Zone label="Контент-план" sub="чернетки · планування"
            icon="📝" color={C.purple} active={panel === "content"} onClick={() => openPanel("content")} />
          <Zone label="Медиатека" sub="фото · відео · аудіо"
            icon="🗂" color={C.yellow} active={panel === "assets"} onClick={() => openPanel("assets")} />

          {/* Runtime mini */}
          <div style={{ marginTop: "auto", padding: 10, background: C.panel, ...pxb(C.line, 1) }}>
            <div style={{ fontSize: 9, color: C.accent, fontWeight: 700, marginBottom: 6, letterSpacing: "0.08em", fontFamily: "monospace" }}>▸ Компоненты системы</div>
            {runtimeMini.map((r) => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: C.muted, fontSize: 9 }}>{r.label}</span>
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
            <div style={{ fontSize: 8, color: C.accent, fontWeight: 700, letterSpacing: "0.1em" }}>ИИ-ОПЕРАТОР</div>
            <div style={{ fontSize: 8, color: C.muted }}>{operatorAccountLabel}</div>
          </button>

          {/* Status — honest live state, no fictional ready session */}
          <div style={{ fontSize: 10, color: operatorConnected ? C.green : C.yellow, fontFamily: "monospace", textAlign: "center", marginBottom: 4 }}>
            <Dot color={operatorConnected ? C.green : C.yellow} on={operatorConnected} /> {operatorConnected ? "Готов к работе" : "Аккаунт не подключён"}
          </div>
          <div style={{ fontSize: 9, color: C.muted, fontFamily: "monospace", textAlign: "center", marginBottom: 12 }}>
            {operatorStatusLine}
          </div>

          {/* Mode badge */}
          <div style={{
            padding: "6px 12px", background: `${C.accent}18`, border: `1px solid ${C.accent}44`,
            fontSize: 9, color: C.accent, fontFamily: "monospace", textAlign: "center", marginBottom: 12,
          }}>
Режим: локальный по правилам<br />Подтверждение: всегда требуется
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            <button onClick={() => openPanel("automation")} style={{
              ...pxb(C.purple, 1), background: C.surface, padding: "10px 14px",
              cursor: "pointer", fontFamily: "monospace", fontSize: 9, color: C.purple, width: "100%",
            }}>⚡ Очередь согласования</button>
            <button onClick={() => openPanel("server")} style={{
              ...pxb(C.blue, 1), background: C.surface, padding: "10px 14px",
              cursor: "pointer", fontFamily: "monospace", fontSize: 9, color: C.blue, width: "100%",
            }}>🖥 Состояние системы</button>
          </div>
        </div>

        {/* ── Right Column ─────────────────────────────────────────────── */}
        <div style={{
          padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8,
          overflowY: "auto",
        }}>
          <Zone label="Состояние системы" sub="среда · сервер · система"
            icon="🖥" color={C.blue} active={panel === "server"} onClick={() => openPanel("server")} />
          <Zone label="ИИ-оператор" sub="режим · пам'ять · дії"
            icon="🤖" color={C.green} active={panel === "operator"} onClick={() => openPanel("operator")} />
          <Zone label="Очередь согласования" sub="очередь · согласование · расписание"
            icon="⚡" color={C.yellow} active={panel === "automation"} onClick={() => openPanel("automation")} />

          {/* Approval queue mini */}
          <div style={{ marginTop: 4, padding: 10, background: C.panel, ...pxb(C.line, 1) }}>
            <div style={{ fontSize: 9, color: C.yellow, fontWeight: 700, marginBottom: 6, letterSpacing: "0.08em", fontFamily: "monospace" }}>▸ Ожидает решения</div>
            {[{ action: "Проверить: Новини ранку", badge: "Проверить" }, { action: "Reel: launch_01", badge: "Черновик" }].map((item, i) => (
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
      {panel === "telegram" && <Panel title="Telegram" icon="📨" onClose={closePanel}><TelegramDeskPanel runtimeData={runtimeData} dataMode={dataMode} lastSync={lastSync} /></Panel>}
      {panel === "channels" && <Panel title="Управление каналами" icon="📡" onClose={closePanel}><ChannelOSPanel channelData={channelData} /></Panel>}
      {panel === "operator" && <Panel title="ИИ-оператор" icon="🤖" onClose={closePanel}><OperatorPanel /></Panel>}
      {panel === "server" && <Panel title="Состояние системы" icon="🖥" onClose={closePanel}><ServerPanel runtimeData={runtimeData} dataMode={dataMode} lastSync={lastSync} /></Panel>}
      {panel === "content" && <Panel title="Контент-план" icon="📝" onClose={closePanel}><ContentPanel /></Panel>}
      {panel === "assets" && <Panel title="Медиатека" icon="🗂" onClose={closePanel}><AssetsPanel /></Panel>}
      {panel === "automation" && <Panel title="Очередь согласования" icon="⚡" onClose={closePanel}><AutomationPanel /></Panel>}
    </div>
  );
}


// SettingsCenter — Unigram/Telegram Desktop-style settings shell for EPIC☠GRAM.
// READ-ONLY / online-dev: every control here is a visual placeholder over the existing
// Telegram Layer (TDLib via /api/telegram). No TDLib session, no logout, no account
// mutation, no real Telegram write ever happens from this screen.

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/api";
import {
  GLOW_THEMES, loadGlowSettings, saveGlowSettings, resolveGlowColor,
  type GlowSettings, type GlowThemeId,
} from "@/hooks/useAIGlowSettings";

type Section =
  | "account" | "appearance" | "privacy" | "notifications" | "data"
  | "folders" | "devices" | "language" | "advanced" | "business" | "premium" | "help";

const NAV: { id: Section; icon: string; label: string }[] = [
  { id: "account", icon: "👤", label: "Аккаунт" },
  { id: "appearance", icon: "🎨", label: "Оформление" },
  { id: "privacy", icon: "🔒", label: "Конфиденциальность" },
  { id: "notifications", icon: "🔔", label: "Уведомления и звуки" },
  { id: "data", icon: "💾", label: "Данные и память" },
  { id: "folders", icon: "🗂", label: "Папки с чатами" },
  { id: "devices", icon: "🖥", label: "Устройства" },
  { id: "language", icon: "🌐", label: "Язык" },
  { id: "advanced", icon: "🧩", label: "Продвинутые" },
  { id: "business", icon: "💼", label: "Telegram Бизнес" },
  { id: "premium", icon: "⭐", label: "Premium / Звёзды" },
  { id: "help", icon: "❓", label: "Помощь" },
];

const THEMES = [
  { id: "classic", name: "Классический Telegram", clr: "#38bdf8", bg: "#0e1621" },
  { id: "epicgram", name: "EPICGRAM", clr: "#e879f9", bg: "#0b0710" },
  { id: "light", name: "Светлая", clr: "#2563eb", bg: "#f4f4f6" },
  { id: "dark", name: "Тёмная", clr: "#22c55e", bg: "#050505" },
];
const THEME_CHANGE_EVENT = "epic:theme-changed";

const LS = "epic_settings_center_v1";
type Prefs = { theme: string; dark: boolean; compact: boolean; accent: string };
const DEFAULT_PREFS: Prefs = { theme: "classic", dark: true, compact: false, accent: "#38bdf8" };

function loadPrefs(): Prefs {
  try { const v = JSON.parse(localStorage.getItem(LS) || "null"); return v ? { ...DEFAULT_PREFS, ...v } : DEFAULT_PREFS; } catch { return DEFAULT_PREFS; }
}
function savePrefs(p: Prefs) { try { localStorage.setItem(LS, JSON.stringify(p)); } catch {} }

function Card({ title, children, note }: { title?: string; children: React.ReactNode; note?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      {title && <div className="mb-3 text-sm font-bold text-fuchsia-100">{title}</div>}
      {children}
      {note && <div className="mt-3 text-[11px] text-white/40">{note}</div>}
    </div>
  );
}
function Row({ label, value, action }: { label: string; value?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5 last:border-0">
      <span className="text-[13px] text-white/70">{label}</span>
      <span className="flex items-center gap-2 text-[13px] text-white/50">{value}{action}</span>
    </div>
  );
}
function Toggle({ on, disabled, onClick }: { on: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-fuchsia-600" : "bg-white/15"} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${on ? "left-4" : "left-0.5"}`} />
    </button>
  );
}
function Placeholder({ text }: { text: string }) {
  return <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/35">{text}</span>;
}
function DisabledBtn({ children }: { children: React.ReactNode }) {
  return <button disabled className="cursor-not-allowed rounded-lg bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-white/30">{children}</button>;
}

export default function SettingsCenter({ embedded }: { embedded?: boolean }) {
  const [section, setSection] = useState<Section>("account");
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [status, setStatus] = useState<{ accounts: any[]; loaded: boolean }>({ accounts: [], loaded: false });
  const [glow, setGlowState] = useState<GlowSettings>(loadGlowSettings);

  const setGlow = (patch: Partial<GlowSettings>) => {
    const next = { ...glow, ...patch } as GlowSettings;
    setGlowState(next);
    saveGlowSettings(next);
    try { window.dispatchEvent(new CustomEvent("epicgram:glow-settings-changed")); } catch {}
  };

  useEffect(() => { savePrefs(prefs); }, [prefs]);
  useEffect(() => {
    let alive = true;
    fetch(apiUrl("/telegram/status"), { cache: "no-store" }).then((r) => r.json()).catch(() => null).then((s) => {
      if (!alive) return;
      setStatus({ accounts: s?.accounts || [], loaded: true });
    });
    return () => { alive = false; };
  }, []);

  const setTheme = (id: string, clr: string) => {
    setPrefs((p) => ({ ...p, theme: id, accent: clr }));
    try { window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme: id } })); } catch {}
  };
  const activeAccount = status.accounts[0];

  function Body() {
    if (section === "account") return (
      <div className="space-y-3">
        <Card title="Профиль">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white" style={{ background: prefs.accent }}>
              {(activeAccount?.displayName || "EG").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <Row label="Имя" value={<Placeholder text={activeAccount?.displayName || "не задано"} />} />
              <Row label="Фамилия" value={<Placeholder text="не задано" />} />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Row label="Имя пользователя" value={<Placeholder text={activeAccount?.username ? "@" + activeAccount.username : "не задан"} />} />
            <Row label="Телефон" value={<Placeholder text={activeAccount?.phoneMasked || "+•• ••• •• ••"} />} />
            <Row label="О себе" value={<Placeholder text="не заполнено" />} />
            <Row label="Дата рождения" value={<Placeholder text="скрыто" />} />
            <Row label="Личный канал" value={<Placeholder text="не привязан" />} />
            <Row label="Бизнес-профиль" value={<Placeholder text="не настроен" />} />
          </div>
          <div className="mt-3"><DisabledBtn>Сохранить</DisabledBtn></div>
        </Card>
        <Card title="Статус" note="Только чтение. Изменение профиля недоступно в online-dev режиме.">
          <Row label="Аккаунтов подключено" value={status.loaded ? status.accounts.length : "…"} />
        </Card>
      </div>
    );

    if (section === "appearance") return (
      <div className="space-y-3">
        <Card title="Тема EPICGRAM">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {THEMES.map((th) => (
              <button key={th.id} onClick={() => setTheme(th.id, th.clr)} className={`rounded-xl border p-3 text-left transition ${prefs.theme === th.id ? "border-white/50 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                <div className="mb-2 h-6 w-full rounded-lg" style={{ background: th.clr }} />
                <div className="text-[11px] font-semibold text-white/80">{th.name}</div>
              </button>
            ))}
          </div>
        </Card>
        <Card title="Внешний вид">
          <Row label="Тёмный режим" value={<Toggle on={prefs.dark} onClick={() => setPrefs((p) => ({ ...p, dark: !p.dark }))} />} />
          <Row label="Компактный режим" value={<Toggle on={prefs.compact} onClick={() => setPrefs((p) => ({ ...p, compact: !p.compact }))} />} />
          <Row label="Фон чата" value={<Placeholder text="Telegram-паттерн (по умолчанию)" />} />
          <Row label="Акцентный цвет" value={<span className="h-4 w-4 rounded-full" style={{ background: prefs.accent }} />} />
          <Row label="Стиль пузырей сообщений" value={<Placeholder text="классический" />} />
        </Card>

        {/* ── AI Operator Glow ──────────────────────────────────────────── */}
        <Card title="✦ AI Оператор · Свечение">
          <Row
            label="Эффект свечения"
            value={<Toggle on={glow.enabled} onClick={() => setGlow({ enabled: !glow.enabled })} />}
          />

          {glow.enabled && (
            <>
              {/* Color theme grid */}
              <div className="mt-3 mb-1 text-[11px] text-white/40">Цветовая тема</div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {GLOW_THEMES.map((t) => {
                  const active = glow.themeId === t.id;
                  const color = t.id === "custom" ? glow.customColor : t.color;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setGlow({ themeId: t.id as GlowThemeId })}
                      className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition ${
                        active ? "border-white/40 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div
                        className="h-5 w-full rounded-lg"
                        style={{
                          background: color,
                          boxShadow: active ? `0 0 10px 2px ${color}` : "none",
                        }}
                      />
                      <span className="text-[10px] font-medium text-white/70 text-center leading-tight">{t.name}</span>
                      {active && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-white text-[8px] flex items-center justify-center text-black font-black">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Custom color picker */}
              {glow.themeId === "custom" && (
                <div className="mt-2 flex items-center gap-3">
                  <label className="text-[11px] text-white/40">Свой цвет</label>
                  <input
                    type="color"
                    value={glow.customColor}
                    onChange={e => setGlow({ customColor: e.target.value })}
                    className="h-7 w-12 cursor-pointer rounded border-0 bg-transparent"
                  />
                  <span className="text-[11px] font-mono text-white/40">{glow.customColor}</span>
                </div>
              )}

              {/* Intensity slider */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/40">Интенсивность</span>
                  <span className="text-[11px] font-mono text-white/60">{glow.intensity}%</span>
                </div>
                <input
                  type="range"
                  min={10} max={100} step={5}
                  value={glow.intensity}
                  onChange={e => setGlow({ intensity: Number(e.target.value) })}
                  className="w-full accent-fuchsia-500"
                />
                <div className="flex justify-between text-[10px] text-white/25">
                  <span>слабо</span><span>сильно</span>
                </div>
              </div>

              {/* Live preview swatch */}
              <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="mb-2 text-[10px] text-white/30">Предпросмотр · текущая тема</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { state: "thinking",         label: "Думает",           clr: resolveGlowColor(glow) },
                    { state: "tool_call",         label: "Tool call",        clr: resolveGlowColor(glow) },
                    { state: "success",           label: "Готово",           clr: "#22c55e" },
                    { state: "error",             label: "Ошибка",           clr: "#ef4444" },
                    { state: "approval_required", label: "Подтверждение",    clr: "#f59e0b" },
                  ].map(({ state, label, clr }) => (
                    <button
                      key={state}
                      onClick={() => {
                        try { window.dispatchEvent(new CustomEvent("epicgram:ai-glow", { detail: { state } })); } catch {}
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-white/70 hover:bg-white/10 transition"
                      style={{ borderColor: `${clr}40`, textShadow: "none" }}
                    >
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: clr, boxShadow: `0 0 6px ${clr}` }} />
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      try { window.dispatchEvent(new CustomEvent("epicgram:ai-glow", { detail: { state: "idle" } })); } catch {}
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-white/40 hover:bg-white/10 transition"
                  >
                    Сбросить
                  </button>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-white/25">
                Свечение отключается автоматически при prefers-reduced-motion. Эффект охватывает всю рабочую область, не мешает клику.
              </div>
            </>
          )}
        </Card>
      </div>
    );

    if (section === "privacy") return (
      <Card title="Конфиденциальность" note="Все переключатели — визуальные заглушки, реального изменения приватности Telegram не происходит.">
        {[
          ["Кто видит номер телефона", "Мои контакты"],
          ["Кто видит время последнего захода", "Все"],
          ["Кто видит фото профиля", "Все"],
          ["Кто может пересылать мои сообщения", "Все"],
          ["Права в группах и каналах", "По умолчанию"],
          ["Заблокированные пользователи", "0"],
        ].map(([l, v]) => <Row key={l} label={l} value={<Placeholder text={v} />} />)}
      </Card>
    );

    if (section === "notifications") return (
      <Card title="Уведомления и звуки">
        <Row label="Уведомления" value={<Toggle on disabled />} />
        <Row label="Уведомления по чатам" value={<Toggle on disabled />} />
        <Row label="Звук сообщений" value={<Placeholder text="стандартный" />} />
        <Row label="Режим 'Не беспокоить'" value={<Toggle on={false} disabled />} />
        <Row label="Уведомления на рабочем столе" value={<Placeholder text="недоступно в браузере" />} />
      </Card>
    );

    if (section === "data") return (
      <Card title="Данные и память">
        <Row label="Размер кэша" value={<Placeholder text="0 МБ (read-only)" />} />
        <Row label="Автозагрузка медиа" value={<Placeholder text="по Wi-Fi" />} />
        <Row label="Использование хранилища" value={<Placeholder text="недоступно" />} />
        <div className="mt-3"><DisabledBtn>Очистить кэш</DisabledBtn></div>
      </Card>
    );

    if (section === "folders") return (
      <Card title="Папки с чатами">
        {["Все чаты", "Личные", "Каналы", "Группы", "Боты", "EPICSTAR / рабочие"].map((f) => (
          <Row key={f} label={f} action={<DisabledBtn>Изменить</DisabledBtn>} />
        ))}
        <div className="mt-3"><DisabledBtn>+ Добавить папку</DisabledBtn></div>
      </Card>
    );

    if (section === "devices") return (
      <div className="space-y-3">
        <Card title="Текущая сессия">
          <Row label="Устройство" value={<Placeholder text="Replit online-dev (браузер)" />} />
          <Row label="Платформа" value={<Placeholder text="Web" />} />
          <Row label="Последняя активность" value={<Placeholder text="сейчас" />} />
        </Card>
        <Card title="Активные сессии" note="Завершение сессий отключено в online-dev — реальный logout/terminate никогда не вызывается.">
          {status.accounts.length ? status.accounts.map((a: any, i: number) => (
            <Row key={i} label={a.displayName || a.slotId || "сессия"} value={<Placeholder text={a.status || a.authorizationState || "—"} />} action={<DisabledBtn>Завершить</DisabledBtn>} />
          )) : <div className="py-2 text-[12px] text-white/40">Нет активных сессий Telegram.</div>}
        </Card>
      </div>
    );

    if (section === "language") return (
      <Card title="Язык интерфейса" note="Здесь показан только текущий язык. Переключить язык можно в панели AI-оператора справа (RU / EN / UA) — переключатель использует общий ключ deepinside.ui.language.v1.">
        <Row label="Русский" value="RU" action={<Placeholder text="активен" />} />
        <Row label="Английский" value="EN" />
        <Row label="Украинский" value="UA" action={<Placeholder text="частично" />} />
      </Card>
    );

    if (section === "advanced") return (
      <Card title="Продвинутые настройки">
        <Row label="Тип соединения" value={<Placeholder text="Telegram Layer (TDLib bridge)" />} />
        <Row label="Прокси" value={<Placeholder text="не настроен" />} />
        <Row label="Режим отладки" value={<Toggle on={false} disabled />} />
        <Row label="Диагностика" value={<DisabledBtn>Открыть</DisabledBtn>} />
        <Row label="Источник API" value={<Placeholder text="TDLib / bridge" />} />
        <Row label="Статус блокировки отправки" value={<span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-300">ОТПРАВКА ЗАБЛОКИРОВАНА</span>} />
      </Card>
    );

    if (section === "business") return (
      <Card title="Telegram Бизнес" note="Функции Business в разработке — все поля являются заглушками.">
        <Row label="Бизнес-профиль" value={<Placeholder text="не настроен" />} />
        <Row label="Часы работы" value={<Placeholder text="не указаны" />} />
        <Row label="Локация" value={<Placeholder text="не указана" />} />
        <Row label="Быстрые ответы" value={<Placeholder text="0" />} />
        <Row label="Приветственные/отложенные сообщения" value={<Placeholder text="выключены" />} />
        <Row label="Автоматизация чатов" value={<Placeholder text="недоступно" />} />
      </Card>
    );

    if (section === "premium") return (
      <Card title="Premium / Звёзды" note="Платежи отключены в online-dev режиме.">
        <Row label="Статус Premium" value={<Placeholder text="не активен" />} />
        <Row label="Баланс Звёзд" value={<Placeholder text="0" />} />
        <Row label="Оплата" value={<span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/35">отключена в online-dev</span>} />
      </Card>
    );

    // help
    return (
      <Card title="Помощь">
        <Row label="FAQ" action={<DisabledBtn>Открыть</DisabledBtn>} />
        <Row label="Поддержка" action={<DisabledBtn>Написать</DisabledBtn>} />
        <Row label="Сообщить о проблеме" action={<DisabledBtn>Отправить</DisabledBtn>} />
        <Row label="Версия" value={<Placeholder text="EPIC☠GRAM online-dev · web" />} />
      </Card>
    );
  }

  return (
    <div className={embedded ? "flex h-full min-h-0" : "mx-auto flex min-h-[70vh] max-w-5xl gap-4"}>
      <aside className="w-56 shrink-0 space-y-0.5 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-2">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setSection(n.id)} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] ${section === n.id ? "bg-fuchsia-600/25 font-semibold text-fuchsia-100" : "text-white/60 hover:bg-white/10"}`}>
            <span>{n.icon}</span><span className="truncate">{n.label}</span>
          </button>
        ))}
      </aside>
      <div className="min-w-0 flex-1 overflow-y-auto pr-1">{Body()}</div>
    </div>
  );
}

export function SettingsPageWrapper() {
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-5xl">
        <Link href="/client" className="text-sm text-sky-300">← Клиент</Link>
        <h1 className="mb-4 mt-2 text-3xl font-black text-fuchsia-100">Настройки</h1>
        <SettingsCenter />
      </div>
    </main>
  );
}

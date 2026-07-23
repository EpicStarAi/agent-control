"use client";

// AI CONTROL PANEL GUIDE — embedded AI system navigator / onboarding.
// Category: SYSTEM / ONBOARDING · Status: ACTIVE
// UI / localStorage / visual navigation only. No backend / API / TDLib / Telegram actions. Additive.

import { useEffect, useMemo, useState } from "react";

const LS = "epic_ai_guide_state_v1";

type Sec = { id: string; icon: string; title: string; short: string; badge: string; action?: string; see: string; doIt: string; click: string; related: string; safety: string };

const SECTIONS: Sec[] = [
  { id: "overview", icon: "🧭", title: "Overview", short: "С чего начать", badge: "START", see: "Обзорный экран всей панели EPIC☠STAR / DEEPINSIDE.LIFE и список разделов.", doIt: "Запусти тур или открой любой раздел через кнопку Open.", click: "Жми «Start Tour» вверху или выбери раздел слева.", related: "WORLD · Agent Registry", safety: "Только навигация. Никаких действий не выполняется." },
  { id: "world", icon: "🌐", title: "WORLD", short: "Карта экосистемы", badge: "HUB", action: "world", see: "Главная карта: агенты, Telegram-сессии, каналы, группы, инфраструктура, AI-сервисы, миссии и связи между ними.", doIt: "Фильтруй слои, переключай режимы (Map/Cluster/Runtime/Telegram/Infra), ищи через ⌘K, строй путь до Deepinside.life.", click: "Кнопка WORLD → нода → двойной клик открывает её Workspace.", related: "Agent Workspace · Telegram Workspace · HTML Canvas", safety: "Read-only визуализация. Двойной клик только открывает Workspace." },
  { id: "registry", icon: "🧠", title: "Agent Registry", short: "Реестр AI-сущностей", badge: "AGENTS", action: "registry", see: "Список AI-агентов (EPIC☠STAR, BUCH, BUCHIHA, EVA, и др.): роли, состояние, готовность, модель, память, цели, задачи.", doIt: "Выбирай агента для деталей, двойной клик → Agent Workspace.", click: "Вкладка AGENTS → карточка агента.", related: "Agent Workspace · Mission Control", safety: "Изменения только в локальном реестре (без секретов)." },
  { id: "agentws", icon: "🗂", title: "Agent Workspace", short: "Рабочее место агента", badge: "WORKSPACE", action: "agentws", see: "Полное пространство агента: workflow-canvas, brain/memory, knowledge, missions, tasks, execution, Telegram, devices, timeline, analytics.", doIt: "Переключай вкладки, изучай ноды на полотне, открой Telegram Workspace из вкладки Telegram.", click: "Двойной клик по агенту (в Registry или WORLD).", related: "Telegram Workspace · Mission Control", safety: "Только отображение данных. Runtime не меняется." },
  { id: "telegram", icon: "📨", title: "Telegram Workspace", short: "Встроенный TG-клиент", badge: "READ-ONLY", action: "telegram", see: "Enterprise Telegram-клиент: аккаунты, папки, диалоги, каналы, группы, боты, контакты, медиа, файлы, сессии, аналитика.", doIt: "Просматривай реальные диалоги, фильтруй, ищи. Отправка отключена.", click: "Кнопка 📨 Telegram, или session-нода в WORLD.", related: "Command Center · Discovery", safety: "Read-only: нет отправки/удаления/редактирования." },
  { id: "tgcommand", icon: "🛰", title: "Telegram Command Center", short: "Операционка Telegram", badge: "OPS", action: "telegram", see: "Overview, Sessions, Dialogs, Channels, Groups, Bots, Media, Files, Analytics, Graph, Search + Health-панель и Activity Feed.", doIt: "Переключись на режим Command Center в Telegram Workspace, смотри граф и аналитику.", click: "В Telegram Workspace → тумблер «🛰 Command Center».", related: "Telegram Discovery · WORLD Graph", safety: "Read-only операционная панель." },
  { id: "tgdiscovery", icon: "🔎", title: "Telegram Discovery", short: "Индексация TG", badge: "INDEX", action: "telegram", see: "Pipeline обнаружения: Session → Dialogs → Channels → Groups → Bots → Contacts → Relationships → WORLD Graph. Метрики + лог + индекс.", doIt: "Жми Run Discovery — построится индекс и связи; результат идёт в WORLD.", click: "Command Center → вкладка discovery → Run Discovery.", related: "WORLD · Command Center", safety: "Только индексация (GET + localStorage), без действий." },
  { id: "missions", icon: "🚀", title: "Mission Control", short: "Миссии и проекты", badge: "MISSIONS", action: "missions", see: "Миссии, статусы, приоритеты, цели, шаги, прогресс и привязка к агентам.", doIt: "Изучай миссии, открывай связанные через WORLD/Agent Workspace.", click: "Вкладка 🚀 MISSION CONTROL.", related: "Executive Director · Execution", safety: "Аналитика и планирование, без авто-исполнения." },
  { id: "htmlcanvas", icon: "🧩", title: "HTML Canvas", short: "Архитектурные схемы", badge: "CANVAS", action: "htmlcanvas", see: "Effective HTML Canvas: Agent/Telegram/Runtime/Infrastructure maps, roadmaps, workflow, цифровой двойник, automation.", doIt: "Выбирай шаблон, двигай ноды, экспортируй самодостаточный HTML.", click: "Кнопка 🧠 HTML Canvas → шаблон → Export HTML.", related: "WORLD · Infrastructure", safety: "Локальная визуализация + экспорт файла, без API." },
  { id: "infra", icon: "🖥", title: "Infrastructure", short: "VPS и сервисы", badge: "INFRA", action: "htmlcanvas", see: "VPS, Docker, n8n, PostgreSQL, Redis, Cloudflare, домены и их связи с агентами и сессиями.", doIt: "Смотри инфраструктурный слой в WORLD или HTML Canvas (Infrastructure map).", click: "WORLD → фильтр Infrastructure, либо HTML Canvas → Infrastructure Map.", related: "WORLD · AI Services", safety: "Только карта. Конфигурация не меняется." },
  { id: "ai", icon: "🤖", title: "AI Services", short: "Модели и провайдеры", badge: "AI", action: "htmlcanvas", see: "Claude, ChatGPT, Grok, Gemini, OpenRouter, HuggingFace, ElevenLabs — кто к какому агенту привязан.", doIt: "Смотри AI-слой в WORLD (фильтр AI Services) или AI Entities map в HTML Canvas.", click: "WORLD → фильтр AI Services.", related: "Agent Registry · WORLD", safety: "Только связи и маршрутизация (read-only)." },
  { id: "analytics", icon: "📊", title: "Analytics", short: "Метрики и здоровье", badge: "STATS", action: "world", see: "Ecosystem Health, Telegram Analytics, счётчики диалогов/каналов/групп/ботов/миссий, готовность агентов.", doIt: "Смотри Health в WORLD и Analytics в Telegram Command Center.", click: "WORLD (шапка Health) · Command Center → Analytics.", related: "WORLD · Command Center", safety: "Только агрегированные метрики." },
  { id: "settings", icon: "⚙", title: "Settings", short: "Состояние и память", badge: "STATE", action: "world", see: "Сохранение состояния WORLD, Discovery Index, гайд-прогресс — всё в localStorage.", doIt: "Экспортируй World Snapshot / State, чисти состояние при необходимости.", click: "WORLD → World State (Export/Import/Clear).", related: "WORLD · Discovery", safety: "Только локальные данные, без секретов." },
  { id: "safety", icon: "🛡", title: "Safety / Read-Only", short: "Гарантии безопасности", badge: "SAFE", see: "Telegram actions отключены, режим Read-Only активен. Backend, TDLib, авторизация и маршруты не затрагиваются. Нет автопостинга/рассылок/cron.", doIt: "Убедись: инпут отправки в Telegram задизейблен, все действия — только просмотр и навигация.", click: "Этот раздел — справочный.", related: "Все workspace-ы", safety: "Гарантия: ничего не отправляется, не удаляется, не изменяется во внешних системах." },
];

const TOUR = ["overview", "world", "registry", "agentws", "telegram", "tgcommand", "tgdiscovery", "missions", "htmlcanvas", "infra", "ai", "analytics", "safety"];

export function AiGuide({ onClose, onAction }: { onClose: () => void; onAction?: (target: string) => void }) {
  const [sel, setSel] = useState("overview");
  const [tour, setTour] = useState(false);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => { try { const d = JSON.parse(localStorage.getItem(LS) || "{}"); if (d.selectedGuideSection) setSel(d.selectedGuideSection); if (d.tourStarted) setTour(!!d.tourStarted && !d.tourCompleted); if (typeof d.currentStep === "number") setStep(d.currentStep); if (Array.isArray(d.completedSteps)) setDone(d.completedSteps); if (d.tourCompleted) setCompleted(true); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(LS, JSON.stringify({ tourStarted: tour, tourCompleted: completed, currentStep: step, completedSteps: done, sidebarOpen: true, selectedGuideSection: sel, lastExplanation: sel, timestamp: new Date().toISOString() })); } catch {} }, [tour, completed, step, done, sel]);

  const cur = useMemo(() => SECTIONS.find((s) => s.id === (tour ? TOUR[step] : sel)) || SECTIONS[0], [tour, step, sel]);
  useEffect(() => { setSel(cur.id); setDone((d) => d.includes(cur.id) ? d : [...d, cur.id]); }, [cur.id]);

  const results = useMemo(() => { const ql = q.trim().toLowerCase(); if (!ql) return SECTIONS; return SECTIONS.filter((s) => (s.title + " " + s.short + " " + s.see + " " + s.doIt + " " + s.safety).toLowerCase().includes(ql)); }, [q]);

  function startTour() { setTour(true); setStep(0); setCompleted(false); }
  function next() { if (step < TOUR.length - 1) setStep(step + 1); else { setTour(false); setCompleted(true); } }
  function back() { if (step > 0) setStep(step - 1); }
  function act(target?: string) { if (target && onAction) onAction(target); }

  const pct = Math.round((done.filter((d) => TOUR.includes(d)).length / TOUR.length) * 100);

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-[#07060b]/95 text-tg-text backdrop-blur">
      <header className="flex flex-wrap items-center gap-3 border-b border-[rgba(177,77,255,.25)] bg-[rgba(14,10,20,.7)] px-4 py-2">
        <button onClick={onClose} className="rounded-lg bg-tg-bg px-3 py-1.5 text-sm hover:text-white">‹ Закрыть</button>
        <div className="font-black tracking-wide">🧭 AI CONTROL PANEL GUIDE</div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">ACTIVE · SYSTEM / ONBOARDING</span>
        <div className="ml-2 flex items-center gap-2 text-[11px] text-tg-muted">Прогресс <div className="h-1.5 w-28 overflow-hidden rounded bg-tg-bg"><div className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400" style={{ width: pct + "%" }} /></div> {pct}%</div>
        <div className="ml-auto flex gap-2">
          {!tour ? <button onClick={startTour} className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-3 py-1.5 text-xs font-bold text-white">▶ Start Tour</button>
            : <button onClick={() => setTour(false)} className="rounded-lg bg-tg-bg px-3 py-1.5 text-xs ring-1 ring-tg-line">Exit Tour</button>}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr]">
        {/* LEFT GUIDE SIDEBAR */}
        <nav className="min-h-0 overflow-auto border-r border-[rgba(177,77,255,.2)] bg-[rgba(14,10,20,.55)] p-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guide…" className="mb-2 w-full rounded-lg bg-tg-bg px-3 py-1.5 text-sm outline-none" />
          {results.map((s) => (
            <button key={s.id} onClick={() => { setTour(false); setSel(s.id); }} className={`mb-1 flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${cur.id === s.id ? "border-fuchsia-500/50 bg-fuchsia-600/15" : "border-transparent hover:border-tg-line hover:bg-tg-bg/40"}`}>
              <span className="text-lg">{s.icon}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><span className="truncate text-sm font-semibold">{s.title}</span>{done.includes(s.id) && <span className="text-[10px] text-emerald-400">✓</span>}</span><span className="truncate text-[11px] text-tg-muted">{s.short}</span></span>
              <span className="rounded-full bg-tg-bg px-1.5 py-0.5 text-[9px] font-bold text-tg-muted">{s.badge}</span>
            </button>
          ))}
          {results.length === 0 && <div className="p-3 text-sm text-tg-muted">Ничего не найдено.</div>}
        </nav>

        {/* AI GUIDE PANEL */}
        <main className="min-h-0 overflow-auto p-5">
          <div className="mx-auto max-w-3xl">
            {tour && <div className="mb-3 flex items-center gap-2 text-[11px] text-cyan-300">Guided Tour · Step {step + 1} / {TOUR.length}</div>}
            <div className="rounded-2xl border border-[rgba(177,77,255,.25)] bg-[rgba(20,14,30,.55)] p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3"><span className="text-3xl">{cur.icon}</span><div><div className="text-xl font-black">{cur.title}</div><div className="text-sm text-tg-muted">{cur.short}</div></div>
                <span className="ml-auto rounded-full border border-tg-line bg-tg-bg px-2 py-0.5 text-[10px] font-bold text-tg-muted">{cur.badge}</span></div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-fuchsia-300">Что ты видишь</div><p className="mt-1 text-sm leading-relaxed text-tg-text">{cur.see}</p></div>
                <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-cyan-300">Что можно делать</div><p className="mt-1 text-sm leading-relaxed text-tg-text">{cur.doIt}</p></div>
                <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-amber-300">Куда нажать</div><p className="mt-1 text-sm leading-relaxed text-tg-text">{cur.click}</p></div>
                <div className="rounded-xl border border-tg-line bg-tg-bg/40 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-emerald-300">Связанные workspace-ы</div><p className="mt-1 text-sm leading-relaxed text-tg-text">{cur.related}</p></div>
              </div>

              <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"><div className="text-[10px] font-black uppercase tracking-wide text-emerald-400">🛡 Safety</div><p className="mt-1 text-sm text-tg-muted">{cur.safety}</p></div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {cur.action && <button onClick={() => act(cur.action)} className="rounded-lg bg-tg-active px-4 py-2 text-sm font-semibold text-white">Open →</button>}
                <button onClick={() => setDone((d) => d.includes(cur.id) ? d : [...d, cur.id])} className="rounded-lg bg-tg-bg px-4 py-2 text-sm ring-1 ring-tg-line">Explain ✓</button>
                {tour && (<>
                  <div className="ml-auto flex gap-2">
                    <button onClick={back} disabled={step === 0} className="rounded-lg bg-tg-bg px-3 py-2 text-sm ring-1 ring-tg-line disabled:opacity-40">‹ Back</button>
                    <button onClick={next} className="rounded-lg bg-tg-bg px-3 py-2 text-sm ring-1 ring-tg-line">Skip</button>
                    <button onClick={() => { setTour(false); }} className="rounded-lg bg-tg-bg px-3 py-2 text-sm ring-1 ring-tg-line">Finish</button>
                    <button onClick={() => { setStep(0); setDone([]); setCompleted(false); }} className="rounded-lg bg-tg-bg px-3 py-2 text-sm ring-1 ring-tg-line">Restart</button>
                    <button onClick={next} className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-4 py-2 text-sm font-bold text-white">{step === TOUR.length - 1 ? "Finish ✓" : "Next ›"}</button>
                  </div>
                </>)}
              </div>
            </div>

            {completed && !tour && <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">✓ Тур завершён. Теперь ты знаешь всю структуру панели. Можно перезапустить через Start Tour.</div>}

            {!tour && (
              <div className="mt-4">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-tg-accent">Путь навигации</div>
                <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">{TOUR.map((id, i) => { const s = SECTIONS.find((x) => x.id === id)!; return <span key={id} className="flex items-center gap-1"><button onClick={() => setSel(id)} className={`rounded-full px-2 py-0.5 ${cur.id === id ? "bg-tg-active text-white" : "bg-tg-bg text-tg-muted hover:text-white"}`}>{s.icon} {s.title}</button>{i < TOUR.length - 1 && <span className="text-tg-muted">→</span>}</span>; })}</div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

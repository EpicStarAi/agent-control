"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MISSIONS as SEED_MISSIONS, OPERATOR_EVENTS as SEED_EVENTS,
  LIFECYCLE, statusMeta, eventTone,
  type Mission, type OperatorEvent, type LifecycleTone
} from "@/lib/missions";

// P24 / P24.1 — Mission Center. Loads from the local mission API
// (/api/missions, /api/operator-events); falls back to seed if the API fails.
// Read-only view; the SIMULATED write endpoints are not called from here.

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

function toneClass(t: LifecycleTone) {
  return t === "go" ? "text-sky-300 border-sky-400/40 bg-sky-400/10"
    : t === "warn" ? "text-amber-300 border-amber-400/40 bg-amber-400/10"
    : t === "ok" ? "text-emerald-300 border-emerald-400/40 bg-emerald-400/10"
    : t === "bad" ? "text-rose-300 border-rose-400/40 bg-rose-400/10"
    : "text-white/55 border-white/15 bg-white/5";
}
function prioDot(p: Mission["priority"]) {
  return p === "high" ? "bg-rose-400" : p === "medium" ? "bg-amber-400" : "bg-white/35";
}
function fmt(ts?: string) {
  if (!ts) return "";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString();
}

export function MissionCenter() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [events, setEvents] = useState<OperatorEvent[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"api" | "fallback">("api");
  const [gate, setGate] = useState<{ locked?: boolean; killSwitch?: boolean; live?: boolean; mode?: string } | null>(null);
  const [gateUnknown, setGateUnknown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Approval Gate (live, read-only)
      fetch("/api/operator/production/status", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((g) => { if (!cancelled) { if (g && typeof g === "object") setGate(g); else setGateUnknown(true); } })
        .catch(() => { if (!cancelled) setGateUnknown(true); });

      // Missions + events from the local API, with seed fallback.
      try {
        const [mr, er] = await Promise.all([
          fetch("/api/missions", { cache: "no-store" }),
          fetch("/api/operator-events", { cache: "no-store" })
        ]);
        const md = await mr.json();
        const ed = await er.json();
        if (cancelled) return;
        if (mr.ok && Array.isArray(md.missions) && md.missions.length) {
          setMissions(md.missions);
          setEvents(Array.isArray(ed.events) ? ed.events : SEED_EVENTS);
          setSource("api");
          setSelId((prev) => prev || md.missions[0].id);
        } else {
          throw new Error("empty");
        }
      } catch {
        if (cancelled) return;
        setMissions(SEED_MISSIONS);
        setEvents(SEED_EVENTS);
        setSource("fallback");
        setSelId((prev) => prev || SEED_MISSIONS[0]?.id || "");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const sel = useMemo(() => missions.find((m) => m.id === selId) ?? missions[0], [missions, selId]);
  const locked = Boolean(gate?.locked || gate?.killSwitch);
  const live = gate?.live === true || gate?.mode === "live";
  const gateLabel = gateUnknown ? "—" : locked ? "SAFE MODE · LOCKED" : live ? "LIVE" : "SIMULATION · approval-only";

  if (loading) {
    return <div className={`${card} mx-auto max-w-5xl text-sm text-white/60`}>Загрузка Mission Center…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* Lifecycle legend + Approval Gate */}
      <div className={`${card} mb-4`}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-fuchsia-100">Mission lifecycle</span>
          <span className="text-[11px] text-white/35">источник: {source === "api" ? "/api/missions" : "seed (fallback)"}</span>
          <span className={`ml-auto rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${locked ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-emerald-400/30 bg-emerald-400/5 text-emerald-200"}`}>
            Approval Gate · {gateLabel}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {LIFECYCLE.map((l) => (
            <span key={l.id} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${toneClass(l.tone)}`}>{l.label}</span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Mission list */}
        <section className={card}>
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-fuchsia-100">Missions <span className="ml-auto text-[11px] font-normal text-white/40">{missions.length}</span></div>
          <div className="space-y-2">
            {missions.map((m) => {
              const sm = statusMeta(m.status);
              const active = m.id === selId;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelId(m.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${active ? "border-fuchsia-400/40 bg-fuchsia-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${prioDot(m.priority)}`} />
                    <span className="min-w-0 truncate text-sm font-semibold text-white">{m.title}</span>
                    <span className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${toneClass(sm.tone)}`}>{sm.label}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-white/45">
                    <span>{m.ownerOperator}</span>
                    {m.approvalRequired && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-200">approval</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Detail + activity */}
        <section className="space-y-4">
          {sel && (
            <div className={card}>
              <div className="flex items-start gap-2">
                <h2 className="text-base font-bold text-white">{sel.title}</h2>
                <span className={`ml-auto shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${toneClass(statusMeta(sel.status).tone)}`}>{statusMeta(sel.status).label}</span>
              </div>
              <p className="mt-1 text-[13px] text-white/60">{sel.description}</p>
              <div className="mt-3 overflow-hidden rounded-xl bg-black/20 text-sm">
                <Row label="Владелец" value={sel.ownerOperator} />
                <Row label="Приоритет" value={sel.priority} />
                <Row label="Статус" value={statusMeta(sel.status).label} />
                <Row label="Adapters" value={sel.linkedAdapters.join(" · ")} />
                <Row label="Обновлено" value={fmt(sel.updatedAt)} />
                <Row label="Требует подтверждения" value={sel.approvalRequired ? "да — Approval Gate" : "нет"} />
              </div>
              <div className="mt-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">Audit notes</div>
                <ul className="space-y-1">
                  {sel.auditNotes.map((a, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-[12px] text-white/60"><span className="text-emerald-400">›</span>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className={card}>
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-fuchsia-100">Operator Activity Stream <span className="ml-auto text-[11px] font-normal text-white/35">{events.length}</span></div>
            <div className="max-h-[320px] space-y-1 overflow-auto">
              {events.length === 0 && <div className="p-3 text-[12px] text-white/40">событий нет</div>}
              {events.map((e) => (
                <div key={e.id} className="flex items-baseline gap-2 rounded px-2 py-1 text-[12px] hover:bg-white/5">
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] ${toneClass(eventTone(e))}`}>{e.eventType}</span>
                  <span className="font-semibold text-white/85">{e.sourceOperator}</span>
                  <span className="min-w-0 truncate text-white/55">{e.message}</span>
                  <span className="ml-auto shrink-0 font-mono text-white/30">{new Date(e.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-white/35">
              Данные из локального mission-store (<span className="font-mono">/api/operator-events</span>). Write-эндпоинты симулированы: без Telegram, без внешних вызовов, Approval Gate — manual-only.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-white/45">{label}</span>
      <span className="text-right text-white/80">{value}</span>
    </div>
  );
}

"use client";

import { useState } from "react";
import { CHAR_WIZARD, MEDIA_AGENTS, buildCharacterProfile, type MediaAnswers } from "@/lib/mediaAgents";

// Конструктор персонажа. Config-only: генерит JSON-профиль, реального клонирования/публикаций нет.
export function MediaCharacterWizard() {
  const [agentId, setAgentId] = useState(MEDIA_AGENTS[0].id);
  const [answers, setAnswers] = useState<MediaAnswers>({});
  const [done, setDone] = useState(false);

  const setInput = (id: string, v: string) => setAnswers((p) => ({ ...p, [id]: v }));
  const pick = (id: string, o: string, multi?: boolean) =>
    setAnswers((p) => {
      if (multi) {
        const cur = ([] as string[]).concat((p[id] as string[] | string) || []);
        return { ...p, [id]: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] };
      }
      return { ...p, [id]: o };
    });
  const isSel = (id: string, o: string) => {
    const v = answers[id];
    return Array.isArray(v) ? v.includes(o) : v === o;
  };

  const result = done ? buildCharacterProfile(agentId, answers) : null;

  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-2xl">
        <a href="/media-studio" className="text-sm text-sky-300">← Media Studio</a>
        <h1 className="mb-1 mt-2 text-2xl font-black text-fuchsia-100">Character Builder</h1>
        <p className="mb-5 text-white/70">Собери цифрового персонажа. Router-стаб вернёт JSON-профиль, provider stack и content-pipeline.</p>

        {!done && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-[13px] font-semibold text-fuchsia-100">Тип агента</div>
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[12px] text-tg-text">
                {MEDIA_AGENTS.map((a) => <option key={a.id} value={a.id} className="bg-black">{a.title}</option>)}
              </select>
            </div>
            {CHAR_WIZARD.map((step) => (
              <div key={step.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-[13px] font-semibold text-fuchsia-100">{step.q}{step.multi && <span className="ml-1 text-[10px] text-white/40">(несколько)</span>}</div>
                {step.input ? (
                  <input value={(answers[step.id] as string) || ""} onChange={(e) => setInput(step.id, e.target.value)} placeholder="Введите…" className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[12px]" />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {(step.options || []).map((o) => (
                      <button key={o} onClick={() => pick(step.id, o, step.multi)} className={"rounded-full px-3 py-1 text-[12px] " + (isSel(step.id, o) ? "bg-fuchsia-600/50 text-white" : "bg-white/5 text-white/70 hover:bg-white/10")}>{o}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => setDone(true)} className="w-full rounded-xl bg-fuchsia-600/40 px-4 py-3 text-sm font-semibold hover:bg-fuchsia-600/60">Собрать профиль персонажа</button>
          </div>
        )}

        {done && result && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-1 text-sm uppercase tracking-widest text-fuchsia-300/70">Character profile (JSON)</div>
              <pre className="max-h-72 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] text-white/70">{JSON.stringify(result.profile, null, 2)}</pre>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-1 text-sm uppercase tracking-widest text-fuchsia-300/70">Content pipeline</div>
              <ol className="list-decimal pl-5 text-[12px] text-white/75">{result.pipeline.map((p, i) => <li key={i}>{p}</li>)}</ol>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-1 text-[11px] font-semibold text-emerald-300">Safe actions</div><div className="text-[11px] text-white/70">{result.safe_actions.join(", ")}</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="mb-1 text-[11px] font-semibold text-rose-300">Blocked actions</div><div className="text-[11px] text-white/70">{result.blocked_actions.join(", ")}</div></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDone(false)} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">← Изменить</button>
              <a href="/client" className="rounded-xl bg-fuchsia-600/40 px-4 py-2 text-sm font-semibold hover:bg-fuchsia-600/60">Запустить в EPIC GRAM (Approval)</a>
            </div>
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200">
              consent: {result.profile.consent.identity_type} · клонирование голоса/лица: {String(result.profile.consent.voice_clone_allowed)} · AI-маркировка: обязательна. Реального клонирования и публикаций в MVP нет.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default MediaCharacterWizard;

"use client";

import { useState } from "react";
import { WIZARD, routeAgentTemplate, getAgent, type WizardAnswers } from "@/lib/agentMarketplace";

// Интервью настройки агента. Router AI — детерминированный stub (без модели/сети).
export function AgentSetupWizard({ agentId }: { agentId: string }) {
  const agent = getAgent(agentId);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [done, setDone] = useState(false);

  const pick = (stepId: string, option: string, multi?: boolean) => {
    setAnswers((prev) => {
      if (multi) {
        const cur = ([] as string[]).concat((prev[stepId] as string[] | string) || []);
        const next = cur.includes(option) ? cur.filter((x) => x !== option) : [...cur, option];
        return { ...prev, [stepId]: next };
      }
      return { ...prev, [stepId]: option };
    });
  };
  const isSel = (stepId: string, option: string) => {
    const v = answers[stepId];
    return Array.isArray(v) ? v.includes(option) : v === option;
  };

  if (!agent) {
    return <main className="min-h-screen px-5 py-10 text-white/80">Агент не найден. <a href="/marketplace" className="text-sky-300">← Маркетплейс</a></main>;
  }

  const profile = done ? routeAgentTemplate(agentId, answers) : null;

  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-2xl">
        <a href={`/marketplace/agent/${agentId}`} className="text-sm text-sky-300">← {agent.title}</a>
        <h1 className="mb-1 mt-2 text-2xl font-black text-fuchsia-100">Настройка: {agent.title}</h1>
        <p className="mb-6 text-white/70">Ответь на короткие вопросы — Router AI соберёт профиль под проект.</p>

        {!done && (
          <div className="space-y-4">
            {WIZARD.map((step) => (
              <div key={step.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-[13px] font-semibold text-fuchsia-100">{step.q}{step.multi && <span className="ml-1 text-[10px] text-white/40">(можно несколько)</span>}</div>
                <div className="flex flex-wrap gap-1.5">
                  {step.options.map((o) => (
                    <button
                      key={o}
                      onClick={() => pick(step.id, o, step.multi)}
                      className={"rounded-full px-3 py-1 text-[12px] " + (isSel(step.id, o) ? "bg-fuchsia-600/50 text-white" : "bg-white/5 text-white/70 hover:bg-white/10")}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => setDone(true)} className="w-full rounded-xl bg-fuchsia-600/40 px-4 py-3 text-sm font-semibold hover:bg-fuchsia-600/60">
              Собрать профиль агента
            </button>
          </div>
        )}

        {done && profile && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-1 text-sm uppercase tracking-widest text-fuchsia-300/70">Playbook</div>
              <ol className="list-decimal pl-5 text-[12px] text-white/75">
                {profile.playbook.map((p, i) => <li key={i}>{p}</li>)}
              </ol>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-[11px] font-semibold text-emerald-300">Safe actions</div>
                <div className="text-[11px] text-white/70">{profile.safe_actions.join(", ")}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-[11px] font-semibold text-rose-300">Blocked actions</div>
                <div className="text-[11px] text-white/70">{profile.blocked_actions.join(", ")}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-1 text-[11px] font-semibold text-fuchsia-100">Монетизация</div>
              <div className="text-[11px] text-white/70">{profile.monetization_path.join(" · ") || "—"}</div>
              <div className="mt-2 mb-1 text-[11px] font-semibold text-fuchsia-100">Следующие шаги</div>
              <ul className="list-disc pl-5 text-[11px] text-white/70">{profile.next_steps.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setDone(false)} className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">← Изменить ответы</button>
              <a href="/client" className="rounded-xl bg-fuchsia-600/40 px-4 py-2 text-sm font-semibold hover:bg-fuchsia-600/60">Запустить в EPIC GRAM (Approval)</a>
            </div>
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200">
              Агент по умолчанию MANUAL_APPROVAL_ONLY. Auto-send и bulk выключены. High-risk действия — только через подтверждение.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default AgentSetupWizard;

import { getAgent } from "@/lib/agentMarketplace";

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

export default function AgentProfilePage({ params }: { params: { id: string } }) {
  const a = getAgent(params.id);
  if (!a) {
    return (
      <main className="min-h-screen px-5 py-10 text-white/80">
        Агент не найден. <a href="/marketplace" className="text-sky-300">← Маркетплейс</a>
      </main>
    );
  }
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-3xl">
        <a href="/marketplace" className="text-sm text-sky-300">← AI-специалисты</a>
        <h1 className="mb-1 mt-2 text-3xl font-black text-fuchsia-100">{a.title}</h1>
        <p className="mb-5 text-white/70">{a.description}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={card}>
            <div className="mb-1 text-[11px] uppercase tracking-widest text-fuchsia-300/70">Навыки</div>
            <div className="flex flex-wrap gap-1">{a.skills.map((s) => <span key={s} className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-white/75">{s}</span>)}</div>
          </div>
          <div className={card}>
            <div className="mb-1 text-[11px] uppercase tracking-widest text-fuchsia-300/70">Подходит для</div>
            <div className="text-[12px] text-white/70">{a.project_types.join(" · ")}</div>
          </div>
          <div className={card}>
            <div className="mb-1 text-[11px] font-semibold text-emerald-300">Safe actions</div>
            <div className="text-[12px] text-white/70">{a.safe_actions.join(", ")}</div>
          </div>
          <div className={card}>
            <div className="mb-1 text-[11px] font-semibold text-rose-300">Blocked actions</div>
            <div className="text-[12px] text-white/70">{a.blocked_actions.join(", ")}</div>
          </div>
          <div className={card}>
            <div className="mb-1 text-[11px] uppercase tracking-widest text-fuchsia-300/70">Монетизация</div>
            <div className="text-[12px] text-white/70">{a.monetization.join(" · ")}</div>
          </div>
          <div className={card}>
            <div className="mb-1 text-[11px] uppercase tracking-widest text-fuchsia-300/70">Режим</div>
            <div className="text-[12px] text-emerald-300/85">{a.automation_level.replace(/_/g, " ")} · Safe Mode / Approval Required</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <a href={`/marketplace/setup/${a.agent_id}`} className="rounded-xl bg-fuchsia-600/40 px-5 py-3 text-sm font-semibold hover:bg-fuchsia-600/60">Настроить под проект</a>
          <a href={`/marketplace/setup/${a.agent_id}`} className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm hover:bg-white/10">Посмотреть сценарии</a>
          <a href="/client" className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm hover:bg-white/10">Запустить в EPIC GRAM</a>
        </div>
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200">
          Агент по умолчанию MANUAL_APPROVAL_ONLY. Auto-send и bulk выключены. High-risk действия — только через подтверждение.
        </p>
      </div>
    </main>
  );
}

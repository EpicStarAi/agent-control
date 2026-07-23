import { AGENTS, CATEGORIES, agentsByCategory, type AgentTemplate } from "@/lib/agentMarketplace";

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

function AgentCard({ a }: { a: AgentTemplate }) {
  return (
    <div className={card}>
      <div className="text-[13px] font-bold text-fuchsia-100">{a.title}</div>
      <div className="mt-1 text-[12px] text-white/60">{a.description}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        {a.skills.slice(0, 4).map((s) => (
          <span key={s} className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">{s}</span>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-white/50">Монетизация: {a.monetization.join(" · ")}</div>
      <div className="mt-1 text-[10px] text-emerald-300/80">Режим: {a.automation_level.replace(/_/g, " ")} · Safe Mode / Approval</div>
      <div className="mt-3 flex flex-wrap gap-1">
        <a href={`/marketplace/agent/${a.agent_id}`} className="rounded-lg bg-fuchsia-600/30 px-3 py-1 text-[12px] font-semibold hover:bg-fuchsia-600/50">Выбрать</a>
        <a href={`/marketplace/setup/${a.agent_id}`} className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-[12px] hover:bg-white/10">Настроить</a>
      </div>
    </div>
  );
}

// Каталог AI-специалистов. Если задан category — только он.
export function AgentMarketplace({ category }: { category?: string }) {
  const list = category ? agentsByCategory(category) : AGENTS;
  const catTitle = category ? CATEGORIES.find((c) => c.id === category)?.title ?? category : null;
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-5xl">
        <a href="/" className="text-sm text-sky-300">← EPIC☠GRAM</a>
        <h1 className="mb-1 mt-2 text-3xl font-black text-fuchsia-100">AI-специалисты</h1>
        <p className="mb-5 text-white/70">Найди AI-специалиста под задачу — как маркетплейс вакансий, только вместо людей цифровые операторы.</p>

        {/* Направления */}
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={`/marketplace/${c.id}`}
              className={"rounded-full px-3 py-1 text-[12px] " + (c.id === category ? "bg-fuchsia-600/40 text-white" : "bg-white/5 text-white/70 hover:bg-white/10")}
            >
              {c.title}
            </a>
          ))}
        </div>

        {catTitle && <h2 className="mb-3 text-sm uppercase tracking-widest text-fuchsia-300/70">{catTitle}</h2>}
        {list.length === 0 ? (
          <div className="text-[13px] text-white/60">В этой категории агенты появятся скоро.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <AgentCard key={a.agent_id} a={a} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default AgentMarketplace;

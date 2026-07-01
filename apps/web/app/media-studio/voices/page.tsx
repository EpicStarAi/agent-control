import { PROVIDERS } from "@/lib/mediaAgents";

export const metadata = { title: "EPIC GRAM — Voices" };

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

export default function VoicesPage() {
  const voices = PROVIDERS.filter((p) => p.kind === "voice");
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-3xl">
        <a href="/media-studio" className="text-sm text-sky-300">← Media Studio</a>
        <h1 className="mb-1 mt-2 text-2xl font-black text-fuchsia-100">Voices</h1>
        <p className="mb-5 text-white/70">Голосовые провайдеры (сменяемые). Клонирование — только для своего/согласованного голоса; в MVP реального клонирования нет.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {voices.map((v) => (
            <div key={v.id} className={card}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-fuchsia-100">{v.label}</span>
                <span className={"text-[11px] " + (v.status === "available" ? "text-emerald-300" : "text-white/40")}>{v.status === "available" ? "готов" : "скоро"}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200">Voice clone разрешён только при verified consent. AI-озвучка маркируется.</p>
      </div>
    </main>
  );
}

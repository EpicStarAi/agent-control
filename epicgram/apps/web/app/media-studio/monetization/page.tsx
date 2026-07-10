import { MONETIZATION } from "@/lib/mediaAgents";

export const metadata = { title: "EPIC GRAM — Media Monetization" };
const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

export default function MediaMonetizationPage() {
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-3xl">
        <a href="/media-studio" className="text-sm text-sky-300">← Media Studio</a>
        <h1 className="mb-1 mt-2 text-2xl font-black text-fuchsia-100">Media Monetization</h1>
        <p className="mb-5 text-white/70">Модели дохода AI-персонажа. Финансовые действия — по подтверждению; автопереводов/выводов нет.</p>
        <div className="flex flex-wrap gap-2">
          {MONETIZATION.map((m) => <span key={m} className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] text-white/80">{m}</span>)}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href="/media-studio/characters" className={card + " hover:bg-white/10 text-[12px]"}>Собрать персонажа с монетизацией →</a>
        </div>
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200">
          Полный денежный контур (Stars / TON / Wallet / creator revenue) — в модуле Wallet (P22).
        </p>
      </div>
    </main>
  );
}

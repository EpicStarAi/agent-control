import { OperatorCouncil } from "@/components/OperatorCouncil";

export const metadata = { title: "EPIC GRAM — Operator Council" };

export default function CouncilPage() {
  return (
    <main className="min-h-screen px-5 py-8 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto mb-5 flex max-w-5xl flex-wrap items-center gap-3">
        <h1 className="text-xl font-black text-fuchsia-100">EPIC☠GRAM · Operator Council</h1>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">Mission Room · Event Bus · Approval Gate</span>
        <nav className="ml-auto flex gap-2 text-sm">
          <a href="/client" className="rounded-lg bg-white/10 px-3 py-1.5 text-white/80 hover:bg-white/20">Рабочая область</a>
          <a href="/platform" className="rounded-lg bg-white/10 px-3 py-1.5 text-white/80 hover:bg-white/20">Платформа</a>
          <a href="/agents" className="rounded-lg bg-white/10 px-3 py-1.5 text-white/80 hover:bg-white/20">AI-агенты</a>
          <a href="/v1/docs" target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 px-3 py-1.5 text-sky-300 hover:bg-white/20">API Docs</a>
        </nav>
      </div>
      <OperatorCouncil />
      <p className="mx-auto mt-5 max-w-5xl text-[11px] text-white/40">
        Ядро — в клиенте. Telegram — внешний адаптер. Совет операторов только наблюдает поток и предлагает; всё исходящее проходит через Approval Gate. Секреты не отображаются.
      </p>
    </main>
  );
}

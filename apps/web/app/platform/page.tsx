import { PlatformPanel } from "@/components/PlatformPanel";

export const metadata = { title: "EPIC GRAM — Platform Workspace" };

export default function PlatformPage() {
  return (
    <main className="min-h-screen px-5 py-8 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto mb-5 flex max-w-5xl flex-wrap items-center gap-3">
        <h1 className="text-xl font-black text-fuchsia-100">EPIC☠GRAM · Platform Workspace</h1>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">Account Info · Device Manager · Live Events</span>
        <nav className="ml-auto flex gap-2 text-sm">
          <a href="/client" className="rounded-lg bg-white/10 px-3 py-1.5 text-white/80 hover:bg-white/20">Рабочая область</a>
          <a href="/agents" className="rounded-lg bg-white/10 px-3 py-1.5 text-white/80 hover:bg-white/20">AI-агенты</a>
          <a href="/v1/docs" target="_blank" rel="noreferrer" className="rounded-lg bg-white/10 px-3 py-1.5 text-sky-300 hover:bg-white/20">API Docs</a>
        </nav>
      </div>
      <PlatformPanel />
      <p className="mx-auto mt-5 max-w-5xl text-[11px] text-white/40">
        Данные читаются из живого контракта /api/v1/* (accounts · capabilities · runtime events). Команды идут по REST, обновления — по SSE. Секреты не отображаются.
      </p>
    </main>
  );
}

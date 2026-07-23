export const metadata = { title: "EPIC GRAM — Locations & Style" };

const STYLES = ["Neon Cyber", "Минимал", "Гламур", "Стрит", "Аниме", "Реализм"];
const LOCATIONS = ["Квартира", "Студия", "Улица", "Сцена", "Виртуальная сцена"];
const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

export default function LocationsPage() {
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-3xl">
        <a href="/media-studio" className="text-sm text-sky-300">← Media Studio</a>
        <h1 className="mb-1 mt-2 text-2xl font-black text-fuchsia-100">Locations & Visual Style</h1>
        <p className="mb-5 text-white/70">Стиль и локации персонажа. Визуал генерится через image/video-провайдера (Grok Imagine) с обязательной AI-маркировкой.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={card}>
            <div className="mb-2 text-[11px] uppercase tracking-widest text-fuchsia-300/70">Визуальный стиль</div>
            <div className="flex flex-wrap gap-1.5">{STYLES.map((s) => <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-[12px] text-white/75">{s}</span>)}</div>
          </div>
          <div className={card}>
            <div className="mb-2 text-[11px] uppercase tracking-widest text-fuchsia-300/70">Локации / студии</div>
            <div className="flex flex-wrap gap-1.5">{LOCATIONS.map((s) => <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-[12px] text-white/75">{s}</span>)}</div>
          </div>
        </div>
        <a href="/media-studio/characters" className="mt-5 inline-block rounded-xl bg-fuchsia-600/40 px-4 py-2 text-sm font-semibold hover:bg-fuchsia-600/60">Задать в Character Builder</a>
      </div>
    </main>
  );
}

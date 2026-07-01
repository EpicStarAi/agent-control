export const metadata = { title: "EPIC GRAM — Downloads" };

// Реальные URL не выдумываем: где сборки/публикация не готовы — disabled «Скоро».
type Item = { name: string; note: string; sub?: string; href?: string };

const DESKTOP: Item[] = [
  { name: "Windows Desktop", note: "Скоро", sub: "сборка готовится" },
  { name: "macOS Desktop", note: "Скоро", sub: "сборка готовится" },
  { name: "Linux Desktop", note: "Скоро", sub: "сборка готовится" },
];
const ANDROID: Item[] = [
  { name: "Google Play", note: "Скоро", sub: "готовим публикацию · официальный релиз через verified Google Play Developer" },
  { name: "Android APK", note: "Скоро", sub: "direct install · только с epic-gram.com" },
];
const WEB: Item[] = [
  { name: "Web Client", note: "Открыть", sub: "работает сейчас", href: "/client" },
  { name: "Telegram WebApp / TMA", note: "Скоро", sub: "открыть внутри Telegram" },
];

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

function Cards({ title, items }: { title: string; items: Item[] }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm uppercase tracking-widest text-fuchsia-300/70">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <div key={it.name} className={card}>
            <div className="text-[13px] font-bold text-fuchsia-100">{it.name}</div>
            {it.sub && <div className="mt-1 text-[11px] text-white/50">{it.sub}</div>}
            {it.href ? (
              <a href={it.href} className="mt-3 inline-block rounded-lg bg-fuchsia-600/30 px-3 py-1 text-[12px] font-semibold hover:bg-fuchsia-600/50">{it.note}</a>
            ) : (
              <span className="mt-3 inline-block cursor-not-allowed rounded-lg bg-white/10 px-3 py-1 text-[12px] text-white/40">{it.note}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DownloadsPage() {
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-4xl">
        <a href="/" className="text-sm text-sky-300">← EPIC☠GRAM</a>
        <h1 className="mb-6 mt-2 text-3xl font-black text-fuchsia-100">Скачать EPIC☠GRAM</h1>
        <Cards title="Desktop" items={DESKTOP} />
        <Cards title="Android" items={ANDROID} />
        <Cards title="Web" items={WEB} />
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-200">
          <b>Официальные источники.</b> EPIC GRAM распространяется только через epic-gram.com, Google Play
          и официальный Telegram WebApp. Не устанавливайте APK из неизвестных источников.
        </p>
      </div>
    </main>
  );
}

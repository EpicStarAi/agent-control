import { Link } from "wouter";

// EPIC☠GRAM public portal landing — ported from the real Next.js PortalLanding
// component (epicgram/apps/web/components/PortalLanding.tsx), presentational only.
type Svc = { name: string; desc: string; href?: string };
type Feature = { name: string; desc: string };

const SERVICES: Svc[] = [
  { name: "EPIC GRAM AI Telegram Client", desc: "TDLib-клиент: чаты, каналы, группы, боты", href: "/client" },
  { name: "STAR Console", desc: "Операторская консоль / Agent OS" },
  { name: "Cyber Neon VPN", desc: "VPN веб-клиент" },
  { name: "Editorial Hub", desc: "Контент и публикации" },
];

const FEATURES: Feature[] = [
  { name: "TDLib Client", desc: "Настоящий Telegram-клиент" },
  { name: "AI Operator", desc: "Готовит черновики, не отправляет сам" },
  { name: "Approval Gate", desc: "Действия — только после подтверждения" },
  { name: "Safe Mode", desc: "Аварийная блокировка по умолчанию" },
  { name: "Desktop / Mobile / TMA", desc: "Windows / macOS / Linux, Android, Telegram Mini App" },
  { name: "Channel OS", desc: "Карточная система управления каналами" },
];

const card = "rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_24px_rgba(168,85,247,.08)]";

export default function Landing() {
  return (
    <main className="min-h-screen text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-white/10 bg-black/40 px-5 py-3 backdrop-blur">
        <span className="text-lg font-black tracking-wide text-fuchsia-200">EPIC☠GRAM</span>
        <nav className="flex flex-wrap gap-3 text-sm text-white/70">
          <Link href="/downloads" className="hover:text-white">Downloads</Link>
          <Link href="/login" className="hover:text-white">Login</Link>
          <Link href="/client" className="hover:text-white">Client</Link>
          <Link href="/apps" className="hover:text-white">Apps</Link>
          <Link href="/channel-os" className="hover:text-white">Channel OS</Link>
        </nav>
        <Link href="/client" className="ml-auto rounded-xl bg-fuchsia-600/40 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-600/60">
          Открыть платформу
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-5 pt-16 pb-10 text-center">
        <div className="mb-4 inline-block rounded-full border border-white/15 px-3 py-1 text-xs tracking-widest text-amber-300">PRIVATE BETA</div>
        <h1 className="text-5xl font-black text-fuchsia-100">EPIC☠GRAM</h1>
        <p className="mt-2 text-xl text-white/85">Telegram AI Workspace</p>
        <p className="mx-auto mt-3 max-w-2xl text-white/70">
          Telegram + AI workspace для операторов, каналов, групп и ботов. Один вход через Telegram.
          AI готовит черновики, человек подтверждает действия. Safe Mode по умолчанию.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/client" className="rounded-xl bg-fuchsia-600/40 px-5 py-3 text-sm font-semibold hover:bg-fuchsia-600/60">Открыть Web Client</Link>
          <Link href="/login" className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10">Войти через Telegram</Link>
          <Link href="/downloads" className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold hover:bg-white/10">Скачать приложение</Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-8">
        <h2 className="mb-3 text-sm uppercase tracking-widest text-fuchsia-300/70">Сервисы платформы</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <div key={s.name} className={card}>
              <div className="text-[13px] font-bold text-fuchsia-100">{s.name}</div>
              <div className="mt-1 text-[12px] text-white/60">{s.desc}</div>
              {s.href ? (
                <Link href={s.href} className="mt-3 inline-block rounded-lg bg-fuchsia-600/30 px-3 py-1 text-[12px] font-semibold hover:bg-fuchsia-600/50">Открыть</Link>
              ) : (
                <span className="mt-3 inline-block cursor-not-allowed rounded-lg bg-white/10 px-3 py-1 text-[12px] text-white/40">Скоро</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <h2 className="mb-3 text-sm uppercase tracking-widest text-fuchsia-300/70">Возможности</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.name} className={card}>
              <div className="text-[13px] font-bold text-fuchsia-100">{f.name}</div>
              <div className="mt-1 text-[12px] text-white/60">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-6 text-center text-xs text-white/45">
        Private beta · owner-operated automation only
      </footer>
    </main>
  );
}

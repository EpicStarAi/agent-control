import { Link } from "wouter";

const HUB: { title: string; desc: string; href: string }[] = [
  { title: "Web Client", desc: "Полный Telegram-клиент в браузере", href: "/client" },
  { title: "Telegram Mini App", desc: "Открыть EPIC GRAM внутри Telegram", href: "/tma" },
  { title: "Desktop", desc: "Windows / macOS / Linux", href: "/desktop" },
  { title: "Mobile", desc: "Android / iOS", href: "/mobile" },
  { title: "Channel OS", desc: "Карточная система управления каналами", href: "/channel-os" },
  { title: "Downloads", desc: "Все способы получить EPIC GRAM", href: "/downloads" },
];

export default function Apps() {
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="text-sm text-sky-300">← EPIC☠GRAM</Link>
        <h1 className="mb-6 mt-2 text-3xl font-black text-fuchsia-100">Приложения EPIC GRAM</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HUB.map((h) => (
            <Link key={h.title} href={h.href} className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10">
              <div className="text-[13px] font-bold text-fuchsia-100">{h.title}</div>
              <div className="mt-1 text-[12px] text-white/60">{h.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

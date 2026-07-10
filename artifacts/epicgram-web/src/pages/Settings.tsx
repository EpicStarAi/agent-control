import { Link } from "wouter";

export default function Settings() {
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-2xl">
        <Link href="/client" className="text-sm text-sky-300">← Web Client</Link>
        <h1 className="mb-4 mt-2 text-3xl font-black text-fuchsia-100">Настройки</h1>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Read-only визуальный раздел. Источник данных — существующий Telegram Layer
          (TDLib через /api/telegram). Реальные Telegram-действия отключены.
          Backend/авторизация/маршруты не затрагиваются.
        </div>
      </div>
    </main>
  );
}

import { Link } from "wouter";

// Ported from epicgram/apps/web/app/login/page.tsx. Real TDLib login flow
// (QR / phone / code / 2FA) lives inside the Web Client — this is the entry screen.
const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

export default function Login() {
  return (
    <main className="min-h-screen px-5 py-12 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-lg">
        <Link href="/" className="text-sm text-sky-300">← EPIC☠GRAM</Link>
        <h1 className="mb-1 mt-2 text-3xl font-black text-fuchsia-100">Войти через Telegram</h1>
        <p className="mb-6 text-white/70">Один вход через Telegram. После авторизации откроется EPIC GRAM Web Client.</p>

        <div className={card}>
          <div className="mb-2 text-sm uppercase tracking-widest text-fuchsia-300/70">Способы входа</div>
          <ul className="space-y-1 text-[13px] text-white/80">
            <li>• Войти через QR-код</li>
            <li>• Войти по номеру телефона</li>
            <li>• Код подтверждения из Telegram</li>
            <li>• Двухфакторный пароль (2FA), если включён</li>
          </ul>
          <Link href="/client" className="mt-4 block rounded-xl bg-fuchsia-600/40 px-4 py-3 text-center text-sm font-semibold hover:bg-fuchsia-600/60">
            Войти через Telegram → Web Client
          </Link>
        </div>

        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-200">
          Отправка сообщений — только после подтверждения человека (Approval Gate). Safe Mode по умолчанию.
        </p>
      </div>
    </main>
  );
}

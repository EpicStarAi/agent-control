export const metadata = { title: "EPIC GRAM — Login" };

// Дружелюбный вход через Telegram. Реальный TDLib-flow (QR / номер / код / 2FA / reset)
// живёт в Web Client (EpicGramShell) — здесь entry-экран, ведущий в /client, где шелл
// показывает авторизацию, если ещё не выполнен вход, и открывает клиент после успеха.

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

export default function LoginPage() {
  return (
    <main className="min-h-screen px-5 py-12 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-lg">
        <a href="/" className="text-sm text-sky-300">← EPIC☠GRAM</a>
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
          <a href="/client" className="mt-4 block rounded-xl bg-fuchsia-600/40 px-4 py-3 text-center text-sm font-semibold hover:bg-fuchsia-600/60">
            Войти через Telegram → Web Client
          </a>
        </div>

        <div className={`${card} mt-4`}>
          <div className="mb-1 text-sm font-semibold text-fuchsia-100">Нет аккаунта Telegram?</div>
          <p className="text-[13px] text-white/70">
            Создайте аккаунт в официальном приложении Telegram, затем вернитесь сюда и войдите
            через QR-код или номер телефона.
          </p>
        </div>

        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-200">
          Отправка сообщений — только после подтверждения человека (Approval Gate). Safe Mode по умолчанию.
        </p>
      </div>
    </main>
  );
}

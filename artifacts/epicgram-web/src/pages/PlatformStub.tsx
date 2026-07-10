import { Link } from "wouter";

// Shared shell for the small hub pages that don't have a real build/native
// counterpart yet (desktop, mobile, tma, channel-os). Honest "coming soon"
// state — no fake links, no simulated downloads.
export default function PlatformStub({ title, body, note }: { title: string; body: string; note?: string }) {
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-2xl">
        <Link href="/apps" className="text-sm text-sky-300">← Приложения</Link>
        <h1 className="mb-4 mt-2 text-3xl font-black text-fuchsia-100">{title}</h1>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">{body}</div>
        {note && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-200">{note}</p>
        )}
        <Link href="/client" className="mt-6 inline-block rounded-xl bg-fuchsia-600/40 px-4 py-3 text-sm font-semibold hover:bg-fuchsia-600/60">
          Открыть Web Client
        </Link>
      </div>
    </main>
  );
}

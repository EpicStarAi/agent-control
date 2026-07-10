import { Link } from "wouter";

// Channel OS — card-based channel management surface (Phase 6 of the spec).
// Read-only cards backed by /api/telegram/chats (channels only); creating or
// editing a channel remains a manual, approval-gated action — never automated here.
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

type Chat = { id: any; title?: string; username?: string | null; isChannel?: boolean; category?: string; memberCount?: number };

export default function ChannelOs() {
  const [channels, setChannels] = useState<Chat[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "offline">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await fetch(apiUrl("/telegram/status"), { cache: "no-store" }).then((r) => r.json()).catch(() => null);
        const active = s?.accounts?.[0];
        if (!active) { if (alive) { setStatus("offline"); } return; }
        const cj = await fetch(apiUrl("/telegram/chats?accountId=" + encodeURIComponent(active.slotId || active.label || "")), { cache: "no-store" }).then((r) => r.json()).catch(() => null);
        const list: Chat[] = cj?.chats || cj?.body?.chats || [];
        if (!alive) return;
        setChannels(list.filter((c) => c.isChannel || c.category === "channel"));
        setStatus("ready");
      } catch {
        if (alive) setStatus("offline");
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-5xl">
        <Link href="/apps" className="text-sm text-sky-300">← Приложения</Link>
        <h1 className="mb-2 mt-2 text-3xl font-black text-fuchsia-100">Channel OS</h1>
        <p className="mb-6 text-sm text-white/60">Карточная система ваших каналов. Read-only, данные — из существующего Telegram Layer.</p>

        {status === "loading" && <div className="text-sm text-white/50">Загрузка…</div>}
        {status === "offline" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
            Нет авторизованной сессии Telegram. Войдите через <Link href="/login" className="underline">/login</Link>, чтобы увидеть свои каналы.
          </div>
        )}
        {status === "ready" && (
          channels.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {channels.map((c) => (
                <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-[13px] font-bold text-fuchsia-100">{c.title || "channel"}</div>
                  <div className="mt-1 text-[11px] text-white/50">{c.memberCount ? c.memberCount.toLocaleString() + " подписчиков" : "—"}</div>
                  <span className="mt-3 inline-block cursor-not-allowed rounded-lg bg-white/10 px-3 py-1 text-[12px] text-white/40">Редактирование — вручную в Web Client</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">Каналов не найдено.</div>
          )
        )}
      </div>
    </main>
  );
}

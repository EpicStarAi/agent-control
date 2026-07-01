import { MEDIA_AGENTS, PROVIDERS, type Provider } from "@/lib/mediaAgents";

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";

const MODULES = [
  { href: "/media-studio/characters", title: "Characters", desc: "Конструктор персонажа" },
  { href: "/media-studio/voices", title: "Voices", desc: "Голосовые провайдеры" },
  { href: "/media-studio/locations", title: "Locations", desc: "Локации / студии" },
  { href: "/media-studio/live", title: "Live Studio", desc: "Realtime video-chat (концепт)" },
  { href: "/media-studio/monetization", title: "Monetization", desc: "Модели дохода" },
];

export function MediaStudio() {
  const byKind = (k: Provider["kind"]) => PROVIDERS.filter((p) => p.kind === k);
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-5xl">
        <a href="/marketplace" className="text-sm text-sky-300">← AI-специалисты</a>
        <h1 className="mb-1 mt-2 text-3xl font-black text-fuchsia-100">AI Media / Virtual Creator Studio</h1>
        <p className="mb-5 text-white/70">Цифровые создатели: блогеры, стримеры, ведущие, двойники, video-chat аватары. Config-only, без реального клонирования.</p>

        {/* Модули студии */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MODULES.map((m) => (
            <a key={m.href} href={m.href} className={card + " hover:bg-white/10"}>
              <div className="text-[13px] font-bold text-fuchsia-100">{m.title}</div>
              <div className="mt-1 text-[11px] text-white/55">{m.desc}</div>
            </a>
          ))}
        </div>

        {/* Агенты медиа */}
        <h2 className="mb-3 text-sm uppercase tracking-widest text-fuchsia-300/70">AI Media агенты</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MEDIA_AGENTS.map((a) => (
            <div key={a.id} className={card}>
              <div className="text-[13px] font-bold text-fuchsia-100">{a.title}</div>
              <div className="mt-1 text-[12px] text-white/60">{a.description}</div>
              <div className="mt-2 text-[10px] text-white/45">Интеграции: {a.integrations.join(" · ")}</div>
              <div className="mt-1 text-[10px] text-emerald-300/80">Монетизация: {a.monetization.join(" · ")}</div>
              <div className="mt-3">
                <a href="/media-studio/characters" className="rounded-lg bg-fuchsia-600/30 px-3 py-1 text-[12px] font-semibold hover:bg-fuchsia-600/50">Собрать персонажа</a>
              </div>
            </div>
          ))}
        </div>

        {/* Provider stack обзор */}
        <h2 className="mb-3 mt-6 text-sm uppercase tracking-widest text-fuchsia-300/70">Provider stack (сменяемый)</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-[11px] text-white/70">
          {(["brain", "voice", "avatar", "image_video", "realtime", "streaming"] as Provider["kind"][]).map((k) => (
            <div key={k} className={card}>
              <div className="mb-1 text-[10px] uppercase text-fuchsia-300/70">{k.replace("_", "/")}</div>
              {byKind(k).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span>{p.label}</span>
                  <span className={p.status === "available" ? "text-emerald-300" : "text-white/40"}>{p.status === "available" ? "готов" : "скоро"}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] text-amber-200">
          Клонирование голоса/лица — только для вымышленного персонажа или реального человека с подтверждённым согласием. AI-контент маркируется. В MVP реального клонирования нет.
        </p>
      </div>
    </main>
  );
}

export default MediaStudio;

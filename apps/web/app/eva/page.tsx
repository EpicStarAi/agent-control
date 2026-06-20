"use client";
// EVA STATIC LANDING · /eva · STATIC_SAFE_MODE. Public showcase for EVA NOVIKOVA (fictional digital media persona).
// NO fetch/XHR/WebSocket/API routes/server actions · NO backend · NO OAuth/credentials · NO analytics/tracking · NO automation · NO payment.
import { useEffect } from "react";

const NEON = { v: "#a855f7", r: "#f43f5e", c: "#22d3ee" };

const FORMATS = ["Night radio intros", "Short video teasers", "Visual quotes", "Behind-the-scenes worldbuilding", "Weekly broadcast previews", "AI newsroom crossovers"];
const GALLERY = [
  { t: "EVA Night Room", g: "linear-gradient(135deg,#2a1040,#6d1a4a)" },
  { t: "DEEPINSIDE Radio Studio", g: "linear-gradient(135deg,#1a0f3a,#7a1f5c)" },
  { t: "Cyber Kyiv Zone", g: "linear-gradient(135deg,#10243a,#a8326a)" },
  { t: "AI Newsroom", g: "linear-gradient(135deg,#241038,#4a1f7a)" },
];
const ROADMAP: [string, string[]][] = [
  ["30 days", ["Identity polish", "First visual pack", "Manual Telegram posts", "Website showcase"]],
  ["90 days", ["Content rhythm", "Radio segment previews", "Media asset library", "Audience testing"]],
  ["365 days", ["Full digital media ecosystem", "Multi-persona shows", "Virtual location", "Monetization readiness review"]],
];
const SAFETY: [string, string][] = [
  ["Runtime Enabled", "false"], ["Automation Allowed", "false"], ["Telegram Automation", "false"], ["Platform API Calls", "false"],
  ["Credentials Required", "false"], ["Device Control", "false"], ["Publishing Mode", "MANUAL_ONLY"], ["Manual Review Required", "true"],
];

function Card({ children, className = "" }: { children: any; className?: string }) {
  return <div className={"rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl " + className}>{children}</div>;
}
function H({ children }: { children: any }) { return <h2 className="mb-3 text-xs font-black uppercase tracking-[0.25em]" style={{ color: NEON.v }}>{children}</h2>; }

export default function EvaLandingPage() {
  useEffect(() => {
    try {
      localStorage.setItem("deepinside.eva.staticLanding.v1", JSON.stringify({
        mode: "STATIC_SAFE_MODE", runtime_enabled: false, automation_allowed: false, telegram_automation: false,
        platform_api_calls: false, credentials_required: false, device_control: false, publishing_mode: "MANUAL_ONLY",
        pageStatus: "STATIC_PREVIEW", sections: ["hero", "about", "radio", "formats", "gallery", "roadmap", "contact", "safety"],
        updatedAt: new Date().toISOString(),
      }));
    } catch {}
  }, []);

  return (
    <main className="min-h-screen w-full text-white" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #2a0f3e55, transparent), radial-gradient(900px 500px at 100% 20%, #5a0f2e44, transparent), linear-gradient(180deg,#070509,#0a0710 60%,#070509)" }}>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:py-16">

        {/* 1 · HERO */}
        <section className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full text-4xl" style={{ background: "radial-gradient(circle,#6d1a4a,#1a0f3a)", boxShadow: `0 0 60px ${NEON.r}55` }}>💠</div>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl" style={{ textShadow: `0 0 30px ${NEON.v}66` }}>EVA NOVIKOVA</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em]" style={{ color: NEON.c }}>AI Host · Deepinside Radio · Night Media Persona</p>
          <div className="mt-4 inline-block rounded-full border px-3 py-1 text-[11px] font-bold" style={{ borderColor: NEON.r + "66", color: "#fbbf24", background: "#f59e0b15" }}>SAFE-MODE PREVIEW</div>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/70">A cinematic digital media persona from the DEEPINSIDE.LIFE ecosystem.</p>
        </section>

        {/* 2 · ABOUT */}
        <Card className="mb-5">
          <H>About EVA</H>
          <p className="text-[14px] leading-relaxed text-white/70">EVA NOVIKOVA is a <b className="text-white/90">fictional, AI-native digital media persona</b> — a character within the DEEPINSIDE.LIFE universe, not a real person. This page is part of an <b className="text-white/90">upcoming launch phase</b>: the show, radio, and content described here are in <b className="text-white/90">preview / worldbuilding</b> and are not yet live. EVA represents a tone — warm neon, night-city aesthetics, an honest connection with the audience — designed as the flagship host of a digital media world.</p>
        </Card>

        {/* 3 · RADIO CONCEPT */}
        <Card className="mb-5">
          <H>DEEPINSIDE Radio · Concept</H>
          <div className="grid gap-2 sm:grid-cols-2">
            {["AI-native media show", "Virtual radio concept", "Night radio aesthetics", "Cinematic short-form content", "Digital host universe"].map((x) => (
              <div key={x} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[13px] text-white/75">{x}</div>
            ))}
          </div>
        </Card>

        {/* 4 · FORMATS */}
        <Card className="mb-5">
          <H>Content Formats</H>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => <span key={f} className="rounded-full border border-white/10 px-3 py-1 text-[12px] text-white/70" style={{ background: NEON.v + "12" }}>{f}</span>)}
          </div>
        </Card>

        {/* 5 · GALLERY (placeholder, no external images) */}
        <section className="mb-5">
          <H>Gallery Preview</H>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GALLERY.map((g) => (
              <div key={g.t} className="flex aspect-[3/4] flex-col justify-end rounded-2xl border border-white/10 p-3" style={{ background: g.g }}>
                <span className="text-[11px] font-semibold text-white/90">{g.t}</span>
                <span className="text-[9px] uppercase tracking-wider text-white/50">preview</span>
              </div>
            ))}
          </div>
        </section>

        {/* 6 · ROADMAP */}
        <section className="mb-5">
          <H>Roadmap</H>
          <div className="grid gap-3 sm:grid-cols-3">
            {ROADMAP.map(([t, items]) => (
              <Card key={t}>
                <div className="mb-2 text-sm font-black" style={{ color: NEON.c }}>{t}</div>
                {items.map((it) => <div key={it} className="mb-1 text-[12px] text-white/65">· {it}</div>)}
              </Card>
            ))}
          </div>
        </section>

        {/* 7 · CONTACT / SUBSCRIBE (placeholder, no submit) */}
        <Card className="mb-5">
          <H>Stay in the loop</H>
          <div className="space-y-1.5 text-[13px] text-white/70">
            <div>📡 Telegram channel — <b className="text-white/90">coming soon</b></div>
            <div>✍️ Manual publishing only</div>
            <div>🚫 No automated posting enabled</div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input disabled placeholder="email — subscribe placeholder (disabled)" className="flex-1 cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[13px] text-white/40 placeholder:text-white/30" />
            <button type="button" disabled className="cursor-not-allowed rounded-xl border border-white/10 px-4 py-2 text-[13px] font-semibold text-white/40" style={{ background: NEON.v + "15" }}>Notify me (placeholder)</button>
          </div>
          <p className="mt-2 text-[10px] text-emerald-300/80">No form submission · no network requests · no data collected.</p>
        </Card>

        {/* 8 · SAFETY FOOTER */}
        <footer className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] p-5">
          <div className="mb-3 text-center text-sm font-black tracking-wide text-amber-200">PILOT-01 · EVA SAFE-MODE LAUNCH</div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {SAFETY.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 text-[11px]">
                <span className="text-white/55">{k}</span>
                <b className={v === "false" ? "text-emerald-300" : v === "MANUAL_ONLY" || v === "true" ? "text-amber-300" : "text-white/80"}>{v}</b>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-white/40">© DEEPINSIDE.LIFE · fictional digital media persona · preview / worldbuilding · STATIC_SAFE_MODE</p>
        </footer>

      </div>
    </main>
  );
}

export const metadata = { title: "EPIC GRAM — Live Studio" };

const card = "rounded-2xl border border-white/10 bg-white/5 p-4";
const STACK = [
  ["WebRTC room", "LiveKit — realtime аудио/видео комната"],
  ["STT", "Deepgram / Whisper streaming — речь в текст"],
  ["Brain", "Grok / OpenRouter / Router AI — ответ персонажа"],
  ["TTS", "ElevenLabs / Grok Voice — голос персонажа"],
  ["Avatar", "HeyGen / Tavus / D-ID — говорящий аватар / видео"],
  ["Streaming", "OBS / RTMP — вывод в прямой эфир"],
];

export default function LivePage() {
  return (
    <main className="min-h-screen px-5 py-10 text-[#e8ecf5]" style={{ background: "radial-gradient(1200px 600px at 50% -10%,#141024,#07060c 60%)" }}>
      <div className="mx-auto max-w-3xl">
        <a href="/media-studio" className="text-sm text-sky-300">← Media Studio</a>
        <h1 className="mb-1 mt-2 text-2xl font-black text-fuchsia-100">Live Studio · Video Chat (концепт)</h1>
        <p className="mb-5 text-white/70">Realtime разговор с AI-персонажем голосом/по видео. Каскадный стрим-пайплайн STT→LLM→TTS→Avatar. В MVP — только архитектура/конфиг, без реального стрима и клонирования.</p>
        <div className="space-y-2">
          {STACK.map(([k, v]) => (
            <div key={k} className={card}>
              <div className="text-[13px] font-bold text-fuchsia-100">{k}</div>
              <div className="mt-0.5 text-[12px] text-white/60">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200">
          Оператор в петле: ответы фанатам — через approval. Auto-stream и авто-ответы выключены. Клон реального человека — только с verified consent.
        </p>
      </div>
    </main>
  );
}

// EPIC GRAM Media Connectors — ElevenLabs (TTS) + fal.ai (image/video).
// SAFETY: API keys are read ONLY from process.env (.env.local) and are NEVER logged or returned in
// full. These endpoints GENERATE media on operator action; publishing to Telegram stays behind the
// existing approval gate. No autonomous sends. Requires Node 18+ (global fetch / Buffer).

const EL_KEY = () => process.env.ELEVENLABS_API_KEY || "";
const FAL_KEY = () => process.env.FAL_API_KEY || "";
const mask = (v) => (v ? "configured: ***" + String(v).slice(-4) : "missing");

export function mediaStatus() {
  return {
    ok: true,
    elevenlabs: { configured: !!EL_KEY(), key: mask(EL_KEY()) },
    fal: { configured: !!FAL_KEY(), key: mask(FAL_KEY()) },
    safety: { keysServerSideOnly: true, keysReturned: false, generationOnly: true, approvalGate: true },
    note: "Keys live in server .env.local only. Generation only; Telegram publishing stays gated.",
  };
}

// ---- ElevenLabs TTS ----
export async function ttsElevenLabs({ text, voiceId, modelId } = {}) {
  const key = EL_KEY();
  if (!key) return { ok: false, status: 409, error: "ELEVENLABS_API_KEY не задан в .env.local" };
  if (!text || !String(text).trim()) return { ok: false, status: 400, error: "text required" };
  const vid = voiceId || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel (default)
  const model = modelId || "eleven_multilingual_v2";
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vid)}`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text: String(text), model_id: model, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
    if (!r.ok) { const t = await r.text().catch(() => ""); return { ok: false, status: r.status, error: `ElevenLabs ${r.status}: ${t.slice(0, 240)}` }; }
    const buf = Buffer.from(await r.arrayBuffer());
    return { ok: true, contentType: "audio/mpeg", bytes: buf.length, audioBase64: buf.toString("base64"), voiceId: vid, model };
  } catch (e) { return { ok: false, status: 502, error: String((e && e.message) || e) }; }
}

export async function listVoicesElevenLabs() {
  const key = EL_KEY();
  if (!key) return { ok: false, status: 409, error: "ELEVENLABS_API_KEY не задан" };
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key } });
    const j = await r.json().catch(() => ({}));
    const voices = (j.voices || []).map((v) => ({ id: v.voice_id, name: v.name, category: v.category }));
    return { ok: r.ok, voices };
  } catch (e) { return { ok: false, status: 502, error: String((e && e.message) || e) }; }
}

// ---- fal.ai image (sync) ----
export async function genImageFal({ prompt, model, imageSize } = {}) {
  const key = FAL_KEY();
  if (!key) return { ok: false, status: 409, error: "FAL_API_KEY не задан в .env.local" };
  if (!prompt || !String(prompt).trim()) return { ok: false, status: 400, error: "prompt required" };
  const m = model || "fal-ai/flux/schnell";
  try {
    const r = await fetch(`https://fal.run/${m}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ prompt: String(prompt), image_size: imageSize || "landscape_16_9", num_images: 1 }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, status: r.status, error: `fal image ${r.status}: ${JSON.stringify(j).slice(0, 240)}` };
    const images = (j.images || []).map((i) => i && i.url).filter(Boolean);
    return { ok: true, images, model: m };
  } catch (e) { return { ok: false, status: 502, error: String((e && e.message) || e) }; }
}

// ---- fal.ai video (queue: submit + poll) ----
export async function submitVideoFal({ prompt, model, imageUrl, duration } = {}) {
  const key = FAL_KEY();
  if (!key) return { ok: false, status: 409, error: "FAL_API_KEY не задан" };
  const m = model || "fal-ai/kling-video/v1/standard/text-to-video";
  const body = imageUrl ? { prompt: String(prompt || ""), image_url: imageUrl } : { prompt: String(prompt || "") };
  if (duration) body.duration = String(duration);
  try {
    const r = await fetch(`https://queue.fal.run/${m}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, status: r.status, error: `fal video submit ${r.status}: ${JSON.stringify(j).slice(0, 240)}` };
    return { ok: true, requestId: j.request_id, model: m, status: "IN_QUEUE" };
  } catch (e) { return { ok: false, status: 502, error: String((e && e.message) || e) }; }
}

export async function pollVideoFal({ model, requestId } = {}) {
  const key = FAL_KEY();
  if (!key) return { ok: false, status: 409, error: "FAL_API_KEY не задан" };
  if (!requestId) return { ok: false, status: 400, error: "requestId required" };
  const m = model || "fal-ai/kling-video/v1/standard/text-to-video";
  try {
    const s = await fetch(`https://queue.fal.run/${m}/requests/${encodeURIComponent(requestId)}/status`, { headers: { Authorization: `Key ${key}` } });
    const sj = await s.json().catch(() => ({}));
    if ((sj.status || "") !== "COMPLETED") return { ok: true, done: false, status: sj.status || "IN_PROGRESS" };
    const r = await fetch(`https://queue.fal.run/${m}/requests/${encodeURIComponent(requestId)}`, { headers: { Authorization: `Key ${key}` } });
    const j = await r.json().catch(() => ({}));
    const video = (j.video && j.video.url) || (j.videos && j.videos[0] && j.videos[0].url) || null;
    return { ok: true, done: true, video, model: m };
  } catch (e) { return { ok: false, status: 502, error: String((e && e.message) || e) }; }
}

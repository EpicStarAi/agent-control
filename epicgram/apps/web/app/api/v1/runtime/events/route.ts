// P19.3: SSE proxy. Pipes the backend Event Bus stream
// (/v1/runtime/events) through to the browser so the client subscribes
// same-origin. Read-only; no commands ever flow over this route.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const API_BASE_URL = process.env.EPICGRAM_API_BASE_URL ?? "http://127.0.0.1:8788";

export async function GET() {
  try {
    const upstream = await fetch(`${API_BASE_URL}/v1/runtime/events`, {
      cache: "no-store",
      headers: { accept: "text/event-stream" }
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        connection: "keep-alive",
        "x-accel-buffering": "no"
      }
    });
  } catch {
    return new Response("event: error\ndata: {\"message\":\"backend_offline\"}\n\n", {
      status: 503,
      headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store" }
    });
  }
}

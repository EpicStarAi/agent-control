import { subscribe, type BusEvent } from "@/lib/operatorBus";
import { getPrincipal } from "@/lib/telegramGuard";

// P25: SSE live stream of operator events. Read-only push transport — no
// commands flow in. Streams system.connected, system.heartbeat, and every
// broadcast (operator.event.created, mission.status.changed, mission.updated…).
// nodejs runtime + ReadableStream is safe under `next start` / single PM2 proc.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const principal = await getPrincipal();
  if (!principal) {
    return new Response(
      JSON.stringify({ ok: false, authenticated: false, message: "Требуется аутентифицированная сессия EPICGRAM." }) + "\n",
      {
        status: 401,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      }
    );
  }

  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const write = (type: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      write("system.connected", { ok: true, ts: new Date().toISOString() });

      const unsub = subscribe((evt: BusEvent) => write(evt.type, evt));
      const hb = setInterval(() => write("system.heartbeat", { ts: new Date().toISOString() }), 15000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(hb);
        unsub();
        try { controller.close(); } catch { /* already closed */ }
      };
      req.signal.addEventListener("abort", close);
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    }
  });
}

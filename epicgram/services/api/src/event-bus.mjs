// P19.1: in-memory SSE event bus.
//
// READ-ONLY transport. It only PUSHES runtime events to connected clients
// (Web / Desktop / Android / AI operator). No commands ever flow over SSE —
// commands stay on REST. Runtimes call publish() on state transitions; the
// HTTP layer registers each SSE response via subscribe().
//
// In-memory / single-process for now. A Redis pub/sub fan-out can replace the
// subscribers Set later without changing the publish()/subscribe() contract.

let seq = 0;
const subscribers = new Set();
let heartbeat = null;

function nextId() {
  seq += 1;
  return `evt_${Date.now().toString(36)}_${seq.toString(36)}`;
}

function writeEvent(res, event) {
  try {
    res.write(`id: ${event.id}\n`);
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch {
    subscribers.delete(res);
  }
}

// Envelope: { id, ts, runtime, type, accountId, data }
export function publish({ type, runtime = null, accountId = null, data = null }) {
  const event = { id: nextId(), ts: new Date().toISOString(), runtime, type, accountId, data };
  for (const res of subscribers) writeEvent(res, event);
  return event;
}

export function subscribe(res) {
  subscribers.add(res);
  res.on("close", () => subscribers.delete(res));
  return () => subscribers.delete(res);
}

export function subscriberCount() {
  return subscribers.size;
}

// runtime.health tick every 15s doubles as an SSE keep-alive so idle
// connections aren't dropped by proxies/browsers. Only runs while someone is
// listening; unref'd so it never keeps the process alive on its own.
export function ensureHeartbeat() {
  if (heartbeat) return;
  heartbeat = setInterval(() => {
    if (subscribers.size > 0) {
      publish({ type: "runtime.health", data: { ok: true, subscribers: subscribers.size } });
    }
  }, 15000);
  if (heartbeat.unref) heartbeat.unref();
}

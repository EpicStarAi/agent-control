import { EventEmitter } from "node:events";

// P25: in-process Operator Event Bus. SERVER ONLY. Single Next.js / PM2 process.
// Pure in-memory fan-out of SIMULATED operator events to SSE subscribers.
// No external network, no Telegram, no bot/VPN/Publisher actions, no production
// side effects. A globalThis singleton keeps one bus across module re-eval.

export type BusEventType =
  | "system.connected"
  | "system.heartbeat"
  | "operator.event.created"
  | "mission.status.changed"
  | "mission.updated"
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected"
  | "approval.cancelled"
  | "audit.logged";

export type BusEvent = { id: string; type: BusEventType; ts: string; payload: unknown };

const g = globalThis as unknown as { __epicOperatorBus?: EventEmitter };
const emitter = g.__epicOperatorBus ?? (g.__epicOperatorBus = new EventEmitter());
emitter.setMaxListeners(0);

function id() {
  return `bus_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function broadcast(type: BusEventType, payload: unknown): BusEvent {
  const evt: BusEvent = { id: id(), type, ts: new Date().toISOString(), payload };
  emitter.emit("evt", evt);
  return evt;
}

export function subscribe(fn: (e: BusEvent) => void): () => void {
  emitter.on("evt", fn);
  return () => { emitter.off("evt", fn); };
}

export function subscriberCount(): number {
  return emitter.listenerCount("evt");
}

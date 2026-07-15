"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  MessageSquarePlus,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";

type AutonomyMode = "copilot" | "supervised" | "autonomous";
type MessageRole = "user" | "assistant" | "system";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
}

interface PendingAction {
  planSummary: string;
  executionRequestId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Я Director EPIC AI OS v4. В P-A подключён безопасный read-only сценарий Telegram. Скажи: «Покажи последние чаты NOVIKOVA».",
  },
];

function formatResult(result: unknown): string {
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

export default function DirectorChat() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState<AutonomyMode>("copilot");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeLabel = useMemo(
    () => ({ copilot: "Co-pilot", supervised: "Supervised", autonomous: "Autonomous" })[mode],
    [mode],
  );

  function addMessage(role: MessageRole, text: string) {
    setMessages((current) => [...current, { id: crypto.randomUUID(), role, text }]);
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;

    setInput("");
    setError(null);
    setBusy(true);
    addMessage("user", message);

    try {
      const response = await fetch("/api/operator/v4/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          agentId: "director",
          requestedBy: "operator",
          autonomyMode: mode,
          accountId: "novikova",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "plan_failed");

      addMessage("assistant", body.plan?.summary ?? "План подготовлен.");

      if (body.approval) {
        setPendingAction({
          planSummary: body.plan.summary,
          executionRequestId: body.executionRequestId,
          toolName: body.executionRequest.toolName,
          arguments: body.executionRequest.arguments,
        });
      } else {
        await executeAction(body.executionRequestId);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "unknown_error");
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: "allow" | "deny") {
    if (!pendingAction || busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/operator/v4/approval", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision,
          executionRequestId: pendingAction.executionRequestId,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "approval_failed");

      if (decision === "deny") {
        addMessage("system", "Действие отклонено оператором.");
        setPendingAction(null);
        return;
      }

      const requestId = pendingAction.executionRequestId;
      setPendingAction(null);
      await executeAction(requestId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "unknown_error");
    } finally {
      setBusy(false);
    }
  }

  async function executeAction(executionRequestId: string) {
    const response = await fetch("/api/operator/v4/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ executionRequestId }),
    });
    const body = await response.json();

    if (!response.ok || !body.ok) {
      throw new Error(body.reason ?? "execution_failed");
    }

    addMessage("assistant", `Инструмент выполнен.\n\n${formatResult(body.result)}`);
  }

  return (
    <main className="flex min-h-screen bg-[#f7f6f2] text-[#262624]">
      <aside
        className={`border-r border-black/10 bg-[#efeee9] transition-all duration-200 ${
          sidebarOpen ? "w-72" : "w-16"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          {sidebarOpen && <strong className="text-sm tracking-wide">EPIC AI OS</strong>}
          <button
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            className="rounded-lg p-2 hover:bg-black/5"
            aria-label="Переключить сайдбар"
          >
            {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={() => {
              setMessages(INITIAL_MESSAGES);
              setPendingAction(null);
              setError(null);
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white/70 px-3 py-2.5 text-sm hover:bg-white"
          >
            <MessageSquarePlus size={17} />
            {sidebarOpen && <span>Новый чат</span>}
          </button>
        </div>

        {sidebarOpen && (
          <div className="mt-6 px-4">
            <p className="mb-2 text-xs uppercase tracking-widest text-black/40">Агенты</p>
            <div className="rounded-xl bg-black/[0.045] p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Director
              </div>
              <p className="mt-1 text-xs text-black/50">P-A · Telegram read-only</p>
            </div>
          </div>
        )}
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-black/10 px-5">
          <div>
            <h1 className="text-sm font-semibold">Director</h1>
            <p className="text-xs text-black/45">EPIC AI OS v4 · P-A</p>
          </div>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as AutonomyMode)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            aria-label="Режим автономии"
          >
            <option value="copilot">Co-pilot</option>
            <option value="supervised">Supervised</option>
            <option value="autonomous">Autonomous</option>
          </select>
        </header>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5">
          <div className="flex-1 space-y-7 overflow-y-auto py-8">
            {messages.map((message) => (
              <article
                key={message.id}
                className={message.role === "user" ? "ml-auto max-w-[80%]" : "max-w-[92%]"}
              >
                <p className="mb-1 text-xs font-medium text-black/45">
                  {message.role === "user" ? "Вы" : message.role === "assistant" ? "Director" : "Система"}
                </p>
                <div
                  className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-[#dedbd2]"
                      : message.role === "system"
                        ? "border border-black/10 bg-white/60"
                        : "bg-transparent px-0"
                  }`}
                >
                  {message.text}
                </div>
              </article>
            ))}

            {pendingAction && (
              <article className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 text-amber-700" size={20} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Разрешить Director использовать инструмент?</p>
                    <p className="mt-1 text-sm text-black/65">{pendingAction.planSummary}</p>
                    <div className="mt-3 rounded-xl bg-black/[0.045] p-3 font-mono text-xs">
                      <div>{pendingAction.toolName}</div>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(pendingAction.arguments, null, 2)}
                      </pre>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => decide("allow")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#262624] px-4 py-2 text-sm text-white disabled:opacity-50"
                      >
                        <Check size={16} /> Allow
                      </button>
                      <button
                        type="button"
                        onClick={() => decide("deny")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2 text-sm disabled:opacity-50"
                      >
                        <X size={16} /> Deny
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Ошибка: {error}
              </div>
            )}
          </div>

          <form onSubmit={submitMessage} className="sticky bottom-0 pb-6 pt-3">
            <div className="rounded-2xl border border-black/15 bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={3}
                placeholder="Напишите Director задачу…"
                className="w-full resize-none bg-transparent px-1 text-sm outline-none placeholder:text-black/35"
              />
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-black/40">{modeLabel} · server-side approval · risk gate</span>
                <button
                  type="submit"
                  disabled={!input.trim() || busy}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#262624] text-white disabled:opacity-35"
                  aria-label={busy ? "Остановить" : "Отправить"}
                >
                  {busy ? <CircleStop size={18} /> : <Send size={17} />}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

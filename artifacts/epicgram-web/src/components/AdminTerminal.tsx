import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

// Bottom-docked technical/admin terminal for the EPIC GRAM web client.
//
// Gated behind a separate password (EPICGRAM_TERMINAL_PASSWORD, unrelated to
// any Telegram/operator account) and a short-lived session cookie set by
// the api-server terminal routes. Once unlocked, commands are sent one at a
// time over a WebSocket and run through a fixed allowlist on the server
// (see artifacts/api-server/src/lib/terminal-exec.ts) — arbitrary binaries
// outside that list are refused before anything is spawned.
type Line = { kind: "stdout" | "stderr" | "input" | "system"; text: string };

export function AdminTerminal() {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState("~");
  const [busy, setBusy] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(apiUrl("/terminal/session"), { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setUnlocked(Boolean(data.authenticated)))
      .catch(() => setUnlocked(false))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!open || !unlocked || wsRef.current) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}${apiUrl("/terminal/ws")}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "stdout" || msg.type === "stderr") {
        setLines((prev) => [...prev, { kind: msg.type, text: msg.data }]);
      } else if (msg.type === "cwd" || msg.type === "ready") {
        setCwd(msg.cwd.split("/").pop() || "/");
      } else if (msg.type === "blocked") {
        setLines((prev) => [...prev, { kind: "system", text: `команда "${msg.command}" не входит в разрешённый список\n` }]);
      } else if (msg.type === "exit") {
        setBusy(false);
      }
    };
    ws.onclose = () => {
      wsRef.current = null;
      setLines((prev) => [...prev, { kind: "system", text: "соединение закрыто\n" }]);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [open, unlocked]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch(apiUrl("/terminal/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setUnlocked(true);
      setPassword("");
    } else {
      setLoginError(res.status === 503 ? "Терминал не настроен на сервере" : "Неверный пароль");
    }
  }

  function runCommand(e: React.FormEvent) {
    e.preventDefault();
    const line = input.trim();
    if (!line || busy || !wsRef.current) return;
    setLines((prev) => [...prev, { kind: "input", text: `${cwd} $ ${line}\n` }]);
    setBusy(true);
    wsRef.current.send(JSON.stringify({ type: "run", line }));
    setInput("");
  }

  if (checkingSession) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed left-4 z-[130] rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[11px] font-mono text-emerald-300/90 shadow-lg backdrop-blur hover:bg-black/85"
        style={{ bottom: "calc(116px + env(safe-area-inset-bottom, 0px))" }}
        title="Технический терминал"
      >
        {open ? "▾" : "▸"} terminal
      </button>

      {open && (
        <div className="fixed inset-x-0 z-[129] h-72 border-t border-white/10 bg-[#0a0d12]/97 text-[13px] text-white/90 shadow-2xl backdrop-blur" style={{ bottom: "calc(48px + env(safe-area-inset-bottom, 0px))" }}>
          {!unlocked ? (
            <form onSubmit={submitPassword} className="flex h-full flex-col items-center justify-center gap-3 px-4">
              <div className="font-mono text-xs uppercase tracking-widest text-white/40">Технический терминал · требуется пароль</div>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-64 rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-400/60"
                placeholder="пароль"
              />
              {loginError && <div className="text-xs text-red-400">{loginError}</div>}
              <button type="submit" className="rounded-lg bg-emerald-600/80 px-4 py-1.5 text-sm font-semibold hover:bg-emerald-600">
                Открыть
              </button>
            </form>
          ) : (
            <div className="flex h-full flex-col">
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 font-mono text-[12.5px] leading-[1.5]">
                {lines.map((l, i) => (
                  <span
                    key={i}
                    className={
                      l.kind === "stderr"
                        ? "text-red-400"
                        : l.kind === "input"
                          ? "text-emerald-300"
                          : l.kind === "system"
                            ? "text-amber-300"
                            : "text-white/85"
                    }
                  >
                    {l.text}
                  </span>
                ))}
              </div>
              <form onSubmit={runCommand} className="flex items-center gap-2 border-t border-white/10 px-4 py-2">
                <span className="font-mono text-xs text-white/40">{cwd} $</span>
                <input
                  autoFocus
                  disabled={busy}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 bg-transparent font-mono text-sm text-white outline-none disabled:opacity-50"
                  placeholder={busy ? "выполняется…" : "bash, node, npm, git, grep…"}
                />
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}

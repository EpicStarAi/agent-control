"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Login CTA. Instead of navigating straight to the protected /client (which the
// middleware bounces back to /login, causing an infinite loop), it POSTs to the
// public bootstrap endpoint to obtain an EPICGRAM owner session, then routes to
// the internal `next` path (default /client) where the binding wizard runs.
function safeNext(v: string | null): string {
  const s = (v || "").trim();
  return /^\/(?!\/)/.test(s) ? s : "/client";
}

export function LoginCta() {
  const router = useRouter();
  const [next, setNext] = useState("/client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("next");
      setNext(safeNext(q));
    } catch { /* keep default */ }
  }, []);

  async function go() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ next }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) {
        const dest = safeNext(typeof j.next === "string" ? j.next : next);
        router.push(dest);
        router.refresh();
        return;
      }
      setError(j?.reason === "rate_limited"
        ? "Слишком много попыток. Подождите минуту и попробуйте снова."
        : "Не удалось начать вход. Попробуйте ещё раз.");
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={go}
        disabled={loading}
        aria-busy={loading}
        className="block w-full rounded-xl bg-fuchsia-600/40 px-4 py-3 text-center text-sm font-semibold hover:bg-fuchsia-600/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Входим…" : "Войти через Telegram → Web Client"}
      </button>
      {error && <p className="mt-2 text-[12px] text-rose-300">{error}</p>}
    </div>
  );
}

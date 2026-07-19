"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Per-user Telegram binding wizard (Scenario B/C). Self-contained overlay that
// drives ONLY the owner-matched binding endpoints (/api/telegram/binding/*).
// - accountId is NEVER sent from the browser — the server resolves the slot.
// - Real TDLib states only (no mock). Polls binding/status for transitions.
// - Auto-shows when the caller has no ready binding; hides when bound (Scenario C
//   resumes the client with no re-auth). Code / 2FA are held only in local state
//   and sent over POST; never logged, never persisted here.

type Phase = "loading" | "choose" | "qr" | "phone" | "code" | "password" | "ready" | "gone";

type BindingStatus = {
  bound?: boolean;
  binding?: { authState?: string; displayName?: string | null; username?: string | null; phoneMasked?: string | null } | null;
  authFlow?: { type?: string; qrLink?: string | null; qrImageData?: string | null; phoneMasked?: string | null; codeLength?: number | null; message?: string | null } | null;
};

const RESEND_SECONDS = 60;

async function postJson(path: string, body?: unknown): Promise<{ http: number; ok?: boolean; reason?: string; status?: BindingStatus }> {
  try {
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : "{}", cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    return { http: r.status, ...j };
  } catch {
    return { http: 0, ok: false, reason: "network" };
  }
}

function isValidPhone(p: string): boolean {
  return /^\+\d{7,15}$/.test(p.trim());
}

export function TelegramBindingWizard() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [flow, setFlow] = useState<BindingStatus["authFlow"]>(null);
  const [phone, setPhone] = useState("+");
  const [phoneMasked, setPhoneMasked] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [pass2fa, setPass2fa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const pollRef = useRef<number | null>(null);
  // True only after the user STARTED an auth flow in this page load. The one-time
  // reload on "ready" is gated on this so an already-bound page load hides the
  // overlay instead of reloading forever (that infinite reload was the hang).
  const startedFlow = useRef(false);

  const reloadOnce = useCallback(() => {
    startedFlow.current = false;
    try { window.location.reload(); } catch { setPhase("gone"); }
  }, []);

  const finishIfReady = useCallback((s: BindingStatus): boolean => {
    if (s.bound === true || s.binding?.authState === "ready") {
      if (startedFlow.current) {
        // Just became ready via an active flow → show a brief confirmation, then
        // reload ONCE so the shell picks up the now-ready account. On that fresh
        // load startedFlow is false, so this never loops.
        setPhase("ready");
        window.setTimeout(reloadOnce, 1200);
      } else {
        // Already bound on load (Scenario C) → just reveal the client. No reload.
        setPhase("gone");
      }
      return true;
    }
    return false;
  }, [reloadOnce]);

  const refreshStatus = useCallback(async (): Promise<BindingStatus | null> => {
    try {
      const r = await fetch("/api/telegram/binding/status", { cache: "no-store" });
      if (r.status === 401) { setPhase("gone"); return null; } // no session — page guard handles it
      const s = (await r.json().catch(() => ({}))) as BindingStatus;
      return s;
    } catch { return null; }
  }, []);

  // Initial load: decide whether to show the wizard and where to resume.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await refreshStatus();
      if (cancelled || !s) return;
      if (finishIfReady(s)) return;
      const st = s.binding?.authState;
      if (st === "waiting_code") { setPhoneMasked(s.binding?.phoneMasked ?? null); startedFlow.current = true; setPhase("code"); }
      else if (st === "waiting_password") { startedFlow.current = true; setPhase("password"); }
      else { setPhase("choose"); }
    })();
    return () => { cancelled = true; };
  }, [refreshStatus, finishIfReady]);

  // Poll for readiness while waiting on QR or code confirmation.
  useEffect(() => {
    if (phase !== "qr" && phase !== "code" && phase !== "password") return;
    pollRef.current = window.setInterval(async () => {
      const s = await refreshStatus();
      if (s) finishIfReady(s);
    }, 2500);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [phase, refreshStatus, finishIfReady]);

  // Watchdog: the "Открываем клиент…" screen must never stick. If the one-time
  // reload did not happen within 6s, drop the overlay so the (bound-aware) shell
  // shows — the manual button below is the explicit fallback.
  useEffect(() => {
    if (phase !== "ready") return;
    const t = window.setTimeout(() => { startedFlow.current = false; setPhase("gone"); }, 6000);
    return () => window.clearTimeout(t);
  }, [phase]);

  // Resend-code countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setInterval(() => setResendIn((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [resendIn]);

  async function startQr() {
    startedFlow.current = true;
    setBusy(true); setError(null);
    const r = await postJson("/api/telegram/binding/qr");
    setBusy(false);
    if (r.ok && r.status) { setFlow(r.status.authFlow ?? null); setPhase("qr"); if (finishIfReady(r.status)) return; }
    else setError(humanError(r.reason) || "Не удалось запустить QR-код. Попробуйте ещё раз или войдите по номеру.");
  }

  async function sendPhone() {
    const p = phone.trim();
    if (!isValidPhone(p)) { setError("Введите номер в международном формате, например +380XXXXXXXXX."); return; }
    startedFlow.current = true;
    setBusy(true); setError(null);
    const r = await postJson("/api/telegram/binding/phone", { phone: p });
    setBusy(false);
    if (r.ok && r.status) {
      setPhoneMasked(r.status.authFlow?.phoneMasked ?? p);
      setResendIn(RESEND_SECONDS);
      if (r.status.binding?.authState === "waiting_password") setPhase("password");
      else setPhase("code");
    } else setError(humanError(r.reason) || "Не удалось отправить номер. Проверьте его и попробуйте снова.");
  }

  async function submitCode() {
    const c = code.trim();
    if (!/^\d{3,8}$/.test(c)) { setError("Код состоит из 3–8 цифр."); return; }
    setBusy(true); setError(null);
    const r = await postJson("/api/telegram/binding/code", { code: c });
    setBusy(false);
    if (r.ok && r.status) {
      if (finishIfReady(r.status)) return;
      if (r.status.binding?.authState === "waiting_password") { setCode(""); setPhase("password"); return; }
      setError("Код принят, но подключение не завершилось. Обновите страницу или попробуйте снова.");
    } else setError(humanError(r.reason) || "Неверный код. Попробуйте ещё раз.");
  }

  async function submit2fa() {
    if (!pass2fa) { setError("Введите пароль двухфакторной защиты."); return; }
    setBusy(true); setError(null);
    const r = await postJson("/api/telegram/binding/2fa", { password: pass2fa });
    setBusy(false);
    if (r.ok && r.status) { if (finishIfReady(r.status)) return; setError("Пароль принят, но подключение не завершилось. Обновите страницу."); }
    else setError(humanError(r.reason) || "Неверный пароль 2FA. Попробуйте ещё раз.");
  }

  function humanError(reason?: string): string | null {
    if (!reason) return null;
    const r = reason.toLowerCase();
    if (r.includes("network")) return "Нет связи с сервером. Проверьте интернет и попробуйте снова.";
    if (r.includes("owner_mismatch") || r.includes("запрещ")) return "Доступ к этой сессии запрещён.";
    if (r.includes("session") && r.includes("потер")) return "Telegram-сессия потеряна. Требуется повторная авторизация.";
    return reason; // backend already returns friendly Russian reasons
  }

  if (phase === "loading" || phase === "gone") return null;

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 200,
    background: "rgba(6,5,14,0.92)", backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom))",
    overflowY: "auto",
  };
  const card = "w-full max-w-[400px] rounded-2xl border border-white/10 bg-[#0d0b18] p-5 text-[#e8ecf5] shadow-2xl";
  const primaryBtn = "block w-full rounded-xl bg-fuchsia-600/50 px-4 py-3 text-center text-sm font-semibold hover:bg-fuchsia-600/70 disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryBtn = "block w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-semibold hover:bg-white/10 disabled:opacity-60";
  const input = "w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-base text-white outline-none focus:border-fuchsia-400/60";

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Подключение Telegram">
      <div className={card}>
        <div className="mb-1 text-lg font-black text-fuchsia-100">Подключить Telegram</div>
        <p className="mb-4 text-[13px] text-white/70">Личный вход в ваш Telegram. Отправка сообщений выключена — только чтение и черновики.</p>

        {phase === "choose" && (
          <div className="space-y-2">
            <button type="button" onClick={startQr} disabled={busy} className={primaryBtn}>{busy ? "…" : "Войти через QR-код"}</button>
            <button type="button" onClick={() => { setError(null); setPhase("phone"); }} disabled={busy} className={secondaryBtn}>Войти по номеру телефона</button>
          </div>
        )}

        {phase === "qr" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center rounded-xl bg-white p-3">
              {flow?.qrImageData
                ? <img src={flow.qrImageData} alt="QR" className="h-44 w-44" />
                : <div className="flex h-44 w-44 items-center justify-center text-center text-xs text-black/60">QR генерируется…</div>}
            </div>
            <ol className="space-y-1 text-[12px] text-white/70">
              <li>1. Telegram → Настройки → Устройства.</li>
              <li>2. «Подключить устройство» → отсканируйте код.</li>
            </ol>
            <p className="text-[12px] text-emerald-300/80">Ожидаем подтверждение на телефоне…</p>
            <button type="button" onClick={() => { setError(null); setPhase("choose"); }} className={secondaryBtn}>Назад</button>
          </div>
        )}

        {phase === "phone" && (
          <div className="space-y-3">
            <label className="block text-[12px] text-white/70">Номер телефона</label>
            <input className={input} type="tel" inputMode="tel" autoComplete="tel" value={phone}
              onChange={(e) => setPhone(e.target.value)} placeholder="+380XXXXXXXXX" />
            <button type="button" onClick={sendPhone} disabled={busy} className={primaryBtn}>{busy ? "Отправляем…" : "Получить код"}</button>
            <button type="button" onClick={() => { setError(null); setPhase("choose"); }} disabled={busy} className={secondaryBtn}>Назад</button>
          </div>
        )}

        {phase === "code" && (
          <div className="space-y-3">
            <p className="text-[12px] text-white/70">Код отправлен в Telegram{phoneMasked ? ` на ${phoneMasked}` : ""}.</p>
            <input className={input} type="text" inputMode="numeric" autoComplete="one-time-code" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Код из Telegram" />
            <button type="button" onClick={submitCode} disabled={busy} className={primaryBtn}>{busy ? "Проверяем…" : "Подтвердить код"}</button>
            <button type="button" onClick={sendPhone} disabled={busy || resendIn > 0} className={secondaryBtn}>
              {resendIn > 0 ? `Отправить код повторно через ${resendIn}с` : "Отправить код повторно"}
            </button>
          </div>
        )}

        {phase === "password" && (
          <div className="space-y-3">
            <p className="text-[12px] text-white/70">Включена двухфакторная защита. Введите пароль (не сохраняется).</p>
            <input className={input} type="password" autoComplete="off" value={pass2fa}
              onChange={(e) => setPass2fa(e.target.value)} placeholder="Пароль 2FA" />
            <button type="button" onClick={submit2fa} disabled={busy} className={primaryBtn}>{busy ? "Проверяем…" : "Подтвердить"}</button>
          </div>
        )}

        {phase === "ready" && (
          <div className="space-y-2 text-center">
            <div className="text-3xl">✅</div>
            <div className="text-sm font-semibold text-emerald-300">Telegram подключён</div>
            <p className="text-[12px] text-white/60">Открываем клиент…</p>
            <button type="button" onClick={reloadOnce} className={primaryBtn}>Открыть клиент</button>
          </div>
        )}

        {error && <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">{error}</p>}
      </div>
    </div>
  );
}

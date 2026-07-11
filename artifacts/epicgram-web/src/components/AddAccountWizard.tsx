// ADD ACCOUNT WIZARD — full TDLib phone/code/2FA auth flow.
// Calls existing backend routes: /accounts/new → /auth/phone → /auth/code → /auth/2fa
// Never stores phone, code or password in localStorage.

import { useState } from "react";
import { apiUrl } from "@/lib/api";

type WizardStep = "phone" | "code" | "twofa" | "success" | "error";

interface Props {
  onSuccess: (slotId: string) => void;
  onCancel: () => void;
}

const COUNTRIES = [
  // СНГ и постсоветское пространство
  { code: "+7",   flag: "🇷🇺", name: "Россия" },
  { code: "+380", flag: "🇺🇦", name: "Украина" },
  { code: "+375", flag: "🇧🇾", name: "Беларусь" },
  { code: "+7",   flag: "🇰🇿", name: "Казахстан" },
  { code: "+998", flag: "🇺🇿", name: "Узбекистан" },
  { code: "+994", flag: "🇦🇿", name: "Азербайджан" },
  { code: "+374", flag: "🇦🇲", name: "Армения" },
  { code: "+995", flag: "🇬🇪", name: "Грузия" },
  { code: "+992", flag: "🇹🇯", name: "Таджикистан" },
  { code: "+993", flag: "🇹🇲", name: "Туркменистан" },
  { code: "+996", flag: "🇰🇬", name: "Кыргызстан" },
  { code: "+373", flag: "🇲🇩", name: "Молдова" },
  { code: "+371", flag: "🇱🇻", name: "Латвия" },
  { code: "+370", flag: "🇱🇹", name: "Литва" },
  { code: "+372", flag: "🇪🇪", name: "Эстония" },
  // Северная Америка
  { code: "+1",   flag: "🇺🇸", name: "США" },
  { code: "+1",   flag: "🇨🇦", name: "Канада" },
  { code: "+52",  flag: "🇲🇽", name: "Мексика" },
  // Западная Европа
  { code: "+44",  flag: "🇬🇧", name: "Великобритания" },
  { code: "+49",  flag: "🇩🇪", name: "Германия" },
  { code: "+33",  flag: "🇫🇷", name: "Франция" },
  { code: "+34",  flag: "🇪🇸", name: "Испания" },
  { code: "+39",  flag: "🇮🇹", name: "Италия" },
  { code: "+31",  flag: "🇳🇱", name: "Нидерланды" },
  { code: "+32",  flag: "🇧🇪", name: "Бельгия" },
  { code: "+41",  flag: "🇨🇭", name: "Швейцария" },
  { code: "+43",  flag: "🇦🇹", name: "Австрия" },
  { code: "+351", flag: "🇵🇹", name: "Португалия" },
  { code: "+353", flag: "🇮🇪", name: "Ирландия" },
  { code: "+31",  flag: "🇳🇱", name: "Нидерланды" },
  { code: "+45",  flag: "🇩🇰", name: "Дания" },
  { code: "+46",  flag: "🇸🇪", name: "Швеция" },
  { code: "+47",  flag: "🇳🇴", name: "Норвегия" },
  { code: "+358", flag: "🇫🇮", name: "Финляндия" },
  { code: "+354", flag: "🇮🇸", name: "Исландия" },
  { code: "+352", flag: "🇱🇺", name: "Люксембург" },
  // Восточная Европа
  { code: "+48",  flag: "🇵🇱", name: "Польша" },
  { code: "+420", flag: "🇨🇿", name: "Чехия" },
  { code: "+421", flag: "🇸🇰", name: "Словакия" },
  { code: "+36",  flag: "🇭🇺", name: "Венгрия" },
  { code: "+40",  flag: "🇷🇴", name: "Румыния" },
  { code: "+359", flag: "🇧🇬", name: "Болгария" },
  { code: "+381", flag: "🇷🇸", name: "Сербия" },
  { code: "+385", flag: "🇭🇷", name: "Хорватия" },
  { code: "+386", flag: "🇸🇮", name: "Словения" },
  { code: "+387", flag: "🇧🇦", name: "Босния и Герцеговина" },
  { code: "+30",  flag: "🇬🇷", name: "Греция" },
  { code: "+90",  flag: "🇹🇷", name: "Турция" },
  // Ближний Восток
  { code: "+971", flag: "🇦🇪", name: "ОАЭ" },
  { code: "+966", flag: "🇸🇦", name: "Саудовская Аравия" },
  { code: "+972", flag: "🇮🇱", name: "Израиль" },
  { code: "+98",  flag: "🇮🇷", name: "Иран" },
  { code: "+964", flag: "🇮🇶", name: "Ирак" },
  { code: "+962", flag: "🇯🇴", name: "Иордания" },
  { code: "+961", flag: "🇱🇧", name: "Ливан" },
  { code: "+974", flag: "🇶🇦", name: "Катар" },
  { code: "+965", flag: "🇰🇼", name: "Кувейт" },
  { code: "+973", flag: "🇧🇭", name: "Бахрейн" },
  { code: "+968", flag: "🇴🇲", name: "Оман" },
  { code: "+967", flag: "🇾🇪", name: "Йемен" },
  { code: "+963", flag: "🇸🇾", name: "Сирия" },
  // Азия
  { code: "+86",  flag: "🇨🇳", name: "Китай" },
  { code: "+91",  flag: "🇮🇳", name: "Индия" },
  { code: "+82",  flag: "🇰🇷", name: "Южная Корея" },
  { code: "+81",  flag: "🇯🇵", name: "Япония" },
  { code: "+65",  flag: "🇸🇬", name: "Сингапур" },
  { code: "+60",  flag: "🇲🇾", name: "Малайзия" },
  { code: "+66",  flag: "🇹🇭", name: "Таиланд" },
  { code: "+62",  flag: "🇮🇩", name: "Индонезия" },
  { code: "+63",  flag: "🇵🇭", name: "Филиппины" },
  { code: "+84",  flag: "🇻🇳", name: "Вьетнам" },
  { code: "+856", flag: "🇱🇦", name: "Лаос" },
  { code: "+855", flag: "🇰🇭", name: "Камбоджа" },
  { code: "+95",  flag: "🇲🇲", name: "Мьянма" },
  { code: "+880", flag: "🇧🇩", name: "Бангладеш" },
  { code: "+94",  flag: "🇱🇰", name: "Шри-Ланка" },
  { code: "+92",  flag: "🇵🇰", name: "Пакистан" },
  { code: "+93",  flag: "🇦🇫", name: "Афганистан" },
  { code: "+977", flag: "🇳🇵", name: "Непал" },
  { code: "+886", flag: "🇹🇼", name: "Тайвань" },
  { code: "+852", flag: "🇭🇰", name: "Гонконг" },
  { code: "+853", flag: "🇲🇴", name: "Макао" },
  { code: "+850", flag: "🇰🇵", name: "КНДР" },
  { code: "+976", flag: "🇲🇳", name: "Монголия" },
  // Африка
  { code: "+20",  flag: "🇪🇬", name: "Египет" },
  { code: "+212", flag: "🇲🇦", name: "Марокко" },
  { code: "+213", flag: "🇩🇿", name: "Алжир" },
  { code: "+216", flag: "🇹🇳", name: "Тунис" },
  { code: "+218", flag: "🇱🇾", name: "Ливия" },
  { code: "+27",  flag: "🇿🇦", name: "ЮАР" },
  { code: "+234", flag: "🇳🇬", name: "Нигерия" },
  { code: "+254", flag: "🇰🇪", name: "Кения" },
  { code: "+251", flag: "🇪🇹", name: "Эфиопия" },
  { code: "+255", flag: "🇹🇿", name: "Танзания" },
  { code: "+256", flag: "🇺🇬", name: "Уганда" },
  { code: "+233", flag: "🇬🇭", name: "Гана" },
  { code: "+221", flag: "🇸🇳", name: "Сенегал" },
  { code: "+225", flag: "🇨🇮", name: "Кот-д'Ивуар" },
  { code: "+237", flag: "🇨🇲", name: "Камерун" },
  { code: "+243", flag: "🇨🇩", name: "ДР Конго" },
  { code: "+249", flag: "🇸🇩", name: "Судан" },
  { code: "+252", flag: "🇸🇴", name: "Сомали" },
  { code: "+257", flag: "🇧🇮", name: "Бурунди" },
  // Южная Америка
  { code: "+55",  flag: "🇧🇷", name: "Бразилия" },
  { code: "+54",  flag: "🇦🇷", name: "Аргентина" },
  { code: "+57",  flag: "🇨🇴", name: "Колумбия" },
  { code: "+56",  flag: "🇨🇱", name: "Чили" },
  { code: "+51",  flag: "🇵🇪", name: "Перу" },
  { code: "+58",  flag: "🇻🇪", name: "Венесуэла" },
  { code: "+593", flag: "🇪🇨", name: "Эквадор" },
  { code: "+591", flag: "🇧🇴", name: "Боливия" },
  { code: "+595", flag: "🇵🇾", name: "Парагвай" },
  { code: "+598", flag: "🇺🇾", name: "Уругвай" },
  // Океания
  { code: "+61",  flag: "🇦🇺", name: "Австралия" },
  { code: "+64",  flag: "🇳🇿", name: "Новая Зеландия" },
];

const AUTH_STATE_LABELS: Record<string, string> = {
  authorizationStateWaitPhoneNumber: "Ожидание номера телефона",
  authorizationStateWaitCode: "Ожидание кода",
  authorizationStateWaitPassword: "Ожидание облачного пароля",
  authorizationStateReady: "Авторизован",
  authorizationStateLoggingOut: "Выход…",
  authorizationStateClosed: "Закрыто",
  not_configured: "TDLib не настроен",
  backend_ready: "Backend готов",
};

export function AddAccountWizard({ onSuccess, onCancel }: Props) {
  const [step, setStep]           = useState<WizardStep>("phone");
  const [countryIdx, setCountryIdx] = useState(0);
  const country = COUNTRIES[countryIdx];
  const [phone, setPhone]         = useState("");
  const [code, setCode]           = useState("");
  const [password, setPassword]   = useState("");
  const [slotId, setSlotId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [authState, setAuthState] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  const post = async (path: string, body: object) => {
    const r = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
    return j;
  };

  // Step 1 — send phone number
  const handlePhone = async () => {
    const fullPhone = country.code + phone.replace(/^\+|\s/g, "");
    if (phone.length < 6) { setError("Введи полный номер телефона."); return; }
    setLoading(true); setError(null);
    try {
      // 1. Create new slot
      const newSlot = await post("/telegram/accounts/new", {});
      const id = newSlot.accounts?.find((a: any) => !a.displayName && a.status === "waiting_auth")?.slotId
        || newSlot.activeAccountId;
      if (!id) throw new Error("Не удалось создать слот аккаунта.");
      setSlotId(id);

      // 2. Send phone
      const result = await post("/telegram/auth/phone", { accountId: id, phoneNumber: fullPhone });
      const state = result.authorizationState || result.state || "";
      setAuthState(state);
      if (state === "authorizationStateWaitCode" || state.includes("WaitCode")) {
        setStep("code");
      } else if (state === "authorizationStateReady") {
        setDisplayName(result.displayName || result.account?.displayName || "");
        setStep("success");
        onSuccess(id);
      } else {
        throw new Error(`Неожиданный статус: ${AUTH_STATE_LABELS[state] || state}`);
      }
    } catch (e: any) {
      setError(e.message || "Ошибка при отправке номера.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify code
  const handleCode = async () => {
    if (!slotId) return;
    if (code.length < 4) { setError("Введи код из Telegram."); return; }
    setLoading(true); setError(null);
    try {
      const result = await post("/telegram/auth/code", { accountId: slotId, code });
      const state = result.authorizationState || result.state || "";
      setAuthState(state);
      if (state === "authorizationStateReady") {
        setDisplayName(result.displayName || result.account?.displayName || "");
        setStep("success");
        setTimeout(() => onSuccess(slotId), 1200);
      } else if (state === "authorizationStateWaitPassword" || state.includes("WaitPassword")) {
        setStep("twofa");
      } else {
        throw new Error(`Неожиданный статус: ${AUTH_STATE_LABELS[state] || state}`);
      }
    } catch (e: any) {
      setError(e.message || "Неверный или истёкший код.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — 2FA password
  const handle2fa = async () => {
    if (!slotId) return;
    if (!password) { setError("Введи облачный пароль Telegram."); return; }
    setLoading(true); setError(null);
    try {
      const result = await post("/telegram/auth/2fa", { accountId: slotId, password });
      const state = result.authorizationState || result.state || "";
      setAuthState(state);
      if (state === "authorizationStateReady") {
        setDisplayName(result.displayName || result.account?.displayName || "");
        setStep("success");
        setTimeout(() => onSuccess(slotId), 1200);
      } else {
        throw new Error(`Неожиданный статус: ${AUTH_STATE_LABELS[state] || state}`);
      }
    } catch (e: any) {
      setError(e.message || "Неверный пароль.");
    } finally {
      setLoading(false);
      // Always clear password from state after attempt
      setPassword("");
    }
  };

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-sky-500/60 focus:bg-white/8 transition-all";
  const btnCls   = (disabled?: boolean) => `w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${disabled ? "bg-white/10 text-white/30 cursor-not-allowed" : "bg-sky-500/80 hover:bg-sky-500 text-white"}`;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-tg-panel p-4"
      style={{ background: "linear-gradient(160deg,rgba(10,10,24,.97),rgba(14,14,30,.97))" }}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">Добавить Telegram-аккаунт</p>
          <p className="mt-0.5 text-[11px] text-white/40">
            {step === "phone"   && "Шаг 1 из 3 · Номер телефона"}
            {step === "code"    && "Шаг 2 из 3 · Код подтверждения"}
            {step === "twofa"   && "Шаг 3 из 3 · Облачный пароль"}
            {step === "success" && "Аккаунт подключён ✓"}
          </p>
        </div>
        <button onClick={onCancel} className="rounded-lg p-1.5 text-white/30 hover:bg-white/10 hover:text-white/60 transition-all">✕</button>
      </div>

      {/* Steps indicator */}
      <div className="flex gap-1.5">
        {["phone", "code", "twofa"].map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-all ${
            step === "success" ? "bg-emerald-500" :
            s === step ? "bg-sky-500" :
            ["phone","code","twofa"].indexOf(step) > i ? "bg-sky-500/40" : "bg-white/10"
          }`} />
        ))}
      </div>

      {/* Phone step */}
      {step === "phone" && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-white/50">Страна</label>
            <select
              value={countryIdx}
              onChange={e => setCountryIdx(Number(e.target.value))}
              className={inputCls}
            >
              {COUNTRIES.map((c, i) => <option key={i} value={i}>{c.flag} {c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-white/50">Номер телефона</label>
            <div className="flex gap-2">
              <span className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white/60">{country.code}</span>
              <input
                type="tel"
                placeholder="9001234567"
                value={phone}
                onChange={e => { setPhone(e.target.value); setError(null); }}
                onKeyDown={e => e.key === "Enter" && handlePhone()}
                className={inputCls}
                autoFocus
              />
            </div>
          </div>
          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}
          <button onClick={handlePhone} disabled={loading || phone.length < 5} className={btnCls(loading || phone.length < 5)}>
            {loading ? "Отправка…" : "Отправить код →"}
          </button>
          <p className="text-center text-[10px] text-white/25">Telegram пришлёт код на этот номер или в приложение</p>
        </div>
      )}

      {/* Code step */}
      {step === "code" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/8 px-3 py-2.5 text-[11px] text-sky-300">
            📲 Код отправлен на {country.code}{phone} — проверь Telegram или SMS
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-white/50">Код из Telegram</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="12345"
              maxLength={8}
              value={code}
              onChange={e => { setCode(e.target.value.replace(/\D/g, "")); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleCode()}
              className={`${inputCls} text-center text-2xl tracking-[0.5em] font-mono`}
              autoFocus
            />
          </div>
          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}
          <button onClick={handleCode} disabled={loading || code.length < 4} className={btnCls(loading || code.length < 4)}>
            {loading ? "Проверка…" : "Подтвердить →"}
          </button>
          <button onClick={() => { setStep("phone"); setCode(""); setError(null); setSlotId(null); }}
            className="text-center text-[11px] text-white/30 hover:text-white/60 transition-all">
            ← Изменить номер
          </button>
        </div>
      )}

      {/* 2FA step */}
      {step === "twofa" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-[11px] text-amber-300">
            🔐 На этом аккаунте включена двухфакторная аутентификация
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-white/50">Облачный пароль Telegram</label>
            <input
              type="password"
              placeholder="Пароль 2FA"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handle2fa()}
              className={inputCls}
              autoComplete="off"
              autoFocus
            />
          </div>
          {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}
          <button onClick={handle2fa} disabled={loading || !password} className={btnCls(loading || !password)}>
            {loading ? "Проверка…" : "Войти →"}
          </button>
          <p className="text-center text-[10px] text-white/25">Пароль не сохраняется и не записывается в лог</p>
        </div>
      )}

      {/* Success */}
      {step === "success" && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-3xl">✓</div>
          <div className="text-center">
            <p className="text-sm font-semibold text-emerald-400">Аккаунт подключён!</p>
            {displayName && <p className="mt-0.5 text-[11px] text-white/50">{displayName}</p>}
          </div>
          <p className="text-[10px] text-white/30">Загружаем чаты и папки…</p>
        </div>
      )}
    </div>
  );
}

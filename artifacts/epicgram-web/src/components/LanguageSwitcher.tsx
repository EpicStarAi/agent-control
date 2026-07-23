
// Global RU / EN / UA language switcher. UI-only, persists to deepinside.ui.language.v1.
import { setCurrentLocale, useLocale, Locale } from "@/lib/i18n";

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const loc = useLocale();
  const opts: Locale[] = ["ru", "en", "ua"];
  return <div className="flex items-center gap-1 text-[10px]" title="Язык интерфейса / UI language">
    <span className="text-tg-muted">🌐</span>
    {opts.map((l) => <button key={l} onClick={() => setCurrentLocale(l)} className={"rounded px-1.5 py-0.5 uppercase " + (loc === l ? "bg-cyan-600/30 font-bold text-cyan-100" : "text-tg-muted hover:bg-white/10")}>{l}</button>)}
  </div>;
}

"use client";

// GLOBAL PREFERENCES — language (uk/ru/en) + theme (light/dark/system/matrix) + a11y.
// UI / localStorage / CSS / i18n only. No backend, no secrets, no external APIs.

export const PK = "epic_preferences_v1";
export type Lang = "uk" | "ru" | "en";
export type Theme = "light" | "dark" | "system" | "matrix";
export const LANGS: [Lang, string][] = [["uk", "🇺🇦 УКР"], ["ru", "🇷🇺 РУС"], ["en", "🇬🇧 ENG"]];
export const THEMES: [Theme, string][] = [["light", "Light"], ["dark", "Dark"], ["system", "System"], ["matrix", "Matrix Evolution"]];

export type Prefs = { language: Lang; theme: Theme; systemThemeDetected: string; lastChanged: string; missingTranslations: string[]; version: number; reduceAnim: boolean; highContrast: boolean; largeText: boolean; matrixEffects: boolean };
const DEFAULT: Prefs = { language: "ru", theme: "dark", systemThemeDetected: "dark", lastChanged: "", missingTranslations: [], version: 1, reduceAnim: false, highContrast: false, largeText: false, matrixEffects: true };

export function getPrefs(): Prefs { try { return { ...DEFAULT, ...(JSON.parse(localStorage.getItem(PK) || "{}")) }; } catch { return { ...DEFAULT }; } }
export function setPrefs(p: Partial<Prefs>) { const next = { ...getPrefs(), ...p, lastChanged: new Date().toISOString() }; try { localStorage.setItem(PK, JSON.stringify(next)); } catch {} applyPrefs(next); return next; }

// ---- i18n dictionary ----
const DICT: Record<string, Record<Lang, string>> = {
  Home: { uk: "Головна", ru: "Главная", en: "Home" },
  WORLD: { uk: "СВІТ", ru: "МИР", en: "WORLD" },
  Agents: { uk: "Агенти", ru: "Агенты", en: "Agents" },
  Telegram: { uk: "Telegram", ru: "Telegram", en: "Telegram" },
  Missions: { uk: "Місії", ru: "Миссии", en: "Missions" },
  Media: { uk: "Медіа", ru: "Медиа", en: "Media" },
  Devices: { uk: "Пристрої", ru: "Устройства", en: "Devices" },
  Infrastructure: { uk: "Інфраструктура", ru: "Инфраструктура", en: "Infrastructure" },
  "AI Services": { uk: "AI Сервіси", ru: "AI Сервисы", en: "AI Services" },
  Analytics: { uk: "Аналітика", ru: "Аналитика", en: "Analytics" },
  Guide: { uk: "Гід", ru: "Гид", en: "Guide" },
  Settings: { uk: "Налаштування", ru: "Настройки", en: "Settings" },
  Security: { uk: "Безпека", ru: "Безопасность", en: "Security" },
  Finance: { uk: "Фінанси", ru: "Финансы", en: "Finance" },
  Knowledge: { uk: "Знання", ru: "Знания", en: "Knowledge" },
  Automation: { uk: "Автоматизація", ru: "Автоматизация", en: "Automation" },
  Integrations: { uk: "Інтеграції", ru: "Интеграции", en: "Integrations" },
  "Digital Twins": { uk: "Цифрові двійники", ru: "Цифровые двойники", en: "Digital Twins" },
  "Data Center": { uk: "Центр даних", ru: "Центр данных", en: "Data Center" },
  Readiness: { uk: "Готовність", ru: "Готовность", en: "Readiness" },
  "AI COO": { uk: "AI COO", ru: "AI COO", en: "AI COO" },
  "AI CEO": { uk: "AI CEO", ru: "AI CEO", en: "AI CEO" },
  "EPIC Architect": { uk: "EPIC Архітектор", ru: "EPIC Архитектор", en: "EPIC Architect" },
  "Media Ops": { uk: "Медіа Операції", ru: "Медиа Операции", en: "Media Ops" },
  "Device Center": { uk: "Центр пристроїв", ru: "Центр устройств", en: "Device Center" },
  Executive: { uk: "Кабінет", ru: "Кабинет", en: "Executive" },
  Projects: { uk: "Проєкти", ru: "Проекты", en: "Projects" },
  History: { uk: "Історія", ru: "История", en: "History" },
  Files: { uk: "Файли", ru: "Файлы", en: "Files" },
  Images: { uk: "Зображення", ru: "Изображения", en: "Images" },
  Videos: { uk: "Відео", ru: "Видео", en: "Videos" },
  "AI Models": { uk: "AI Моделі", ru: "AI Модели", en: "AI Models" },
  Search: { uk: "Пошук", ru: "Поиск", en: "Search" },
  Library: { uk: "Бібліотека", ru: "Библиотека", en: "Library" },
  Scheduled: { uk: "Заплановані", ru: "Запланированные", en: "Scheduled" },
  Apps: { uk: "Додатки", ru: "Приложения", en: "Apps" },
  Artifacts: { uk: "Артефакти", ru: "Артефакты", en: "Artifacts" },
  "New Chat": { uk: "Новий чат", ru: "Новый чат", en: "New Chat" },
  "AI Operator": { uk: "AI Оператор", ru: "AI Оператор", en: "AI Operator" },
  "Current Context": { uk: "Поточний контекст", ru: "Текущий контекст", en: "Current Context" },
  "System Readiness": { uk: "Готовність системи", ru: "Готовность системы", en: "System Readiness" },
  "Available Tools": { uk: "Доступні інструменти", ru: "Доступные инструменты", en: "Available Tools" },
  Recommendations: { uk: "Рекомендації", ru: "Рекомендации", en: "Recommendations" },
  Notifications: { uk: "Сповіщення", ru: "Уведомления", en: "Notifications" },
  "Quick Commands": { uk: "Швидкі команди", ru: "Быстрые команды", en: "Quick Commands" },
  "Voice Mode": { uk: "Голосовий режим", ru: "Голосовой режим", en: "Voice Mode" },
  "Screen View": { uk: "Перегляд екрана", ru: "Просмотр экрана", en: "Screen View" },
  "Safe API Vault": { uk: "Сейф API", ru: "Сейф API", en: "Safe API Vault" },
  Language: { uk: "Мова", ru: "Язык", en: "Language" },
  Theme: { uk: "Тема", ru: "Тема", en: "Theme" },
  "Appearance & Language": { uk: "Вигляд та мова", ru: "Вид и язык", en: "Appearance & Language" },
  "Reduce Animations": { uk: "Менше анімацій", ru: "Меньше анимаций", en: "Reduce Animations" },
  "High Contrast": { uk: "Високий контраст", ru: "Высокий контраст", en: "High Contrast" },
  "Large Text": { uk: "Великий текст", ru: "Крупный текст", en: "Large Text" },
  "Reset Preferences": { uk: "Скинути налаштування", ru: "Сбросить настройки", en: "Reset Preferences" },
  Send: { uk: "Надіслати", ru: "Отправить", en: "Send" },
  Close: { uk: "Закрити", ru: "Закрыть", en: "Close" },
};

export function t(key: string, lang?: Lang): string {
  const l = lang || getPrefs().language;
  const e = DICT[key];
  if (e && e[l]) return e[l];
  if (e && e.en) return e.en;
  // log missing (safe, capped)
  try { const p = getPrefs(); if (!p.missingTranslations.includes(key)) { p.missingTranslations = [...p.missingTranslations, key].slice(-100); localStorage.setItem(PK, JSON.stringify(p)); } } catch {}
  return key;
}

// ---- theme application via injected CSS + root class ----
function detectSystem(): "light" | "dark" { try { return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"; } catch { return "dark"; } }

const VARS: Record<string, Record<string, string>> = {
  dark: { "--bg": "#0a0a0f", "--panel": "#17212b", "--text": "#e9e6f2", "--muted": "#94a3b8", "--accent": "#ff2d6b", "--accent-2": "#38bdf8", "--border": "rgba(255,255,255,.1)", "--success": "#4ade80", "--warning": "#fbbf24", "--danger": "#f87171", "--glow": "rgba(177,77,255,.3)", "--grid": "rgba(177,77,255,.06)" },
  light: { "--bg": "#f4f5f7", "--panel": "#ffffff", "--text": "#0f172a", "--muted": "#475569", "--accent": "#7c3aed", "--accent-2": "#0ea5e9", "--border": "#d8dee9", "--success": "#16a34a", "--warning": "#d97706", "--danger": "#dc2626", "--glow": "rgba(124,58,237,.18)", "--grid": "rgba(15,23,42,.05)" },
  matrix: { "--bg": "#020a02", "--panel": "rgba(0,28,8,.6)", "--text": "#c8ffce", "--muted": "#4caf6a", "--accent": "#00ff66", "--accent-2": "#39ff14", "--border": "rgba(0,255,90,.28)", "--success": "#39ff14", "--warning": "#aaff00", "--danger": "#ff5c5c", "--glow": "rgba(0,255,90,.4)", "--grid": "rgba(0,255,90,.07)" },
};

function css(resolved: "light" | "dark" | "matrix", p: Prefs): string {
  const v = VARS[resolved];
  const vars = ":root{" + Object.entries(v).map(([k, val]) => k + ":" + val + ";").join("") + "}";
  let over = "";
  if (resolved !== "dark") {
    over = `
      body{background:${v["--bg"]} !important;color:${v["--text"]};}
      [class*="bg-tg-bg"]{background-color:${resolved === "light" ? "#eef1f5" : "rgba(0,18,6,.5)"} !important;}
      [class*="bg-tg-panel"]{background-color:${v["--panel"]} !important;}
      [class*="text-tg-text"]{color:${v["--text"]} !important;}
      [class*="text-tg-muted"]{color:${v["--muted"]} !important;}
      [class*="border-tg-line"]{border-color:${v["--border"]} !important;}
      [class*="ring-tg-line"]{--tw-ring-color:${v["--border"]} !important;}
      [class*="text-tg-accent"]{color:${v["--accent"]} !important;}
      [class*="bg-tg-active"]{background-color:${resolved === "light" ? "#7c3aed" : "rgba(0,120,40,.6)"} !important;}
    `;
  }
  if (resolved === "matrix") over += `
    .epic-matrix-scan{position:fixed;inset:0;z-index:9998;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,255,90,.05) 0,rgba(0,255,90,.05) 1px,transparent 1px,transparent 3px);mix-blend-mode:screen;}
    .epic-matrix-rain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.25;}
    .epic-theme-matrix [class*="rounded"]{box-shadow:0 0 12px rgba(0,255,90,.08);}
  `;
  if (p.highContrast) over += `body{filter:contrast(1.15);}`;
  if (p.largeText) over += `html{font-size:17px;}`;
  if (p.reduceAnim) over += `*{animation:none !important;transition:none !important;}`;
  return vars + over;
}

export function applyPrefs(p?: Prefs) {
  if (typeof document === "undefined") return;
  const prefs = p || getPrefs();
  const resolved = prefs.theme === "system" ? detectSystem() : prefs.theme;
  const root = document.documentElement;
  root.classList.remove("epic-theme-light", "epic-theme-dark", "epic-theme-matrix");
  root.classList.add("epic-theme-" + resolved);
  root.setAttribute("lang", prefs.language === "uk" ? "uk-UA" : prefs.language === "ru" ? "ru-RU" : "en-US");
  let style = document.getElementById("epic-theme-vars") as HTMLStyleElement | null;
  if (!style) { style = document.createElement("style"); style.id = "epic-theme-vars"; document.head.appendChild(style); }
  style.textContent = css(resolved as any, prefs);
  // matrix overlays
  document.querySelector(".epic-matrix-scan")?.remove();
  const rainEl = document.querySelector(".epic-matrix-rain") as HTMLCanvasElement | null;
  if (resolved === "matrix" && prefs.matrixEffects) {
    const scan = document.createElement("div"); scan.className = "epic-matrix-scan"; document.body.appendChild(scan);
    if (!rainEl) startRain();
  } else { stopRain(); }
}

let rainTimer: any = null;
function startRain() {
  stopRain();
  const c = document.createElement("canvas"); c.className = "epic-matrix-rain"; document.body.appendChild(c);
  const ctx = c.getContext("2d"); if (!ctx) return;
  function size() { c.width = window.innerWidth; c.height = window.innerHeight; }
  size(); window.addEventListener("resize", size);
  const cols = Math.floor(c.width / 14); const y = new Array(cols).fill(0);
  rainTimer = setInterval(() => {
    ctx.fillStyle = "rgba(2,10,2,.1)"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#00ff66"; ctx.font = "13px monospace";
    for (let i = 0; i < cols; i++) { const ch = String.fromCharCode(0x30a0 + Math.random() * 96); ctx.fillText(ch, i * 14, y[i] * 14); if (y[i] * 14 > c.height && Math.random() > 0.975) y[i] = 0; y[i]++; }
  }, 60);
}
function stopRain() { if (rainTimer) { clearInterval(rainTimer); rainTimer = null; } document.querySelector(".epic-matrix-rain")?.remove(); }

"use client";

// GLOBAL i18n — RU-first control panel, EN/UA switch. Frontend-only, localStorage-based.
// UI text only. Does NOT translate code identifiers, localStorage keys, API routes, terminal
// commands, or safety-flag keys. No external libs, no network, no secrets.

import { useEffect, useState } from "react";

export type Locale = "ru" | "en" | "ua";

export const I18N_KEY = "deepinside.ui.language.v1";
export const I18N_SAFETY = { mode: "UI_ONLY", localizationOnly: true, autoSendAllowed: false, backgroundSendAllowed: false, retryWithoutConfirmAllowed: false, massSendAllowed: false, sendWithoutApprovalAllowed: false, sendWithoutWhitelistAllowed: false, secretsVisible: false, credentialsExportAllowed: false, autonomousActionsAllowed: false };

type Dict = Record<string, string>;

const en: Dict = {
  // language switcher
  "lang.label": "Language",
  // sidebar
  "sb.title": "AI OPERATOR", "sb.currentScreen": "CURRENT SCREEN", "sb.nextAction": "NEXT ACTION", "sb.gateInspector": "GATE INSPECTOR", "sb.quickActions": "QUICK ACTIONS", "sb.terminalCommands": "TERMINAL COMMANDS", "sb.safetyInspector": "SAFETY INSPECTOR", "sb.chat": "OPERATOR CHAT (local)",
  "sb.route": "route", "sb.section": "section", "sb.agent": "agent", "sb.account": "account", "sb.target": "target", "sb.readiness": "readiness", "sb.localModel": "local model", "sb.telegram": "Telegram",
  "sb.blocker": "Blocker", "sb.copyAction": "Copy action", "sb.copyClaude": "Copy Claude prompt", "sb.copyState": "Copy current state", "sb.copy": "Copy",
  "sb.explainScreen": "Explain this screen", "sb.showBlockers": "Show blockers", "sb.intro": "I can see the current screen and suggest the next safe step. I do not send anything myself, I only explain what to click next.",
  "sb.you": "You", "sb.ai": "AI", "sb.advisory": "Advisory-only - the UI sends nothing - secrets hidden - MANUAL_ONLY.",
  "sb.open": "Open", "sb.collapse": "Collapse",
  "q.whatBlocked": "What is blocked?", "q.whatNext": "What should I click next?", "q.summary": "State summary", "q.runbook": "Runbook checklist",
  // nav / sections
  "nav.openLivePrep": "Open Live Prep", "nav.openDryRun": "Open E2E Dry-Run", "nav.openPostLive": "Open Post-Live", "nav.openAccounts": "Open Accounts", "nav.openTargets": "Open Targets", "nav.openRunbook": "Open E2E Runbook",
  "section.command": "Ecosystem Command", "section.operator": "AI Operator", "section.livepilot": "Live Pilot", "section.livewizard": "Live Wizard", "section.runbook": "E2E Runbook", "section.dryrun": "E2E Dry-Run", "section.postlive": "Post-Live", "section.liveprep": "Live Prep", "section.targets": "Targets", "section.ownedaccounts": "Accounts", "section.opanalytics": "Op Analytics", "section.workspace": "Agent Workspace", "section.content": "Content Factory", "section.media": "Media Factory", "section.canvas": "Operator Canvas", "section.channelcenter": "Channel Center", "section.activity": "Activity Stream", "section.matrix": "Readiness Matrix", "section.world": "World Graph 2.0", "section.map": "Live Ecosystem Map", "section.autonomy": "Autonomy Readiness",
  // gates
  "gate.build": "Build", "gate.localModel": "Local Model", "gate.account": "Account", "gate.target": "Target", "gate.binding": "Binding", "gate.runbook": "Runbook", "gate.preflight": "Preflight", "gate.manualConfirmation": "Manual Confirmation", "gate.telegramRuntime": "Telegram Runtime",
  // statuses
  "st.passed": "passed", "st.blocked": "blocked", "st.warning": "warning", "st.unknown": "unknown", "st.ready": "ready", "st.failed": "failed", "st.pending": "pending", "st.idle": "idle", "st.active": "active", "st.notReady": "not ready", "st.almostReady": "almost ready", "st.manualOnly": "manual only", "st.oneMessageOnly": "one message only",
  // safety
  "safe.noAutoSend": "No auto-send", "safe.noMassSend": "No mass-send", "safe.noBackgroundSend": "No background-send", "safe.noRetryNoConfirm": "No retry without confirmation", "safe.noSendNoApproval": "No send without approval", "safe.noSendNoWhitelist": "No send without whitelist", "safe.secretsHidden": "Secrets hidden", "safe.credExportOff": "Credentials export disabled", "safe.manualOnlyMode": "Manual only mode",
  // telegram warning
  "warn.tgNotReady": "Telegram Runtime is not ready (503 / NOT READY). Live-run is forbidden.",
  // AI Command Center
  "acc.subtitle": "Workspace Engine v1.2 - local - Cmd/Ctrl+K", "acc.close": "Close",
  "acc.tab.dashboard": "Dashboard", "acc.tab.workspace": "Workspace", "acc.tab.operator": "AI Operator", "acc.tab.studio": "Prompt Studio", "acc.tab.memory": "Memory", "acc.tab.artifacts": "Artifacts", "acc.tab.epicgram": "EPIC GRAM", "acc.tab.mcp": "MCP"
};

const ru: Dict = {
  "lang.label": "Язык",
  "sb.title": "AI-ОПЕРАТОР", "sb.currentScreen": "ТЕКУЩИЙ ЭКРАН", "sb.nextAction": "СЛЕДУЮЩЕЕ ДЕЙСТВИЕ", "sb.gateInspector": "GATE-ИНСПЕКТОР", "sb.quickActions": "БЫСТРЫЕ ДЕЙСТВИЯ", "sb.terminalCommands": "КОМАНДЫ ТЕРМИНАЛА", "sb.safetyInspector": "ИНСПЕКТОР БЕЗОПАСНОСТИ", "sb.chat": "ОПЕРАТОРСКИЙ ЧАТ (локальный)",
  "sb.route": "маршрут", "sb.section": "секция", "sb.agent": "агент", "sb.account": "аккаунт", "sb.target": "цель", "sb.readiness": "готовность", "sb.localModel": "локальная модель", "sb.telegram": "Telegram",
  "sb.blocker": "Блокер", "sb.copyAction": "Копировать действие", "sb.copyClaude": "Скопировать промт для Claude", "sb.copyState": "Скопировать состояние", "sb.copy": "Копировать",
  "sb.explainScreen": "Объяснить этот экран", "sb.showBlockers": "Показать блокеры", "sb.intro": "Я вижу текущий экран и могу подсказать следующий безопасный шаг. Я ничего не отправляю сам, только объясняю, что нажать дальше.",
  "sb.you": "Вы", "sb.ai": "AI", "sb.advisory": "Только подсказки - UI ничего не отправляет - секреты скрыты - MANUAL_ONLY.",
  "sb.open": "Открыть", "sb.collapse": "Свернуть",
  "q.whatBlocked": "Что заблокировано?", "q.whatNext": "Что нажать дальше?", "q.summary": "Сводка состояния", "q.runbook": "Чеклист runbook",
  "nav.openLivePrep": "Открыть подготовку Live", "nav.openDryRun": "Открыть E2E тестовый прогон", "nav.openPostLive": "Открыть Post-Live", "nav.openAccounts": "Открыть аккаунты", "nav.openTargets": "Открыть цели", "nav.openRunbook": "Открыть E2E-сценарий",
  "section.command": "Командный центр", "section.operator": "AI-оператор", "section.livepilot": "Live-пилот", "section.livewizard": "Live-мастер", "section.runbook": "E2E-сценарий", "section.dryrun": "Тестовый прогон", "section.postlive": "После Live", "section.liveprep": "Подготовка Live", "section.targets": "Цели", "section.ownedaccounts": "Аккаунты", "section.opanalytics": "Аналитика оператора", "section.workspace": "Рабочая зона агента", "section.content": "Контент-завод", "section.media": "Медиазавод", "section.canvas": "Холст оператора", "section.channelcenter": "Центр каналов", "section.activity": "Поток активности", "section.matrix": "Матрица готовности", "section.world": "World Graph 2.0", "section.map": "Live-карта экосистемы", "section.autonomy": "Готовность автономии",
  "gate.build": "Сборка", "gate.localModel": "Локальная модель", "gate.account": "Аккаунт", "gate.target": "Цель", "gate.binding": "Привязка", "gate.runbook": "Сценарий", "gate.preflight": "Предпроверка", "gate.manualConfirmation": "Ручное подтверждение", "gate.telegramRuntime": "Telegram Runtime",
  "st.passed": "пройдено", "st.blocked": "заблокировано", "st.warning": "предупреждение", "st.unknown": "неизвестно", "st.ready": "готово", "st.failed": "ошибка", "st.pending": "ожидает", "st.idle": "бездействует", "st.active": "активно", "st.notReady": "не готово", "st.almostReady": "почти готово", "st.manualOnly": "только вручную", "st.oneMessageOnly": "только одно сообщение",
  "safe.noAutoSend": "Автоотправка запрещена", "safe.noMassSend": "Массовая отправка запрещена", "safe.noBackgroundSend": "Фоновая отправка запрещена", "safe.noRetryNoConfirm": "Повтор без подтверждения запрещён", "safe.noSendNoApproval": "Отправка без approve запрещена", "safe.noSendNoWhitelist": "Отправка без whitelist запрещена", "safe.secretsHidden": "Секреты скрыты", "safe.credExportOff": "Экспорт доступов отключён", "safe.manualOnlyMode": "Режим только ручного управления",
  "warn.tgNotReady": "Telegram Runtime не готов (503 / NOT READY). Live-прогон запрещён.",
  "acc.subtitle": "Workspace Engine v1.2 - локально - Cmd/Ctrl+K", "acc.close": "Закрыть",
  "acc.tab.dashboard": "Дашборд", "acc.tab.workspace": "Рабочая область", "acc.tab.operator": "AI Оператор", "acc.tab.studio": "Студия промптов", "acc.tab.memory": "Память", "acc.tab.artifacts": "Артефакты", "acc.tab.epicgram": "EPIC GRAM", "acc.tab.mcp": "MCP"
};

const ua: Dict = {
  "lang.label": "Мова",
  "sb.title": "AI-ОПЕРАТОР", "sb.currentScreen": "ПОТОЧНИЙ ЕКРАН", "sb.nextAction": "НАСТУПНА ДІЯ", "sb.gateInspector": "GATE-ІНСПЕКТОР", "sb.quickActions": "ШВИДКІ ДІЇ", "sb.terminalCommands": "КОМАНДИ ТЕРМІНАЛА", "sb.safetyInspector": "ІНСПЕКТОР БЕЗПЕКИ", "sb.chat": "ОПЕРАТОРСЬКИЙ ЧАТ (локальний)",
  "sb.route": "маршрут", "sb.section": "секція", "sb.agent": "агент", "sb.account": "акаунт", "sb.target": "ціль", "sb.readiness": "готовність", "sb.localModel": "локальна модель", "sb.telegram": "Telegram",
  "sb.blocker": "Блокер", "sb.copyAction": "Скопіювати дію", "sb.copyClaude": "Скопіювати промт для Claude", "sb.copyState": "Скопіювати стан", "sb.copy": "Копіювати",
  "sb.explainScreen": "Пояснити цей екран", "sb.showBlockers": "Показати блокери", "sb.intro": "Я бачу поточний екран і можу підказати наступний безпечний крок. Я нічого не надсилаю сам, лише пояснюю, що натиснути далі.",
  "sb.you": "Ви", "sb.ai": "AI", "sb.advisory": "Лише підказки - UI нічого не надсилає - секрети приховані - MANUAL_ONLY.",
  "sb.open": "Відкрити", "sb.collapse": "Згорнути",
  "q.whatBlocked": "Що заблоковано?", "q.whatNext": "Що натиснути далі?", "q.summary": "Зведення стану", "q.runbook": "Чеклист runbook",
  "nav.openLivePrep": "Відкрити підготовку Live", "nav.openDryRun": "Відкрити E2E тестовий прогін", "nav.openPostLive": "Відкрити Post-Live", "nav.openAccounts": "Відкрити акаунти", "nav.openTargets": "Відкрити цілі", "nav.openRunbook": "Відкрити E2E-сценарій",
  "section.command": "Командний центр", "section.operator": "AI-оператор", "section.livepilot": "Live-пілот", "section.livewizard": "Live-майстер", "section.runbook": "E2E-сценарій", "section.dryrun": "Тестовий прогін", "section.postlive": "Після Live", "section.liveprep": "Підготовка Live", "section.targets": "Цілі", "section.ownedaccounts": "Акаунти", "section.opanalytics": "Аналітика оператора", "section.workspace": "Робоча зона агента", "section.content": "Контент-завод", "section.media": "Медіазавод", "section.canvas": "Полотно оператора", "section.channelcenter": "Центр каналів", "section.activity": "Потік активності", "section.matrix": "Матриця готовності", "section.world": "World Graph 2.0", "section.map": "Live-карта екосистеми", "section.autonomy": "Готовність автономії",
  "gate.build": "Збірка", "gate.localModel": "Локальна модель", "gate.account": "Акаунт", "gate.target": "Ціль", "gate.binding": "Прив'язка", "gate.runbook": "Сценарій", "gate.preflight": "Передперевірка", "gate.manualConfirmation": "Ручне підтвердження", "gate.telegramRuntime": "Telegram Runtime",
  "st.passed": "пройдено", "st.blocked": "заблоковано", "st.warning": "попередження", "st.unknown": "невідомо", "st.ready": "готово", "st.failed": "помилка", "st.pending": "очікує", "st.idle": "бездіє", "st.active": "активно", "st.notReady": "не готово", "st.almostReady": "майже готово", "st.manualOnly": "тільки вручну", "st.oneMessageOnly": "тільки одне повідомлення",
  "safe.noAutoSend": "Автовідправлення заборонено", "safe.noMassSend": "Масова відправка заборонена", "safe.noBackgroundSend": "Фонова відправка заборонена", "safe.noRetryNoConfirm": "Повтор без підтвердження заборонено", "safe.noSendNoApproval": "Відправка без approve заборонена", "safe.noSendNoWhitelist": "Відправка без whitelist заборонена", "safe.secretsHidden": "Секрети приховані", "safe.credExportOff": "Експорт доступів вимкнено", "safe.manualOnlyMode": "Режим тільки ручного керування",
  "warn.tgNotReady": "Telegram Runtime не готовий (503 / NOT READY). Live-прогін заборонено.",
  "acc.subtitle": "Workspace Engine v1.2 - локально - Cmd/Ctrl+K", "acc.close": "Закрити",
  "acc.tab.dashboard": "Дашборд", "acc.tab.workspace": "Робоча область", "acc.tab.operator": "AI Оператор", "acc.tab.studio": "Студія промптів", "acc.tab.memory": "Памʼять", "acc.tab.artifacts": "Артефакти", "acc.tab.epicgram": "EPIC GRAM", "acc.tab.mcp": "MCP"
};

const translations: Record<Locale, Dict> = { ru, en, ua };

export function getCurrentLocale(): Locale {
  try { const v = JSON.parse(localStorage.getItem(I18N_KEY) || "null"); const l = v && v.language; return (l === "en" || l === "ua") ? l : "ru"; } catch { return "ru"; }
}

export function setCurrentLocale(locale: Locale): void {
  try { localStorage.setItem(I18N_KEY, JSON.stringify({ language: locale, lastChangedAt: new Date().toISOString(), safety: I18N_SAFETY })); window.dispatchEvent(new CustomEvent("deepinside:locale", { detail: locale })); } catch {}
}

// t(key, locale, fallback): locale -> EN fallback -> explicit fallback -> key
export function t(key: string, locale: Locale, fallback?: string): string {
  const d = translations[locale] || translations.ru;
  if (d[key] != null) return d[key];
  if (en[key] != null) return en[key];
  return fallback != null ? fallback : key;
}

export function useLocale(): Locale {
  const [loc, setLoc] = useState<Locale>("ru");
  useEffect(() => {
    setLoc(getCurrentLocale());
    const on = (e: any) => setLoc((e && e.detail) || getCurrentLocale());
    window.addEventListener("deepinside:locale", on);
    return () => window.removeEventListener("deepinside:locale", on);
  }, []);
  return loc;
}

// Operator natural-language command intent parser.
// UI-assist only: turns typed RU/UA/EN operator commands into structured intents that the
// GlobalAIOperatorSidebar can either answer locally (help/status/context) or forward to the
// Telegram workspace as a UI navigation action (open chat list / private filter / open by name).
// Does NOT send messages, does NOT touch TDLib sessions, does NOT change approval-card or send logic.

export type OperatorIntent =
  | { kind: "help" }
  | { kind: "show_send_status" }
  | { kind: "show_chat_context" }
  | { kind: "open_current_chat" }
  | { kind: "open_private_chats" }
  | { kind: "open_chat_list" }
  | { kind: "open_chat_by_name"; query: string }
  | { kind: "clarify_chat_name" }
  | { kind: "unknown" };

// UI-actionable intents that must be dispatched to the Telegram workspace to be performed.
export const UI_ACTION_INTENTS: OperatorIntent["kind"][] = [
  "open_current_chat",
  "open_private_chats",
  "open_chat_list",
  "open_chat_by_name",
  "show_chat_context",
];

// Trailing filler words that can get swallowed by the greedy "open chat <name>" capture group
// (e.g. "открой чат NOVIKOVA пожалуйста" or "open chat NOVIKOVA please").
const TRAILING_FILLERS = [
  "пожалуйста", "будь ласка", "please", "сейчас", "зараз", "срочно", "спасибо", "дякую", "спс",
];

function stripTrailingFillers(name: string): string {
  let out = name.trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const filler of TRAILING_FILLERS) {
      const re = new RegExp("(^|\\s)" + filler + "$", "i");
      if (re.test(out)) { out = out.replace(re, "").trim(); changed = true; }
    }
  }
  return out;
}

function normalize(raw: string): string {
  return raw
    .replace(/[«»"'`.,!?;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

const HELP_WORDS = ["помощь", "поможи", "допомога", "довідка", "команды", "команди", "что ты умеешь", "що ти вмієш", "help", "commands", "available commands"];

const SEND_STATUS_WORDS = ["статус отправки", "статус відправки", "send status", "статус send", "отправка статус", "статус рассылки", "статус розсилки", "статус отправление"];

const CONTEXT_WORDS = ["контекст чата", "контекст чату", "chat context", "покажи контекст", "контекст переписки"];

const CURRENT_CHAT_WORDS = ["текущий чат", "поточний чат", "теперішній чат", "open current chat", "открой текущий чат", "відкрий поточний чат", "нынешний чат"];

// Stems cover Russian/Ukrainian case declensions (личка/личку/личкой, особисті/особисту...).
const PRIVATE_STEMS = ["личн", "личк", "особист", "приватн", "private message", "direct message"];

const CHAT_LIST_WORDS = [
  "список чатов", "список чатів", "все чаты", "усі чати", "все диалоги", "всі діалоги",
  "покажи диалоги", "покажи чаты", "открой диалоги", "открой чаты", "открой список чатов",
  "відкрий діалоги", "відкрий чати", "відкрий список чатів", "chat list", "dialogs list",
  "open dialogs", "open chats",
];

const OPEN_CHAT_PATTERNS = [
  /^(?:зайди|открой|відкрий|перейди|покажи|найди|открыть|найти|знайди)\s+(?:в\s+)?(?:чат|диалог|розмову)?\s*[:\-]?\s*(.+)$/i,
  /^open\s+chat\s+(.+)$/i,
];

const GENERIC_CHAT_WORDS = new Set([
  "чат", "чаты", "диалог", "диалоги", "розмову", "розмова", "лс", "личку", "личка",
  "личные сообщения", "особисті повідомлення", "chat", "chats", "dialogs",
]);

const BARE_OPEN_CHAT = /^(?:открой|відкрий|open)\s+(?:чат|диалог|chat)$/i;

export function parseOperatorIntent(raw: string): OperatorIntent {
  const cleaned = normalize(raw);
  if (!cleaned) return { kind: "unknown" };
  const s = cleaned.toLowerCase();
  const padded = " " + s + " ";

  if (hasAny(s, HELP_WORDS)) return { kind: "help" };
  if (hasAny(s, SEND_STATUS_WORDS)) return { kind: "show_send_status" };
  if (hasAny(s, CONTEXT_WORDS)) return { kind: "show_chat_context" };
  if (hasAny(s, CURRENT_CHAT_WORDS)) return { kind: "open_current_chat" };
  if (hasAny(s, PRIVATE_STEMS) || padded.includes(" лс ") || padded.includes(" dm ") || padded.includes(" дм ")) {
    return { kind: "open_private_chats" };
  }
  if (hasAny(s, CHAT_LIST_WORDS)) return { kind: "open_chat_list" };
  if (BARE_OPEN_CHAT.test(s)) return { kind: "clarify_chat_name" };

  for (const re of OPEN_CHAT_PATTERNS) {
    const m = cleaned.match(re);
    if (m && m[1] != null) {
      const name = m[1].trim();
      const trimmed = stripTrailingFillers(name);
      if (!trimmed) return { kind: "clarify_chat_name" };
      if (GENERIC_CHAT_WORDS.has(trimmed.toLowerCase())) return { kind: "clarify_chat_name" };
      return { kind: "open_chat_by_name", query: trimmed };
    }
  }

  return { kind: "unknown" };
}

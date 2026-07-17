// telegramBindings.ts — P0 Per-User Telegram Binding Model
// Types + auth state machine constants. No side effects.

export type TelegramBindingAuthState =
  | "init"
  | "waiting_qr"
  | "waiting_code"
  | "waiting_password"
  | "ready"
  | "closed"
  | "error";

export interface TelegramBinding {
  id: string;
  workspaceId: string;
  userId: string;
  tdlibAccountId: string;  // maps to TDLib session dir under $EPICGRAM_TDLIB_ROOT/accounts/
  displayName: string;
  phoneMasked: string | null;
  username: string | null;
  authState: TelegramBindingAuthState;
  authError: string | null;
  boundAt: string;
  updatedAt: string;
}

export interface TelegramAuthFlow {
  type: "qr" | "phone";
  qrLink: string | null;
  qrImageData: string | null;  // base64 PNG
  expiresAt: string | null;
  phoneMasked: string | null;
  codeLength: number | null;
  message: string;
}

export interface BindingStatus {
  bound: boolean;
  binding: TelegramBinding | null;
  authFlow: TelegramAuthFlow | null;
  canSend: false;
}

// Auth state machine
export type TelegramAuthAction =
  | { type: "QR_START" }
  | { type: "QR_CONFIRMED" }
  | { type: "PHONE_SUBMITTED"; phone: string }
  | { type: "CODE_SUBMITTED"; code: string }
  | { type: "PASSWORD_SUBMITTED"; password: string }
  | { type: "AUTH_ERROR"; error: string }
  | { type: "RESET" }
  | { type: "CLOSE" };

export function nextAuthState(
  current: TelegramBindingAuthState,
  action: TelegramAuthAction
): TelegramBindingAuthState {
  switch (action.type) {
    case "QR_START":        return "waiting_qr";
    case "QR_CONFIRMED":    return "ready";
    case "PHONE_SUBMITTED": return "waiting_code";
    case "CODE_SUBMITTED":  return "waiting_password";  // 2FA needed
    case "PASSWORD_SUBMITTED": return "ready";
    case "AUTH_ERROR":      return "error";
    case "RESET":          return "init";
    case "CLOSE":          return "closed";
    default:                return current;
  }
}

export function authStateLabel(state: TelegramBindingAuthState): string {
  switch (state) {
    case "init":             return "Не подключён";
    case "waiting_qr":       return "QR-код активен";
    case "waiting_code":     return "Введите код из Telegram";
    case "waiting_password": return "Введите пароль 2FA";
    case "ready":            return "Подключён";
    case "closed":           return "Отключён";
    case "error":            return "Ошибка авторизации";
  }
}

export function authFlowMessage(
  state: TelegramBindingAuthState,
  phoneMasked: string | null
): string {
  switch (state) {
    case "waiting_qr":       return "Сканируйте QR-код в приложении Telegram";
    case "waiting_code":     return phoneMasked
      ? `Введите код, отправленный на ${phoneMasked}`
      : "Введите код из Telegram";
    case "waiting_password": return "Введите пароль двухфакторной авторизации";
    case "error":           return "Произошла ошибка. Попробуйте снова.";
    default:                return "";
  }
}

// NOVIKOVA guard: never let NOVIKOVA's slot leak into per-user bindings
export const FORBIDDEN_ACCOUNT_IDS = new Set(["main", "7369372055", "novikova"]);

export function isForbiddenAccountId(id: string): boolean {
  return FORBIDDEN_ACCOUNT_IDS.has(String(id).toLowerCase());
}

export function safeTdlibAccountId(raw: string): string {
  const s = String(raw || "").trim().toLowerCase();
  // Block forbidden identifiers
  if (isForbiddenAccountId(s)) return "";
  // Only allow alphanumeric + underscore + hyphen, max 60 chars
  const cleaned = s.replace(/[^a-z0-9_\-]/g, "").slice(0, 60);
  return cleaned || "";
}

export function newBindingId(): string {
  return `tb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function newTdlibAccountId(): string {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function maskPhone(phone: string): string {
  const clean = phone.replace(/[^\d]/g, "");
  if (clean.length <= 5) return clean + "***";
  return clean.slice(0, 4) + "***" + clean.slice(-2);
}

export function isValidPhone(phone: string): boolean {
  // E.164-ish: starts with +, 7-15 digits after
  return /^\+[1-9]\d{7,14}$/.test(phone.replace(/\s|-/g, ""));
}

export function isValidCode(code: string): boolean {
  return /^\d{3,8}$/.test(code.trim());
}

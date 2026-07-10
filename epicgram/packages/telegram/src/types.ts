export type TelegramAuthMethod = "qr" | "phone";

export type TelegramRuntimeStatus = "not_configured" | "starting" | "waiting_auth" | "ready" | "error";

export type TelegramAccountSummary = {
  id: string;
  displayName: string;
  username?: string;
  phoneMasked?: string;
  status: "online" | "offline" | "syncing";
  sessionCreatedAt: string;
  consentGrantedAt: string;
};

export type TelegramAuthStatusResponse = {
  runtime: TelegramRuntimeStatus;
  accounts: TelegramAccountSummary[];
  message: string;
};

export type TelegramQrAuthResponse = {
  method: "qr";
  runtime: TelegramRuntimeStatus;
  qrLink?: string;
  expiresAt?: string;
  message: string;
};

export type TelegramPhoneAuthRequest = {
  phoneNumber: string;
};

export type TelegramPhoneAuthResponse = {
  method: "phone";
  runtime: TelegramRuntimeStatus;
  phoneMasked?: string;
  message: string;
};

export type TelegramCodeAuthRequest = {
  phoneNumber: string;
  code: string;
  password?: string;
};

export type TelegramLogoutRequest = {
  accountId: string;
};

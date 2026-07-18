import { getStatus, getChats, getMessages } from "../telegram-runtime.mjs";
import { RISK_LEVELS } from "./tool-registry.mjs";

function requireChatId(input) {
  const chatId = input?.chatId ?? input?.id;
  if (chatId == null || chatId === "") throw new TypeError("chatId is required");
  return chatId;
}

export function registerTelegramReadTools(registry) {
  registry.register({
    name: "telegram.get_status",
    title: "Проверить состояние Telegram",
    description: "Возвращает текущее состояние TDLib и авторизованного аккаунта без изменений.",
    risk: RISK_LEVELS.READ,
    capability: "telegram.read.status",
    inputSchema: { type: "object", additionalProperties: false },
    execute: async () => getStatus()
  });

  registry.register({
    name: "telegram.list_chats",
    title: "Получить список чатов",
    description: "Возвращает доступные авторизованному аккаунту чаты без отправки сообщений.",
    risk: RISK_LEVELS.READ,
    capability: "telegram.read.chats",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 200 },
        accountId: { type: ["string", "number"] }
      },
      additionalProperties: false
    },
    execute: async (input = {}) => getChats(input)
  });

  registry.register({
    name: "telegram.get_messages",
    title: "Прочитать сообщения чата",
    description: "Возвращает историю выбранного чата без каких-либо изменений.",
    risk: RISK_LEVELS.READ,
    capability: "telegram.read.messages",
    inputSchema: {
      type: "object",
      required: ["chatId"],
      properties: {
        chatId: { type: ["string", "number"] },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        fromMessageId: { type: ["string", "number"] }
      },
      additionalProperties: false
    },
    execute: async (input = {}) => getMessages(requireChatId(input), input)
  });

  return registry;
}

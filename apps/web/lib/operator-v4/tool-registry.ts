import type { EpicToolDefinition } from "./types";

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});

export const OPERATOR_V4_TOOLS: readonly EpicToolDefinition[] = [
  {
    name: "telegram.list_chats",
    version: "1.0.0",
    description: "Read the most recent Telegram chats for an authorized TDLib account.",
    actionClass: "read",
    riskLevel: "low",
    supportsDryRun: true,
    supportsRollback: false,
    timeoutMs: 15_000,
    inputSchema: objectSchema(
      {
        accountId: { type: "string", minLength: 1 },
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      },
      ["accountId"],
    ),
    outputSchema: objectSchema({
      chats: {
        type: "array",
        items: objectSchema({
          id: { type: ["string", "number"] },
          title: { type: "string" },
          type: { type: "string" },
        }),
      },
    }),
  },
  {
    name: "telegram.publish_post",
    version: "1.0.0",
    description: "Publish a frozen text post to an allowlisted Telegram target through TDLib.",
    actionClass: "publish",
    riskLevel: "high",
    supportsDryRun: true,
    supportsRollback: true,
    timeoutMs: 30_000,
    inputSchema: objectSchema(
      {
        accountId: { type: "string", minLength: 1 },
        chatId: { type: ["string", "number"] },
        text: { type: "string", minLength: 1, maxLength: 4096 },
        disableNotification: { type: "boolean", default: false },
      },
      ["accountId", "chatId", "text"],
    ),
    outputSchema: objectSchema({
      messageId: { type: ["string", "number"] },
      chatId: { type: ["string", "number"] },
      verified: { type: "boolean" },
    }),
  },
] as const;

export function getOperatorV4Tool(name: string): EpicToolDefinition | undefined {
  return OPERATOR_V4_TOOLS.find((tool) => tool.name === name);
}

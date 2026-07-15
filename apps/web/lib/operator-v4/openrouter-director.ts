import { OPERATOR_V4_TOOLS } from "./tool-registry";
import type { AutonomyMode } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterDirectorInput {
  message: string;
  autonomyMode: AutonomyMode;
  agentId: string;
}

export interface OpenRouterDirectorPlan {
  summary: string;
  toolName: string;
  arguments: Record<string, unknown>;
  rationale?: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
}

function getToolSchemas() {
  return OPERATOR_V4_TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function planWithOpenRouter(
  input: OpenRouterDirectorInput,
): Promise<OpenRouterDirectorPlan | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_DIRECTOR_MODEL ?? "anthropic/claude-sonnet-4";
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "http-referer": process.env.OPENROUTER_SITE_URL ?? "https://epic-gram.com",
      "x-title": "EPIC AI OS v4 Director",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      tool_choice: "auto",
      tools: getToolSchemas(),
      messages: [
        {
          role: "system",
          content: [
            "You are the EPIC AI OS v4 Director planner.",
            "Select only registered tools.",
            "Never invent shell commands, URLs, credentials, targets, or account identifiers.",
            "P-A permits telegram.list_chats only. Publishing and destructive actions must not be selected.",
            `Autonomy mode: ${input.autonomyMode}. Agent: ${input.agentId}.`,
          ].join("\n"),
        },
        { role: "user", content: input.message },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`openrouter_http_${response.status}`);
  }

  const body = (await response.json()) as OpenRouterResponse;
  const message = body.choices?.[0]?.message;
  const call = message?.tool_calls?.[0]?.function;
  if (!call?.name || call.name !== "telegram.list_chats") return null;

  let args: Record<string, unknown> = {};
  if (call.arguments) {
    try {
      const parsed = JSON.parse(call.arguments) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        args = parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return {
    summary: message?.content?.trim() || "Получить последние Telegram-чаты через TDLib.",
    toolName: call.name,
    arguments: args,
  };
}

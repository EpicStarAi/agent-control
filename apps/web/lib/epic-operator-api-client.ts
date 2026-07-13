// EPIC💀GRAM API Client — QClaw → EPICGRAM tool executor
// All calls go through the typed tool contract

export interface ToolExecutionRequest {
  tool: string;
  input: Record<string, unknown>;
  task_id: string;
}

export interface ToolExecutionResponse {
  ok: boolean;
  task_id: string;
  tool: string;
  result?: unknown;
  error?: string;
  policy_blocked?: boolean;
  stage: string;
}

export async function executeTool(req: ToolExecutionRequest): Promise<ToolExecutionResponse> {
  const res = await fetch('/api/operator/tools/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return res.json() as Promise<ToolExecutionResponse>;
}

// Task creation
export async function createTask(
  intent: string,
  opts?: { account_slot?: string; allowed_tools?: string[] }
): Promise<{ ok: boolean; task: { task_id: string } }> {
  const res = await fetch('/api/operator/qclaw/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ intent, account_slot: opts?.account_slot || 'NOVIKOVA', allowed_tools: opts?.allowed_tools }),
  });
  return res.json() as Promise<{ ok: boolean; task: { task_id: string } }>;
}

// Task status
export async function getTask(taskId: string): Promise<{ ok: boolean; task: unknown }> {
  const res = await fetch(`/api/operator/qclaw/tasks/${taskId}`);
  return res.json() as Promise<{ ok: boolean; task: unknown }>;
}

// Get allowed channels
export async function getAllowedChannels(): Promise<{
  ok: boolean;
  channels: Array<{ chat_id: string; title: string; username?: string; status: string }>;
}> {
  const res = await fetch('/api/operator/publish/channels');
  return res.json() as Promise<{
    ok: boolean;
    channels: Array<{ chat_id: string; title: string; username?: string; status: string }>;
  }>;
}

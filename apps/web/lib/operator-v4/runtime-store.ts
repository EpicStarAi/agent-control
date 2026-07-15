import type { ApprovalSnapshot, ToolExecutionRequest } from "./types";

interface RuntimeRecord {
  request: ToolExecutionRequest;
  approval: ApprovalSnapshot | null;
  updatedAt: string;
}

const records = new Map<string, RuntimeRecord>();
const MAX_RECORDS = 500;

function trimStore() {
  if (records.size <= MAX_RECORDS) return;
  const oldest = Array.from(records.entries())
    .sort(([, left], [, right]) => left.updatedAt.localeCompare(right.updatedAt))
    .slice(0, records.size - MAX_RECORDS);
  for (const [id] of oldest) records.delete(id);
}

export function saveRuntimeRecord(
  request: ToolExecutionRequest,
  approval: ApprovalSnapshot | null,
): RuntimeRecord {
  const record: RuntimeRecord = {
    request: structuredClone(request),
    approval: approval ? structuredClone(approval) : null,
    updatedAt: new Date().toISOString(),
  };
  records.set(request.id, record);
  trimStore();
  return structuredClone(record);
}

export function getRuntimeRecord(requestId: string): RuntimeRecord | null {
  const record = records.get(requestId);
  return record ? structuredClone(record) : null;
}

export function updateRuntimeRecord(
  requestId: string,
  patch: Partial<Pick<RuntimeRecord, "request" | "approval">>,
): RuntimeRecord | null {
  const current = records.get(requestId);
  if (!current) return null;

  const next: RuntimeRecord = {
    request: patch.request ? structuredClone(patch.request) : current.request,
    approval:
      patch.approval === undefined
        ? current.approval
        : patch.approval
          ? structuredClone(patch.approval)
          : null,
    updatedAt: new Date().toISOString(),
  };

  records.set(requestId, next);
  return structuredClone(next);
}

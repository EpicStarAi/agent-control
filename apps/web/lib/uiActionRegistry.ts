export type UiActionName =
  | "ui.open_chat"
  | "ui.select_account"
  | "ui.open_settings"
  | "ui.open_operator"
  | "ui.minimize_operator"
  | "ui.maximize_operator"
  | "ui.resize_operator"
  | "ui.focus_chat_search"
  | "ui.highlight_element"
  | "ui.focus_composer"
  | "ui.insert_draft"
  | "ui.show_operator_reply"
  | "ui.show_approval"
  | "ui.show_task_progress"
  | "ui.open_scheduler"
  | "ui.open_audit_log";

export type VisualTarget =
  | "chat-search"
  | "chat-list"
  | `chat-row:${string}`
  | "message-list"
  | "composer"
  | "send-button"
  | "approval-card"
  | "scheduler-button"
  | "operator-window"
  | "settings-button";

export type UiActionDefinition = {
  name: UiActionName;
  inputSchema: Record<string, string>;
  allowedPages: string[];
  allowedTargets: readonly string[];
  timeoutMs: number;
  precondition: string;
  successCondition: string;
  failureCondition: string;
  visualTarget: VisualTarget;
  auditEvent: string;
};

export type AgentStepStatus = "PENDING" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";

export type AgentVisualStep = {
  stepId: string;
  tool: string;
  status: AgentStepStatus;
  uiAction: UiActionName;
  visualTarget: VisualTarget;
  message: string;
  expectedResult: string;
  actualResult?: string | null;
  startedAt: string;
  completedAt: string | null;
};

const TARGETS = [
  "chat-search",
  "chat-list",
  "chat-row:*",
  "message-list",
  "composer",
  "send-button",
  "approval-card",
  "scheduler-button",
  "operator-window",
  "settings-button",
] as const;

export const UI_ACTION_REGISTRY: Record<UiActionName, UiActionDefinition> = {
  "ui.open_chat": {
    name: "ui.open_chat",
    inputSchema: { chatId: "string" },
    allowedPages: ["/client", "/chats"],
    allowedTargets: ["chat-row:*"],
    timeoutMs: 8000,
    precondition: "Authenticated user sees a chat row for chatId.",
    successCondition: "Selected chatId is active and message list is visible.",
    failureCondition: "Target row is missing or message list does not update.",
    visualTarget: "chat-row:*" as VisualTarget,
    auditEvent: "ui.open_chat",
  },
  "ui.select_account": {
    name: "ui.select_account",
    inputSchema: { accountId: "string" },
    allowedPages: ["/client", "/accounts", "/settings"],
    allowedTargets: ["operator-window"],
    timeoutMs: 5000,
    precondition: "Account belongs to current authenticated context.",
    successCondition: "Account is active in the rail/status.",
    failureCondition: "Account cannot be selected.",
    visualTarget: "operator-window",
    auditEvent: "ui.select_account",
  },
  "ui.open_settings": {
    name: "ui.open_settings",
    inputSchema: {},
    allowedPages: ["/client", "/settings"],
    allowedTargets: ["settings-button"],
    timeoutMs: 4000,
    precondition: "Settings navigation is available.",
    successCondition: "Settings view is visible.",
    failureCondition: "Navigation did not complete.",
    visualTarget: "settings-button",
    auditEvent: "ui.open_settings",
  },
  "ui.open_operator": {
    name: "ui.open_operator",
    inputSchema: {},
    allowedPages: ["*"],
    allowedTargets: ["operator-window"],
    timeoutMs: 3000,
    precondition: "Operator window state can be changed.",
    successCondition: "Operator window or button is visible.",
    failureCondition: "Operator surface is unavailable.",
    visualTarget: "operator-window",
    auditEvent: "ui.open_operator",
  },
  "ui.minimize_operator": {
    name: "ui.minimize_operator",
    inputSchema: {},
    allowedPages: ["*"],
    allowedTargets: ["operator-window"],
    timeoutMs: 3000,
    precondition: "Operator window is open.",
    successCondition: "Operator button remains visible and run continues.",
    failureCondition: "Window state was not persisted.",
    visualTarget: "operator-window",
    auditEvent: "ui.minimize_operator",
  },
  "ui.maximize_operator": {
    name: "ui.maximize_operator",
    inputSchema: {},
    allowedPages: ["*"],
    allowedTargets: ["operator-window"],
    timeoutMs: 3000,
    precondition: "Operator window is open.",
    successCondition: "Operator window fills the viewport constraints.",
    failureCondition: "Window did not resize.",
    visualTarget: "operator-window",
    auditEvent: "ui.maximize_operator",
  },
  "ui.resize_operator": {
    name: "ui.resize_operator",
    inputSchema: { width: "number", height: "number" },
    allowedPages: ["*"],
    allowedTargets: ["operator-window"],
    timeoutMs: 3000,
    precondition: "Resize handle is available.",
    successCondition: "Geometry respects min/max constraints.",
    failureCondition: "Geometry is out of bounds.",
    visualTarget: "operator-window",
    auditEvent: "ui.resize_operator",
  },
  "ui.focus_chat_search": {
    name: "ui.focus_chat_search",
    inputSchema: { query: "string?" },
    allowedPages: ["/client", "/chats"],
    allowedTargets: ["chat-search"],
    timeoutMs: 3000,
    precondition: "Chat search input exists.",
    successCondition: "Search input is focused.",
    failureCondition: "Search target is missing.",
    visualTarget: "chat-search",
    auditEvent: "ui.focus_chat_search",
  },
  "ui.highlight_element": {
    name: "ui.highlight_element",
    inputSchema: { target: "VisualTarget" },
    allowedPages: ["*"],
    allowedTargets: TARGETS,
    timeoutMs: 3000,
    precondition: "Semantic target exists in DOM.",
    successCondition: "Highlight is shown over target.",
    failureCondition: "Target missing.",
    visualTarget: "operator-window",
    auditEvent: "ui.highlight_element",
  },
  "ui.focus_composer": {
    name: "ui.focus_composer",
    inputSchema: {},
    allowedPages: ["/client", "/chats"],
    allowedTargets: ["composer"],
    timeoutMs: 3000,
    precondition: "Composer is visible for selected chat.",
    successCondition: "Composer receives focus.",
    failureCondition: "Composer is not mounted.",
    visualTarget: "composer",
    auditEvent: "ui.focus_composer",
  },
  "ui.insert_draft": {
    name: "ui.insert_draft",
    inputSchema: { text: "string" },
    allowedPages: ["/client", "/chats"],
    allowedTargets: ["composer"],
    timeoutMs: 5000,
    precondition: "Draft text is safe and composer exists.",
    successCondition: "Composer contains the draft text.",
    failureCondition: "Draft was not inserted.",
    visualTarget: "composer",
    auditEvent: "ui.insert_draft",
  },
  "ui.show_operator_reply": {
    name: "ui.show_operator_reply",
    inputSchema: { text: "string" },
    allowedPages: ["/client", "/chats"],
    allowedTargets: ["operator-window"],
    timeoutMs: 5000,
    precondition: "Operator response is available.",
    successCondition: "Response is visible in the operator dialogue.",
    failureCondition: "Operator response was not rendered.",
    visualTarget: "operator-window",
    auditEvent: "ui.show_operator_reply",
  },
  "ui.show_approval": {
    name: "ui.show_approval",
    inputSchema: { approvalId: "string?" },
    allowedPages: ["/client", "/chats"],
    allowedTargets: ["approval-card"],
    timeoutMs: 5000,
    precondition: "Pending external action exists.",
    successCondition: "Approval card is visible.",
    failureCondition: "Approval UI not shown.",
    visualTarget: "approval-card",
    auditEvent: "ui.show_approval",
  },
  "ui.show_task_progress": {
    name: "ui.show_task_progress",
    inputSchema: { stepId: "string" },
    allowedPages: ["*"],
    allowedTargets: ["operator-window"],
    timeoutMs: 3000,
    precondition: "AgentRun exists.",
    successCondition: "Step status is visible.",
    failureCondition: "Progress UI missing.",
    visualTarget: "operator-window",
    auditEvent: "ui.show_task_progress",
  },
  "ui.open_scheduler": {
    name: "ui.open_scheduler",
    inputSchema: {},
    allowedPages: ["/client", "/operator-office"],
    allowedTargets: ["scheduler-button"],
    timeoutMs: 5000,
    precondition: "Scheduler button exists.",
    successCondition: "Scheduler view opens.",
    failureCondition: "Scheduler target missing.",
    visualTarget: "scheduler-button",
    auditEvent: "ui.open_scheduler",
  },
  "ui.open_audit_log": {
    name: "ui.open_audit_log",
    inputSchema: {},
    allowedPages: ["/client", "/logs"],
    allowedTargets: ["operator-window"],
    timeoutMs: 5000,
    precondition: "Audit log route is available.",
    successCondition: "Audit log opens.",
    failureCondition: "Audit route unavailable.",
    visualTarget: "operator-window",
    auditEvent: "ui.open_audit_log",
  },
};

export function visualTargetToDomTarget(target: VisualTarget): string {
  return target;
}

export function isRegisteredUiAction(name: string): name is UiActionName {
  return Object.prototype.hasOwnProperty.call(UI_ACTION_REGISTRY, name);
}

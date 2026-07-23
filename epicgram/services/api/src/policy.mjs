// EPIC☠️GRAM — AI Operator Policy v1 (P3.5a). PURE, NON-EXECUTING.
//
// evaluatePolicy() returns a decision only. It NEVER sends, publishes,
// schedules, creates channels, or performs any side effect. Callers use the
// decision to set response flags and audit records — execution stays in the
// existing operator approval + gated /telegram/send path.

// action = { actionType, tool?, source?, autoSend? }
export function evaluatePolicy(action = {}) {
  const actionType = action.actionType || "none";
  const autoSend = action.autoSend === true;

  // Hard rule: automatic sending is never allowed.
  if (autoSend) {
    return { allow: false, reason: "auto_send_forbidden", riskLevel: "high", requiresApproval: true, blocked: true };
  }

  switch (actionType) {
    // P3.7a: real publish to the operator-selected owned chat/channel is allowed
    // ONLY through explicit operator approval (never automatic). Not hard-blocked.
    case "publish_post":
      return { allow: true, reason: "publish_post requires operator approval", riskLevel: "high", requiresApproval: true, blocked: false };

    // P3.8a: scheduled publish to the operator-selected owned chat/channel is
    // allowed ONLY through explicit operator approval + queue (never automatic).
    case "schedule_post":
      return { allow: true, reason: "schedule_post requires operator approval", riskLevel: "high", requiresApproval: true, blocked: false };

    // Write actions with no approval flow yet → blocked outright.
    case "create_channel":
      return { allow: false, reason: `${actionType}_blocked_no_approval_flow`, riskLevel: "high", requiresApproval: true, blocked: true };

    // Outbound send is permitted ONLY through explicit operator approval.
    case "telegram_send":
      return { allow: false, reason: "telegram_send requires operator approval", riskLevel: "medium", requiresApproval: true, blocked: false };

    // Read-only / draft-only tools.
    case "none":
    default:
      return { allow: true, reason: "read_or_draft_only", riskLevel: "low", requiresApproval: false, blocked: false };
  }
}

// Map a Tool Router tool id → the action type it may propose.
export function actionTypeForTool(tool) {
  if (tool === "draft_reply") return "telegram_send";
  if (tool === "prepare_post") return "publish_post";   // P3.6a: channel post → blocked
  if (tool === "propose_schedule") return "schedule_post"; // P3.6a: schedule → blocked
  return "none";
}

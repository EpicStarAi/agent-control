import { NextRequest } from "next/server";
import { proxyOperatorRequest } from "../_proxy";

// AI-Operator command. Forwards the operator chat turn to the backend, which
// classifies intent and runs read actions immediately. Outbound sends are
// returned as pending and require explicit confirmation via /operator/confirm.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyOperatorRequest("/operator/command", { method: "POST", body });
}

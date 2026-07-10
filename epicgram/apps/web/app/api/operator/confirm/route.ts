import { NextRequest } from "next/server";
import { proxyOperatorRequest } from "../_proxy";

// Confirms a pending operator action (e.g. send_message). The backend executes
// only when it receives this explicit confirmation.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyOperatorRequest("/operator/confirm", { method: "POST", body });
}

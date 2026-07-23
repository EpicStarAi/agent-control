import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/authData";
import { SESSION_COOKIE } from "@/lib/auth";

// P30 — current session from the httpOnly cookie. Read-only.
export const dynamic = "force-dynamic";

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value || "";
  const s = await getSession(token);
  return NextResponse.json(s);
}

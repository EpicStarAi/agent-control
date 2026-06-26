import { NextRequest, NextResponse } from "next/server";
import { scryptSync, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const stored = process.env.EPICGRAM_OPERATOR_PASSWORD_SCRYPT || "";
  if (!stored || stored.startsWith("replace-with")) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message:
          "Admin gate not configured. Set EPICGRAM_OPERATOR_PASSWORD_SCRYPT in .env.local (npm run operator:hash).",
      },
      { status: 503 }
    );
  }

  let password = "";
  try {
    password = ((await req.json()) as { password?: string }).password ?? "";
  } catch {

  }
  if (!password) {
    return NextResponse.json({ ok: false, message: "password required" }, { status: 400 });
  }

  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return NextResponse.json({ ok: false, message: "bad hash format" }, { status: 500 });
  }
  const [, salt, hashHex] = parts;

  try {
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(hashHex, "hex");
    const ok = derived.length === expected.length && timingSafeEqual(derived, expected);
    return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

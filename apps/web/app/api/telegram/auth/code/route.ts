import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      runtime: "not_configured",
      message: "Code verification requires a TDLib backend and encrypted session storage."
    },
    { status: 501 }
  );
}

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      runtime: "not_configured",
      message: "Logout/delete session will be available after TDLib backend integration."
    },
    { status: 501 }
  );
}
